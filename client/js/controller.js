chaukas.controller('navigationCtrl',['$scope','$auth','$location','chaukasAuth',function($scope,$auth,$location,chaukasAuth){

	
	function setSelctedNav(){

		if($location.$$path.indexOf('map')>=0){
			$scope.selectedNav='map';
		}
		else if($location.$$path.indexOf('incidents')>=0){
			$scope.selectedNav='list';
		}
		if($location.$$path.indexOf('raw')>=0){
			$scope.selectedNav='rlist';
		}
	}
	$scope.chaukasAuth=chaukasAuth;	
	$scope.signOut=function(){
		$auth.logout().then(function(){
		});
	};
	setSelctedNav();
}]);
chaukas.controller('loginCtrl',['$scope','$auth','$location','chaukasAuth',function($scope,$auth,$location,chaukasAuth){

	if(chaukasAuth.isLogged()){
		$location.path('/map');
	}
	$scope.authenticate = function(provider) {
    	$auth.authenticate(provider).then(function(data){
      		chaukasAuth.user=data.data.user;      		 
      });
    };
    
}]);
chaukas.controller('rawDataCtrl',[ '$scope','rawDataFactory',function  ($scope,rawDataFactory) {
	$scope.rawData=[]; 
	rawDataFactory.getRawDataAll().then(function  (data) {
		$scope.rawData=data.data;
	});	 
}]);
chaukas.controller('chaukasMapCtrl',['$scope','incidentsFactory','chaukasSocket',function($scope,incidentsFactory,chaukasSocket){
	//$scope.incidents=[];
	$scope.incidentsOnMap=[];
	$scope.currentCity={"name":"delhi","position":{"latitude":"28.666667","longitude":"77.216667"}}	


 	chaukasSocket.on('newIncident', function (data) {
 		if(data) {
 			$scope.addToMap(data);
 		} 		 
    });

 
    $scope.addTestData=function(){
	    var testData=	{
			    "_id": "0001",
			    "link": "http://timesofindia.indiatimes.com",
			    "title": "Test Data",
			    "longitude": 77.0290866,
			    "latitude": 28.6890112,
			    "date": "May 12, 2015, 01.48AM IST",
			    "address": "Mundka, DMRC, Mundka, New Delhi, Delhi 110081, India",
			    "comments": [
			        {
			        	"username":"srjt",
			            "comment": "What the hell!",
			            "date": "2015-06-02 04:15:29"
			        }
			    ]
			};

		function dataAdded(data){
			 var args = arguments;
			// $scope.addToMap(data);
		}
 
		chaukasSocket.emit('addIncident',testData,dataAdded);
	}


	$scope.addToMap=function(data){

		if(!data.onMap){
			data.onMap=true;
			 $scope.addIncidentToMap(data);			 
		}
	};

	$scope.addAllToMap=function(){
		for (var i = 0; i < $scope.incidents.length; i++) {	
			$scope.addToMap($scope.incidents[i]);
		};
	};

	
	$scope.removeFromMap=function(data){
		if(data.onMap) {
			data.onMap=false;
			var ret=$scope.removeIncidentFromMap(data);
			if(!ret){
				console.log('here');
			}
		}
	};

	$scope.removeAllFromMap=function(){
		for (var i = 0; i < $scope.incidents.length; i++) {
			$scope.removeFromMap($scope.incidents[i]);
		};
	};
}]);
chaukas.controller('chaukasListCtrl',['$scope','incidentsFactory','chaukasSocket',function($scope,incidentsFactory,chaukasSocket){
	incidentsFactory.getIncidents().then(function(data){
		$scope.incidents=data.data;
	 
	},function(errMsg){
		console.log(errMsg);
	}) ;
}]);

chaukas.controller('incidentCtrl',['$scope','$routeParams','incidentsFactory','chaukasSocket',function($scope,$routeParams,incidentsFactory,chaukasSocket){
	 
	incidentsFactory.getIncidentById($routeParams._id).then(function(data){
		$scope.incident=data.data;
	// $scope.addIncidentToMap($scope.incident);	
	},function(errMsg){
		console.log(errMsg);
	});	
}]);