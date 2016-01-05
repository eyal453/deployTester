'use strict';

module.exports = FakeServerConfig;

// var url = require('url');
// var jwt = require('jsonwebtoken');

function FakeServerConfig() {
}

FakeServerConfig.configureFakeServer = function (realNock) {
    var backend = new realNock({port: 3000, debug: true}),
        statusCode = {
            Ok: 200,
            Created: 201,
            NoContent: 204,
            Redirect: 301,
            BadRequest: 400,
            Unauthorized: 401,
            NotFound: 404
        },
        responseDir = __dirname + '/../fake-server/fake-server-response',
        repeatTimes = 100,
        uploadFileDelay = 250,
        chance = require('chance').Chance(),
        guidPattern = '[{]?[0-9a-fA-F]{8}[-]?([0-9a-fA-F]{4}[-]?){3}[0-9a-fA-F]{12}[}]?',
        pathFilters = []; //pattern-targetUrl

    //defaultHeaders must be a first setup!
    setupDefaultHeaders();
    setupMixins();

    configureAuthenticationApi();
    configureProfileApi();
    configurePortfolioApi();
    configureProjectsApi();
    configureCalendarApi();

    //path filtering must be the last one!
    configurePathFiltering();

    backend.start(function () {
    });

    function configureProjectsApi() {

        pathFilters['/api/market/user/' + guidPattern + '/projects/assupplier.?'] = '/api/market/user/1/projects/assupplier';
        pathFilters['/api/market/project/' + guidPattern + '/approve'] = '/api/market/project/1/approve';
        pathFilters['/api/market/project/' + guidPattern + '/decline'] = '/api/market/project/1/decline';

        backend.stub
            .intercept('/api/market/user/1/projects/assupplier', 'OPTIONS').times(repeatTimes).reply(statusCode.Ok)
            .intercept('/api/market/project/1/approve', 'OPTIONS').times(repeatTimes).reply(statusCode.Ok)
            .intercept('/api/market/project/1/decline', 'OPTIONS').times(repeatTimes).reply(statusCode.Ok)

            .get('/api/market/user/1/projects/assupplier')
            .times(repeatTimes)
            .reply(statusCode.Ok, chance.n(chance.project, 3, [1]).concat(chance.n(chance.project, 3, [3, 4])))

            .put('/api/market/project/1/approve')
            .times(repeatTimes)
            .reply(statusCode.NoContent)

            .put('/api/market/project/1/decline')
            .times(repeatTimes)
            .reply(statusCode.NoContent)
        ;
    }

    function configurePathFiltering() {

        backend.stub.filteringPath(function (path) {

            for (var pattern in pathFilters) {

                if (matchesPattern(path, pattern)) {
                    return pathFilters[pattern];
                }
            }

            return path;
        });
    }

    function configureCalendarApi() {
        backend.stub
            .get('/api/schedule')
            .times(repeatTimes)
            .replyWithFile(statusCode.Ok, responseDir + '/calendar/get-calendar.json')

            .intercept('/api/schedule', 'OPTIONS').times(repeatTimes).reply(statusCode.Ok)
            .post('/api/schedule')
            .times(repeatTimes)
            .reply(statusCode.Ok, chance.guid())
            //.reply(statusCode.Created, {
            //    id: chance.guid(),
            //    description: chance.first() + ' ' + chance.last(),
            //    startDateUtc: new Date().setDate(new Date().getDate() + 0),
            //    endDateUtc: new Date().setHours(new Date().getHours() + chance.integer({min: 1, max: 48}))
            //});
        ;
    }

    function configurePortfolioApi() {

        pathFilters['/api/portfolio/' + guidPattern + '/items'] = '/api/portfolio/1/items';
        pathFilters['/api/portfolio/undefined/items'] = '/api/portfolio/1/items';

        backend.stub
            .post('/api/portfolio/1/items')
            .times(repeatTimes)
            .delay(uploadFileDelay)
            .reply(statusCode.Created, [{
                "id": chance.guid(),
                "externalId": 'no_fakes_o3jg5d',
                "imageUrl": 'http://res.cloudinary.com/kodakbluesky/image/upload/v1447250974/no_fakes_o3jg5d.png',
                "originalName": chance.string(),
                "title": null,
                "order": null
            }])

            .intercept('/api/portfolio/1/items', 'OPTIONS').times(repeatTimes).reply(statusCode.Ok)

            .delete('/api/portfolio/1/items')
            .times(repeatTimes)
            .reply(statusCode.NoContent)

            .put('/api/portfolio/1/items')
            .times(repeatTimes)
            .reply(statusCode.NoContent);
    }

    function configureAuthenticationApi() {

        var tenant = 'testbluesky.onmicrosoft.com';

        var tokenPayload = {
            "acr": "b2c_1_sign_in",
            "aud": "9c00758d-2d3d-44b9-87a8-65c9e22b57b0",
            "auth_time": 1447944393,
            "emails": ["aleksey@email.com"],
            "exp": 2447947993,
            "iat": 1447944393,
            "iss": "https://login.microsoftonline.com/a853b804-772b-47df-bd38-36cf6128c3b4/v2.0/",
            "nbf": 1447944393,
            "nonce": "030afa23-adcc-4761-a9f8-fe361677cab0",
            "oid": "a33fbb00-b75e-437d-bd0e-58e15cba3b61",
            "sub": "Not supported currently. Use oid claim.",
            "ver": "1.0"
        };

        //workaround - allows for each login call to return regenerated token and not the same one
        for(var i = 0; i < repeatTimes; i++){
            backend.stub
                //login
                .get('/' + tenant + '/oauth2/v2.0/authorize')
                .query(true)
                .reply(statusCode.Redirect, undefined, {
                    'Location': function (req, res, body) {
                        var queryData = url.parse(req.path, true).query;
                        tokenPayload.nonce = queryData.nonce;
                        var idToken = jwt.sign(tokenPayload, 'secret');
                        var state = queryData.state;

                        var redirectUri = queryData.redirect_uri;
                        return redirectUri + '?' + 'id_token=' + idToken + '&state=' + state;
                    }
                });
        }

        backend.stub
            //logout
            .get('/' + tenant + '/oauth2/v2.0/logout')
            .query(true)
            .times(repeatTimes)
            .reply(statusCode.Redirect, undefined, {
                'Location': function (req, res, body) {
                    var queryData = url.parse(req.path, true).query;
                    var redirectUri = queryData.post_logout_redirect_uri;
                    return redirectUri;
                }
            });
    }

    function configureProfileApi() {

        pathFilters['/api/profile/' + guidPattern] = '/api/profile';
        pathFilters['/api/profile/picture/' + guidPattern] = '/api/profile/picture';

        backend.stub
            .get('/api/accounts')
            .times(repeatTimes)
            .reply(statusCode.Ok, [])

            .get('/api/profile')
            .times(repeatTimes)
            .replyWithFile(statusCode.Ok, responseDir + '/profile/fake-profile.json')

            .intercept('/api/profile', 'OPTIONS').times(repeatTimes).reply(statusCode.Ok)
            .put('/api/profile')
            .times(repeatTimes)
            .reply(statusCode.NoContent)

            .post('/api/profile/picture')
            .times(repeatTimes)
            .delay(uploadFileDelay)
            .reply(statusCode.Created, 'http://res.cloudinary.com/kodakbluesky/image/upload/v1447074950/face_ijmoop.png')

            .get('/api/profile/styles')
            .times(repeatTimes)
            .replyWithFile(statusCode.Ok, responseDir + '/profile/styles.json')

            .get('/api/profile/categories')
            .times(repeatTimes)
            .replyWithFile(statusCode.Ok, responseDir + '/profile/categories.json')

            .intercept('/api/facets/getData?getCategories=true&getStyles=true&getPackageTypes=true', 'OPTIONS').times(repeatTimes).reply(statusCode.Ok)
            .get('/api/facets/getData?getCategories=true&getStyles=true&getPackageTypes=true')
            .times(repeatTimes)
            .reply(statusCode.Ok, []);
    }

    function setupDefaultHeaders() {
        backend.stub
            .defaultReplyHeaders({
                'Access-Control-Allow-Methods': 'GET,PUT,POST,DELETE',
                'Access-Control-Allow-Origin': function (req, res, body) {
                    //console.log(req.headers);
                    return req.headers.origin || '*';// || 'http://localhost:63342';
                },
                'Access-Control-Allow-Credentials': 'true',
                'Access-Control-Allow-Headers': 'content-type, Authorization'
            });
    }

    function matchesPattern(path, pattern) {
        return path.search(new RegExp(pattern)) > -1;
    }

    function setupMixins() {
        chance.mixin({
            'project': function (projectStates) {
                return {
                    projectId: chance.guid(),
                    createDate: chance.date(),
                    startsOn: chance.date({year: 2016}),
                    address: chance.address(),
                    notes: chance.paragraph(),
                    status: chance.pick(projectStates || [0, 1, 2, 3]),
                    packageDetails: {
                        description: chance.sentence(),
                        price: chance.natural()
                    },
                    contractingParty: {
                        displayName: chance.name()
                    }
                };
            }
        });
    }
};
