(function(){
    angular.module('particle', ['angularMoment', 'ngCookies', 'ui.bootstrap'])
        .controller('AppController', function ($scope, $cookies, cookieParticleAccessToken) {
            $scope.loggedIn = false;
            $scope.mode = 'login';
            $scope.particleLoginResponse = null;

            $scope.devices = [];
            $scope.activeDevices = [];

            var particleToken = null;

            $scope.processLogIn = function (token) {
                $scope.mode = 'ready';
                $scope.particleLoginResponse = token;
                $scope.loggedIn = true;
            };

            $scope.logout = function() {
                $scope.mode = 'login';
                $scope.loggedIn = false;
                $cookies.remove(cookieParticleAccessToken);
                $scope.$emit('loggedOut');
            }

        })

        .controller('LoginController', function($scope, $cookies, cookieParticleAccessToken){
            $scope.credentials = {
                username: '',
                password: ''
            };

            function loadAccessToken() {
                return $cookies.get(cookieParticleAccessToken);
            }

            function saveAccessToken(loginResponse) {
                // an access token based login responds with something like:
                // {accessToken: "286a4576..."}
                if (loginResponse.access_token) {
                    $cookies.put(cookieParticleAccessToken, loginResponse.access_token,
                        {expires: new Date(Date.now() + loginResponse.expires_in)});
                }
            }

            function handleLoginSuccess(loginResponse) {
                // success
                console.log('Success', loginResponse);
                $scope.$apply(function () {
                    saveAccessToken(loginResponse);
                    $scope.processLogIn(loginResponse);
                });
            }

            function loginWithToken(accessToken) {
                console.log('Logging in with token');
                spark.login({accessToken: accessToken})
                    .then(
                    handleLoginSuccess,
                    function (err) {
                        console.log('Login failed', err);
                    })
            }

            $scope.login = function() {
                console.log('Logging in with username', $scope.credentials.username);
                spark.login($scope.credentials)
                    .then(
                    handleLoginSuccess,
                    function (err) {
                        console.log('Login failed', err);
                    })
            };

            var existingToken = loadAccessToken();

            if (existingToken) {
                loginWithToken(existingToken);
            }
        })
        .controller('InteractController', function($scope, products){
            $scope.loadDevices = function() {
                spark.listDevices()
                    .then(
                    function(devices){
                        $scope.$apply(function() {
                            console.log("Loaded devices", devices);
                            $scope.devices = devices;
                        })
                    },
                    function(err){});
            };

            $scope.getActiveDeviceId = function () {
                return $scope.activeDevices.length == 1 ? $scope.activeDevices[0].id : false;
            };

            $scope.getProductInfo = function(device) {
                return products[device.productId];
            };

            $scope.handleActiveDeviceChange = function(evt) {
                $scope.activeDevices = $scope.devices.filter(function(it){
                    return it.active === true;
                });
            };

            $scope.callFunction = function(device) {
                var form = this.functionCall;
                var funcName = this.deviceFunction.name;
                var funcArg = this.deviceFunction.arg;
                console.log('Calling', funcName, 'passing', funcArg);

                device.callFunction(funcName, funcArg, function(err, data) {
                    if (err) {
                        console.log('Failed to call', funcName, 'passing', funcArg);
                    }
                    else {
                        console.log('Call to', funcName, 'returned', data);
                    }
                });
            };

            $scope.$on('loggedOut', function () {
                $scope.devices = [];
                $scope.activeDevices = [];
            });

            $scope.loadDevices();
        })

        .controller('SubscribeEventsController', function($scope){

            $scope.deviceScope = 'mine'; // or 'all' or 'selected'
            $scope.prefix = '';

            $scope.eventLimit = 10;
            $scope.events = [];
            $scope.reqObj = null;

            $scope.subscribe = function() {
                var eventPrefix = $scope.prefix.length > 0 ? $scope.prefix : false;
                var device = false;

                switch ($scope.deviceScope) {
                    case 'mine':
                        device = 'mine';
                        break;
                    case 'selected':
                        device = $scope.getActiveDeviceId();
                        break;
                }

                $scope.reqObj = spark.getEventStream(eventPrefix, device, function (data) {
                    $scope.$apply(function () {
                        $scope.events.unshift(data);
                        while ($scope.events.length > $scope.eventLimit) {
                            $scope.events.pop();
                        }
                    });
                });
            };

            $scope.unsubscribe = function() {
                $scope.reqObj.abort();
                $scope.reqObj = null;
            }

            $scope.isSubscribing = function() {
                return $scope.reqObj != null;
            }
        })

        .constant('cookieParticleAccessToken', 'PARTICLE_PLAY_ACCESS_TOKEN')

        .constant('products', {
            0: {
                label: 'Core',
                image: 'https://cdn.particle.io/images/core-new-b21461f2.png'
            },
            6: {
                label: 'Photon',
                image: 'https://docs.particle.io/assets/images/photon-new.jpg'
            }
        })
    ;
}());
