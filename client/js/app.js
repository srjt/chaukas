var chaukas	=angular.module('chaukas',['ngRoute','satellizer'])
	.config(function  ($routeProvider,$authProvider) {
		$routeProvider.when('/login',{
			templateUrl:'/partials/login.html',
			controller:'loginCtrl'
		})
		.when('/raw',{
			templateUrl:'/partials/rawData.html',
			controller:'rawDataCtrl'
		})
		.when('/map',{
			templateUrl:'/partials/chaukasMap.html',
			controller:'chaukasMapCtrl'
		})
		.when('/incidents',{
			templateUrl:'/partials/incidents.html',
			controller:'chaukasListCtrl'
		})
		.when('/incidents/:_id',{
			templateUrl:'/partials/incident.html',
			controller:'incidentCtrl'
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
		  redirectUri: window.location.origin || window.location.protocol + '//' + window.location.host + '/',
		  scope: 'email',
		  scopeDelimiter: ',',
		  requiredUrlParams: ['display', 'scope'],
		  display: 'popup',
		  type: '2.0',
		  popupOptions: { width: 481, height: 269 }   
		}); 
});