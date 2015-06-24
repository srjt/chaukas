var chaukas	=angular.module('chaukas',['ngRoute'])
	.config(function  ($routeProvider) {
		$routeProvider.when('/raw',{
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
			redirectTo:'/map'
		});
});