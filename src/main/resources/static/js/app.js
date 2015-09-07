(function(){
    angular.module('particle', ['angularMoment', 'ngCookies'])
        .controller('AppController', function ($scope) {
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
        .controller('InteractController', function($scope){
            $scope.loadDevices = function() {
                spark.listDevices()
                    .then(
                    function(devices){
                        $scope.$apply(function() {
                            $scope.devices = devices;
                        })
                    },
                    function(err){});
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

            $scope.loadDevices();
        })
        .constant('cookieParticleAccessToken', 'PARTICLE_PLAY_ACCESS_TOKEN')
    ;
}());
