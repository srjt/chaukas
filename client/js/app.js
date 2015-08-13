var chaukas	=angular.module('chaukas',['ngRoute','satellizer','angularMoment'])
	.config(function  ($routeProvider,$authProvider) {
		$routeProvider.when('/login',{
			templateUrl:'/partials/login.html',
			controller:'loginCtrl'
		})
		.when('/signup',{
			templateUrl:'/partials/signup.html',
			controller:'signupCtrl'
		})
		.when('/raw',{
			templateUrl:'/partials/rawData.html',
			controller:'rawDataCtrl',
			resolve:{
				auth: ['$q', 'chaukasAuth', function( $q, chaukasAuth) {
			      var userInfo = chaukasAuth.isLogged();
			 
			      if (!chaukasAuth.isLogged()) {
			        return $q.reject({ authenticated: false });
			      }  
			    }]
			}
		})
		.when('/map',{
			templateUrl:'/partials/chaukasMap.html',
			controller:'chaukasMapCtrl',
			resolve:{
				auth: ['$q', 'chaukasAuth', function( $q, chaukasAuth) {
			      var userInfo = chaukasAuth.isLogged();
			 
			      if (!chaukasAuth.isLogged()) {
			        return $q.reject({ authenticated: false });
			      }  
			    }]
			}
		})
		.when('/incidents',{
			templateUrl:'/partials/incidents.html',
			controller:'chaukasListCtrl',
			resolve:{
				auth: ['$q', 'chaukasAuth', function( $q, chaukasAuth) {
			      var userInfo = chaukasAuth.isLogged();
			 
			      if (!chaukasAuth.isLogged()) {
			        return $q.reject({ authenticated: false });
			      }  
			    }]
			}
		})
		.when('/incidents/:_id',{
			templateUrl:'/partials/incident.html',
			controller:'incidentCtrl',
			resolve:{
				auth: ['$q', 'chaukasAuth', function( $q, chaukasAuth) {
			      var userInfo = chaukasAuth.isLogged();
			 
			      if (!chaukasAuth.isLogged()) {
			        return $q.reject({ authenticated: false });
			      }  
			    }]
			}
		})
		.otherwise({
			redirectTo:'/login'
		});

		$authProvider.facebook({
	      clientId: '423596664491464'
	    });
		$authProvider.oauth2({
		  name:'facebook',
		  url: '/api/auth/facebook',
		  authorizationEndpoint: 'https://www.facebook.com/v2.3/dialog/oauth',
		  redirectUri: window.location.origin + '/' || window.location.protocol + '//' + window.location.host + '/',
		  scope: 'email',
		  scopeDelimiter: ',',
		  requiredUrlParams: ['display', 'scope'],
		  display: 'popup',
		  type: '2.0',
		  popupOptions: { width: 481, height: 269 }   
		}); 
});
chaukas.run(["$rootScope", "$location", function($rootScope, $location) { 
	$rootScope.$on("$routeChangeSuccess", function(event, current, previous, eventObj) {
		// console.log(previous);
		// console.log(current);

	});

	$rootScope.$on("$routeChangeError", function(event, current, previous, eventObj) {
		if (eventObj.authenticated === false) {
		  $location.path("/login");
		}
	});
}]);
chaukas.constant('angularMomentConfig', {    
    timezone: 'Asia/Calcutta'
});