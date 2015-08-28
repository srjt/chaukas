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
			 if(this.user.isTestUser){
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
	_rawDataService.getRawDataAll = function() {
		return $http.get(urlBase);
	};	 
	return _rawDataService;
}]);
chaukas.factory('incidentsFactory',['$http','$q','chaukasAuth',function($http,$q,chaukasAuth){
	var urlBase='/api/';
	var _incidentDataService={};
	_incidentDataService.getIncidents=function(startDate,endDate){
		var deferred = $q.defer();   
   		console.log(startDate);
   		console.log(endDate);
   		var success=function(data){
  			deferred.resolve(data);   			
   		};

   		var error=function(errMsg){
   			deferred.reject(errMsg);
   		}
		if(startDate && endDate){
			$http.get(urlBase +  'incidents?filter=' + startDate.toISOString() + ',' + endDate.toISOString()   ).then(success,error);
		}   			
		else{ 
			$http.get(urlBase +   'incidents'  ).then(success,error);
		}
   		/*if(dateRange){   		 
   			if(startDate && endDate){
   				$http.get(urlBase +  'incidents?filter=' + startDate + ',' + endDate   ).then(success,error);
   			}   			
   			else{ 
	   			var	filter='?filter=' + dateRange;
	   			$http.get(urlBase +   'incidents' + filter ).then(success,error);
   			}
   		} else { 
			$http.get(urlBase +   'incidents'  ).then(success,error);
		}*/
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

		$http.post(urlBase+'incidents/' + incidentId,{"user":chaukasAuth.user,"comment":comment }).success(success).error(error);
		return deferred.promise;

	}
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
chaukas.factory('chaukasUtils',[function(){
	return {
		//TODO: this should be based on location of map
		dateTimeFormat: 'MMM DD, YYYY HH:mm:ss A',		 
		currentTimezone:'Asia/Calcutta',
		currentCity:{"name":"delhi","position":{"latitude":"28.666667","longitude":"77.216667"}}	
		//-------
	};
}])