chaukas.controller('navigationCtrl',['$scope','$auth','$location','chaukasAuth',function($scope,$auth,$location,chaukasAuth){	
	
	$scope.chaukasAuth=chaukasAuth;	

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
	
	$scope.signOut=function(){
		$auth.logout()
		.then(function(){
		});
	};
	setSelctedNav();
}]);
chaukas.controller('loginCtrl',['$scope','$auth','$location','chaukasAuth',function($scope,$auth,$location,chaukasAuth){
	if(chaukasAuth.isLogged()){
		$location.path('/map');
	}
	$scope.emailLogin = function() {
      $auth.login({ email: $scope.email, password: $scope.password })
        .then(function(data) {
          	chaukasAuth.user=data.data.user;      		
      		$location.path('/map');
        })
        .catch(function(err) {
           $scope.errorLogin=err.data.message;
        });
    };
	$scope.authenticate = function(provider) {
    	$auth.authenticate(provider)
    	.then(function(data){
      		chaukasAuth.user=data.data.user;      		
      		$location.path('/map');
      	})
    	.catch(function(err){
			$scope.errorFb=err.data.error;	
		});
    };
    
}]);
chaukas.controller('signupCtrl',['$scope','$auth','$location','chaukasAuth',function($scope,$auth,$location	,chaukasAuth){

    $scope.signup = function() {
		$auth.signup({
			displayName: $scope.displayName,
			email: $scope.email,
			password: $scope.password
		})
		.then(function(data){
			chaukasAuth.user=data.data.user;      		
			$location.path('/map');
		})
		.catch(function(response) {
			if (typeof response.data.message === 'object') {
			  angular.forEach(response.data.message, function(message) {
			    errorSignup += ' '  + message[0];
			  });
			} else {          
			   errorSignup= response.data.message;         
			}
		});
    };
}]);
chaukas.controller('rawDataCtrl',[ '$scope','rawDataFactory',function  ($scope,rawDataFactory) {
	$scope.rawData=[]; 
	rawDataFactory.getRawDataAll().then(function  (data) {
		$scope.rawData=data.data;
	});	 
}]);
chaukas.controller('chaukasMapCtrl',['$scope','incidentsFactory','chaukasSocket','chaukasUtils',function($scope,incidentsFactory,chaukasSocket,chaukasUtils){
	//$scope.incidents=[];
	$scope.incidentsOnMap=[];
	$scope.currentCity=chaukasUtils.currentCity;


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

chaukas.controller('incidentCtrl',['$scope','$routeParams','incidentsFactory','chaukasSocket','chaukasUtils',function($scope,$routeParams,incidentsFactory,chaukasSocket,chaukasUtils){
	 
	$scope.currentCity= chaukasUtils.currentCity;
	incidentsFactory.getIncidentById($routeParams._id).then(function(data){
		$scope.incident=data.data;
		$scope.addIncidentToMap($scope.incident);	
	},function(errMsg){
		console.log(errMsg);
	});	
}]);