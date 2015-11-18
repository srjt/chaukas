chaukas.controller('navigationCtrl',['$scope','$auth','$location','chaukasAuth','chaukasUtils',function($scope,$auth,$location,chaukasAuth,chaukasUtils){	
	
	$scope.chaukasAuth=chaukasAuth;	
	$scope.chaukasUtils=chaukasUtils;

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
chaukas.controller('loginCtrl',['$scope','$auth','$location','chaukasAuth','chaukasUtils',function($scope,$auth,$location,chaukasAuth,chaukasUtils){
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
		 
	$scope.loadData=function(){  
		rawDataFactory.getRawDataAll($scope.city).then(function  (data) {
		$scope.rawData=data.data;
	});
	}
	$scope.loadData();

}]);
chaukas.controller('chaukasMapCtrl',['$scope','incidentsFactory','chaukasSocket','chaukasUtils',function($scope,incidentsFactory,chaukasSocket,chaukasUtils){
	//$scope.incidents=[];
	$scope.incidentsOnMap=[];
	$scope.currentCity=chaukasUtils.currentCity;
	$scope.PANELS={
		list:1,
		report:2,
		settings:3
	};

 	chaukasSocket.on('newIncident', function (data) {
 		console.log(data);
 		if(data && data.incident) {
 			data.incident.moveMap=true;
 			addToMap(data.incident);
 		} 		 
    });


    var autocomplete;

 	
 	$scope.init=function(){
 		console.log(chaukasUtils.currentCity.name);
 		var defaultBounds =new google.maps.Circle({center:  new google.maps.LatLng(28.6480367, 77.2129871), radius: 10}).getBounds();

		var input = document.getElementById('searchPlace');
		var options = {
		  bounds: defaultBounds,
		  types: ['establishment','geocode']
		};
		autocomplete = new google.maps.places.Autocomplete(input, options); 
		autocomplete.addListener('place_changed', newIncidentlocationChanged);		
		$scope.mapCenter=chaukasUtils.currentCity.position;
 	};
    
    function newIncidentlocationChanged(){
    	var place = autocomplete.getPlace();

    	$scope.$apply(function(){
    		if(!$scope.reportIncident){
    			$scope.reportIncident=getNewIncident();
    		}
    		$scope.reportIncident.address=place.formatted_address;
    		$scope.reportIncident.loc.coordinates=[place.geometry.location.lng(),place.geometry.location.lat()];    		
    	}());
    }
    $scope.getPanelState=function(panel){  
    	var cls='';  	 
    	if($scope.openPanel){ 
	    	if($scope.openPanel==panel){
	    		cls='open';
	    	}
	    	else {cls='shrink'}
    	}
    	return cls;    	 
    };
	$scope.isHoveredPanel=function(panel){
		if($scope.hoveredPanel==panel){
			return 'hovered';
		}
		return '';
	} 
    $scope.onPanelClick=function(panel){
    	if(!$scope.closingPanel){
			if($scope.openPanel!=panel){ 
				if(panel==$scope.PANELS.report){				
					addNewIncident();	
				}
				else{
					removeNewIncident();
				}
			}
			$scope.openPanel=panel; 
		}
		else {
			$scope.openPanel=null;	
			$scope.closingPanel=false;
			if(panel==$scope.PANELS.report){ 				
				removeNewIncident();
			}	
		}		 
    }; 
 	$scope.closePanel=function(){
 		$scope.closingPanel=true;
 	}; 
    function getNewIncident(){
    	if(typeof $scope.newIncident=='undefined'){
			$scope.newIncident ={
				_id:"newIncidentFakeID",
	 			loc:{  
	 				coordinates:[ $scope.currentPosition.coords.longitude,
	 				$scope.currentPosition.coords.latitude]
	 			}, 
	 			icon:'/images/report-inc-marker.svg',
	 			newIncident:true
	 		};
		}
		return $scope.newIncident;
    }
    function addNewIncident(){
    	$scope.reportIncident=getNewIncident(); 
    }
    function removeNewIncident(){   
    	$scope.reportIncident=null;
    	if($scope.newIncident){ 
    		$scope.newIncident.link='';
    		$scope.newIncident.title=''; 	
    		$scope.newIncident.desc='';
    	} 
    }
 	$scope.reportNewIncident=function(){ 	 
 		incidentsFactory.postIncident($scope.newIncident).then(function(data){			
			 removeNewIncident();
		},function(errMsg){
			console.log(errMsg);
		});	
 	};
 
 	$scope.fetchLinkInfo=function(){
 		$scope.newIncident.title= $scope.newIncident.desc='loading...';
 		
 		chaukasUtils.fetchLinkInfo($scope.newIncident.link).then(function(data){
 			$scope.newIncident.title=data.title;
 			$scope.newIncident.desc=data.description;
 		},function(errMsg){
 			$scope.newIncident.title= $scope.newIncident.desc='';
 		});
 	};
 	$scope.selectToCurrentLocation=function(){
 		$scope.getCurrentLocation();
 		var inc=getNewIncident();
 		inc.loc={ 			
			coordinates:[ $scope.currentPosition.coords.longitude,
			$scope.currentPosition.coords.latitude]
 		}
 		inc.autoCompletePlace='';

 	}
	function addToMap(data){
		if(!data.onMap){
			data.onMap=true;
			 $scope.addIncidentToMap(data);			 
		}
	}

	$scope.addAllToMap=function(){
		for (var i = 0; i < $scope.incidents.length; i++) {	
			$scope.addToMap($scope.incidents[i]);
		};
	};	
	function removeFromMap(data){
		if(data.onMap) {
			data.onMap=false;
			var ret=$scope.removeIncidentFromMap(data);
			if(!ret){
				console.log('Could not remove data point from map');
			}
		}
	}
	$scope.removeAllFromMap=function(){
		for (var i = 0; i < $scope.incidents.length; i++) {
			$scope.removeFromMap($scope.incidents[i]);
		};
	};
	$scope.getCurrentLocation=function(){
		if (navigator.geolocation) {
		    navigator.geolocation.getCurrentPosition(function(position){
		    	console.log('position');

		    	console.log(position);
		      $scope.$apply(function(){
		        $scope.currentPosition = position;
		      });
		      var geolocation = {
		        lat: position.coords.latitude,
		        lng: position.coords.longitude
		      };
		      var circle = new google.maps.Circle({
		        center: geolocation,
		        radius: 50//position.coords.accuracy
		      });
		      autocomplete.setBounds(circle.getBounds());
		    });
	  	}
 	};
	$scope.getCurrentLocation();
	$scope.init();
}]);
chaukas.controller('chaukasListCtrl',['$scope','incidentsFactory','chaukasSocket',function($scope,incidentsFactory,chaukasSocket){
	
	$scope.loadData=function(){  
		incidentsFactory.getIncidentsByCity($scope.city).then(function(data){
			$scope.incidents=data.data;
		 
		},function(errMsg){
			console.log(errMsg);
		});
	}
	$scope.loadData();
}]);

chaukas.controller('incidentCtrl',['$scope','$routeParams','incidentsFactory','chaukasSocket','chaukasUtils',function($scope,$routeParams,incidentsFactory,chaukasSocket,chaukasUtils){
	 
	$scope.currentCity= chaukasUtils.currentCity;
	incidentsFactory.getIncidentById($routeParams._id).then(function(data){
		$scope.incident=data.data;
		$scope.incident.location={longitude:data.data.loc.coordinates[0], latitude:data.data.loc.coordinates[1]}
		$scope.addIncidentToMap($scope.incident);	
	},function(errMsg){
		console.log(errMsg);
	});	
}]);