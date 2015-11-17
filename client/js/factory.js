chaukas.factory('chaukasAuth',['$window','$auth',function($window,$auth){
	var _chaukasAuthentication={};
	_chaukasAuthentication={
		loggedUser:function(){
			if(this.user){
				return this.user.displayName;
			}
		},
		user:undefined,
		isLogged:function(){
			return $auth.isAuthenticated() && this.user!=undefined;
		},
		isTestUser:function(){
			 if(this.user && this.user.isTestUser){
			 	return true;
			 }
			 return false;
		}
	};
	 
	return _chaukasAuthentication;
}]);
chaukas.factory('rawDataFactory',['$http', function($http) {
	var urlBase = '/api/rawdata';
	var _rawDataService = {};
	_rawDataService.getRawDataAll = function(city) {
		return $http.get(urlBase + '/' + city);
	};	 
	return _rawDataService;
}]);
chaukas.factory('incidentsFactory',['$http','$q','chaukasAuth','chaukasUtils',function($http,$q,chaukasAuth,chaukasUtils){
	var urlBase='/api/';
	var _incidentDataService={};
	_incidentDataService.getIncidents=function(startDate,endDate){
		var deferred = $q.defer();   
   		//console.log(startDate);
   		//console.log(endDate);
   		var success=function(data){
  			deferred.resolve(data);   			
   		};

   		var error=function(errMsg){
   			deferred.reject(errMsg);
   		}
		if(startDate && endDate ){
			$http.get(urlBase +  'incidents?sw='+ chaukasUtils.currentCity.bounds.swLng +',' + chaukasUtils.currentCity.bounds.swLat  
											 + '&ne=' + chaukasUtils.currentCity.bounds.neLng + ',' + chaukasUtils.currentCity.bounds.neLat  
											 + '&filter=' + startDate.toISOString() + ',' + endDate.toISOString()   ).then(success,error);
		}   			
		else{ 
			console.error('could not get incidents list');
		} 
		return deferred.promise;
	},
	_incidentDataService.getIncidentsByCity=function(city){

		var swLng,swLat,neLng,neLat;
		if(city=='chandigarh'){
			neLat=30.772427624719178;
			neLng=77.0013542621582;
			swLat=30.62482216605733;
			swLng=76.53821186713867;
		}
		else if(city=='delhi'){
			neLat=28.935961386848007;
			neLng=78.09020237617187;
			swLat=28.333301537709808;
			swLng=76.23763279609375;
		}
		var deferred = $q.defer(); 
   		var success=function(data){
  			deferred.resolve(data);   			
   		};

   		var error=function(errMsg){
   			deferred.reject(errMsg);
   		}
		if(city ){
			$http.get(urlBase +  'incidents?sw='+  swLng + ',' + swLat + '&ne=' + neLng + ',' + neLat).then(success,error);
		}   			
		else{ 
			console.error('could not get incidents list by city');
		} 
		return deferred.promise;
	},
	_incidentDataService.getIncidentById=function(id){
		var deferred = $q.defer();
   
   		var success=function(data){
  			deferred.resolve(data);   			
   		};

   		var error=function(errMsg){
   			deferred.reject(errMsg);
   		}
		$http.get(urlBase +  'incidents/'+ id).then(success,error);
		return deferred.promise;	
	},
	_incidentDataService.postComment=function(incidentId,comment){
		//console.log(incidentId +"/" + comment);
		var deferred=$q.defer();
		var success=function(data){
			deferred.resolve(data);
		};
		var error=function(errMsg){
			deferred.reject(errMsg);
		};

		$http.post(urlBase+'incident/' + incidentId,{"user":chaukasAuth.user,"comment":comment }).success(success).error(error);
		return deferred.promise;
	}
	_incidentDataService.postIncident=function(incident){
		var deferred=$q.defer();
		var success=function(data){
			deferred.resolve(data);
		};
		var error=function(errMsg){
			deferred.reject(errMsg);
		};
		incident.user=chaukasAuth.user;
		$http.post(urlBase+'incident' ,incident).success(success).error(error);
		return deferred.promise;
	};
	return _incidentDataService;
}]);
chaukas.factory('chaukasSocket', ['$rootScope',function ($rootScope) {
	var socket = io.connect();
  	return {
  		
    	on: function (eventName, callback) {
    			var wrapCallback=function(){  
		        	var args = arguments;
		        	$rootScope.$apply(function () {
		          		callback.apply(socket, args);
		        	});
      			};
	      		socket.on(eventName, wrapCallback);
	      		return wrapCallback;
    	},
    	remove:function(eventName,callback){ 
    			socket.removeListener(eventName,callback);	
    	},
    	emit: function (eventName, data, callback) {
    			socket.emit(eventName, data, function () {
	        	var args = arguments;
	        	$rootScope.$apply(function () {
	          	if (callback) {
	            	callback.apply(socket, args);
	          	}
	        	});
      		});
    	}
  };
}]);
chaukas.factory('chaukasUtils',['$http','$q',function($http,$q){
	var utilsInstance=	  {		
		//TODO: this should be based on location of map
		dateTimeFormat: 'MMM DD, YYYY HH:mm:ss A',		 
		currentTimezone:'Asia/Calcutta',
		//currentCity:{"name":"delhi","position":{"latitude":"28.666667","longitude":"77.216667"}}	
		//-------
		currentCity:{	
			name:'',		
			position:{
				longitude:'',
				latitude:''
			},
			mapZoomLevel:19,
			bounds:{
				center:{
					lat:-1,
					lng:-1
				},
				swLng:-1,
				swLat:-1,
				neLng:-1,
				neLat:-1,
				toRadians:function(n){
					return n * Math.PI / 180;
				},	
				calculateDistance:function(lat,lng){
					//calculate distance
					var R = 6371000; // metres
					var φ1 = this.toRadians(lat);
					var φ2 = this.toRadians(this.center.lat);
					var Δφ = this.toRadians(this.center.lat-lat);
					var Δλ = this.toRadians(this.center.lng-lng);

					var a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
					        Math.cos(φ1) * Math.cos(φ2) *
					        Math.sin(Δλ/2) * Math.sin(Δλ/2);
					var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

					var d = R * c;
					return d;
				}
			}
		},
		init:function(currentCity){
			if (navigator.geolocation) {				 
				navigator.geolocation.getCurrentPosition(function(position){	
					console.log(position );		
					var latlng = {lat: position.coords.latitude, lng:position.coords.longitude};
					var rGeo=new google.maps.Geocoder;

					rGeo.geocode({'location':latlng },function  (result,status) {
						//console.log(result);
						//console.log(status);
						if (status === google.maps.GeocoderStatus.OK) {
							for (var i = result.length - 1; i >= 0; i--) {
								if(result[i].types[0]=='locality'){
									//console.log(result[i]);
									currentCity.name=result[i].formatted_address;
								}
							};
						}
					});				
					currentCity.position.latitude=position.coords.latitude;
					currentCity.position.longitude=position.coords.longitude;						 				 
				},function(){
					console.log('errrrrrrrrrrrrrrr');
				});
			}
		},
		fetchLinkInfo:function(lnk){
			var urlBase='/api/';
			var deferred = $q.defer();   
	   		
	   		var success=function(data){
	  			deferred.resolve(data.data);   			
	   		};

	   		var error=function(errMsg){
	   			deferred.reject(errMsg);
	   		}
	   		$http.get(urlBase + 'utils/linkinfo?lnk='+ lnk).then(success,error);
	   		return deferred.promise;				
		} 
	};

	utilsInstance.init(utilsInstance.currentCity); 
	 
 

	return utilsInstance;
}])