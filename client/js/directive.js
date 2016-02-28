chaukas.directive('chaukasMap',['$window','$document','$compile','incidentsFactory','chaukasAuth','chaukasSocket','chaukasUtils',
	function  ($window,$document,$compile,incidentsFactory,chaukasAuth,chaukasSocket,chaukasUtils) {	
	return {
		restrict:'E',
		template:'<div id="map-canvas" style="min-height:500px;height:100%" ></div>',
		replace:true,
		scope:{
			data:'=',
			reportIncidentPoint:'=',
			addDataPoint:'=',
			removeDataPoint:'='	,
			mapCenter:'=',
			mapZoom:'=',
			disableInfo:'@',
			currentCity:'=',
			enableFilterControl:'='
		},
		link:function(scope,element){
			var map;
 			var infoWindow = new google.maps.InfoWindow(); 
 			scope.initDateRange=1;
 			scope.loadingIncidents=false;
			var lstMarkers=[];
			var reportIncidentMarker;
			var marker;
			
			function initialize(){
			  	var mapOptions = {
			    	zoom: 11,
			    	//center: (scope.currentCity) ? new google.maps.LatLng(scope.currentCity.latitude, scope.currentCity.longitude): undefined,
			    	mapTypeId: google.maps.MapTypeId.ROADMAP,
			    	mapTypeControl: false,
			    	panControlOptions:{
			    	  position: google.maps.ControlPosition.RIGHT_BOTTOM	
			    	},
				     
				    zoomControl: true,
				    zoomControlOptions: {
				        style: google.maps.ZoomControlStyle.DEFAULT,
				        position: google.maps.ControlPosition.LEFT_CENTER
				    },
				    scaleControl: true,
				    streetViewControl: false,
				};
			  	map = new google.maps.Map(element[0],mapOptions);		 
				if(scope.enableFilterControl) {
			 		google.maps.event.addListener(map, 'idle', function() {
			 			console.log('idle');
							var bounds =  map.getBounds();
							if(bounds){ 
								var centerLat=bounds.getCenter().lat()
								var centerLng=bounds.getCenter().lng();
								var ne = bounds.getNorthEast();
								var sw = bounds.getSouthWest();
								var dist=-1;

								if(chaukasUtils.currentCity.bounds.center.lat>=0){
									dist=chaukasUtils.currentCity.bounds.calculateDistance(centerLat,centerLng);							
								} 

								if((dist==-1 || dist>25 || map.zoom!=chaukasUtils.currentCity.mapZoomLevel) && !isInfoWindowOpen()){ 
									chaukasUtils.currentCity.mapZoomLevel=map.zoom;
									chaukasUtils.currentCity.bounds.center.lat=centerLat;
									chaukasUtils.currentCity.bounds.center.lng=centerLng;
									chaukasUtils.currentCity.bounds.swLng=sw.lng();
									chaukasUtils.currentCity.bounds.swLat=sw.lat();
									chaukasUtils.currentCity.bounds.neLng=ne.lng();
									chaukasUtils.currentCity.bounds.neLat=ne.lat();  
									scope.fnDateRangeChanged(scope.initDateRange,scope.startDate,scope.endDate);
								}		   
							}               
			         });
				}

				//------------------PLACES------------------------			  
				service = new google.maps.places.PlacesService(map);

				function performSearch() {
				  var request = {
				    bounds:new google.maps.Circle({center:  new google.maps.LatLng(28.6480367, 77.2129871), radius: 100}).getBounds(),
				    keyword: 'new'
				  };
				  service.radarSearch(request, callback);
				}

				function callback(results, status) {
				  if (status !== google.maps.places.PlacesServiceStatus.OK) {
				    console.log(status);
				    return;
				  }
				  for (var i = 0, result; result = results[i]; i++) {
				    //console.log(result);
				    service.getDetails(result,function(detail,status){
				    	if (status !== google.maps.places.PlacesServiceStatus.OK) {
					       console.error(status);
					       return;
					    } else {
					    	console.log(detail.name);
					    }
				    });
				  }
				}
				//performSearch();

				//------------------PLACES------------------------
				if(scope.enableFilterControl) {
					var filterControl = document.createElement('div');
					var attFilterControl = document.createAttribute("filter-control"); 
					filterControl.setAttributeNode(attFilterControl);
					
					var attData=document.createAttribute('data');
					attData.value='data';
					filterControl.setAttributeNode(attData);
		
					var attDateRange=document.createAttribute('date-range');
					attDateRange.value='initDateRange';
					filterControl.setAttributeNode(attDateRange);

					var attIsLoading=document.createAttribute('is-loading');
					attIsLoading.value='loadingIncidents';
					filterControl.setAttributeNode(attIsLoading);

					scope.fnDateRangeChanged=function(dateRange,startDate,endDate){ 
						scope.startDate=startDate;
						scope.endDate=endDate;
						scope.loadingIncidents=true; 
						if(dateRange!='custom'){
							incidentsFactory.getIncidents(startDate,endDate).then(function(data){
								scope.data=data.data;
								scope.loadingIncidents=false;	
								// if((!scope.data || scope.data.length<=0) && scope.initDateRange<4){
								// 	scope.initDateRange++;
								// }					 
								 
							},function(errMsg){
								console.log(errMsg);								
								scope.loadingIncidents=false;
							}) ;
						}
						else {
							incidentsFactory.getIncidents(startDate,endDate).then(function(data){
								scope.data=data.data;	
								 					 
							},function(errMsg){
								console.log(errMsg);
							}) ;	
						}
					};
					var attDateRangeChanged=document.createAttribute('date-range-changed');
					attDateRangeChanged.value='fnDateRangeChanged(dateRange,startDate,endDate)';
					filterControl.setAttributeNode(attDateRangeChanged);
		  
					filterControl.index = 1;
 
		        	var compiledFilterControl=$compile(filterControl)(scope);
					map.controls[google.maps.ControlPosition.LEFT_TOP].push(compiledFilterControl[0]);
				}
			}
			
			scope.$watch('data',function(newVal){
				if(newVal) { 
					clearMarkers(); 
					for (i = 0; i < newVal.length; i++) {					 
						newVal[i].mapIndex=	addMarker(newVal[i]);		 
					}
					 
				}
			});

			scope.$watch('reportIncidentPoint.loc',function(newVal){	
				if(newVal){ 
					addReportIncidentMarker(newVal);
				}
				else {
					removeReportIncidentMarker();					
				}
			},true);
 
			scope.$watch('mapCenter',function(newVal){
				if(newVal && map){
					map.setCenter(new google.maps.LatLng(newVal.latitude, newVal.longitude));			
				}
			});

			scope.$watch('mapZoom',function(newVal){
				if(newVal && map){
					map.setZoom(newVal);			
				}
			});

		 	scope.addDataPoint=function(pnt){
		 		if(!scope.data){scope.data=[];}		 		
		 		pnt.mapIndex=addMarker(pnt);
		 		if(pnt.mapIndex>=0){ 
		 			scope.data.push(pnt);
		 		}
		 	};

		 	scope.removeDataPoint=function(pnt){
		 		var removeIndex=-1;
		 		 
		 		for (var i = scope.data.length - 1; i >= 0; i--) {
			 		if(pnt._id==scope.data[i]._id){
			 			removeIndex=i;
			 			break;
			 		}
		 		};
		 		if(removeIndex>=0){
		 			scope.data.splice(removeIndex,1);
		 			return removeMarker(pnt.mapIndex);
		 		} 
		 		return false;
		 	};

		 	function isInfoWindowOpen()	{
		 		if(infoWindow){
		 			var iwMap = infoWindow.getMap();
    				return (iwMap !== null && typeof iwMap !== "undefined");
		 		}
		 		return false;
		 	}

			function clearMarkers	(){
				for(var i=0;i<lstMarkers.length;i++){
					lstMarkers[i].setMap(null);
				}
				lstMarkers=[];
			}
			
			function addMarker(pnt){
				var indxMarker=-1;
 				if(pnt && pnt.loc.coordinates.length==2){				 
					marker = new google.maps.Marker({
						position: new google.maps.LatLng(pnt.loc.coordinates[1] ,pnt.loc.coordinates[0]),
					    map: map,
					    title:pnt.title
					});					


					if(pnt.moveMap){
						scope.mapCenter={latitude:pnt.loc.coordinates[1],longitude:pnt.loc.coordinates[0]};
					}
					
					lstMarkers.push(marker);					 
					indxMarker=lstMarkers.length-1;					

					//Show viewport rectangular on mouseover
					var rectangle;
					google.maps.event.addListener(marker,'mouseover',function(){
						return function(){
							if(pnt.viewport && pnt.loc_type!='ROOFTOP'){
								var boundryCoords = {
									south:pnt.viewport.southwest.lat,
									west:pnt.viewport.southwest.lng,
									north:pnt.viewport.northeast.lat,
									east:pnt.viewport.northeast.lng 
								}; 
								// Construct the polygon.
								rectangle = new google.maps.Rectangle({
								    strokeColor: '#FF0000',
								    strokeOpacity: 0.8,
								    strokeWeight: 2,
								    fillColor: '#FF0000',
								    fillOpacity: 0,
								    map: map,
								    bounds: boundryCoords
								  });						
							} 						
						};
					}(pnt,map,rectangle))

					//Hide viewport rectangular on mouseout
					google.maps.event.addListener(marker,'mouseout',function(){
						return function(){
							if(rectangle){ 
								rectangle.setMap(null);
							}		  						
						};
					}(rectangle))

					//Show Infowindow on click 
					if(!scope.disableInfo) {
						google.maps.event.addListener(marker, 'click', (function(marker, pnt,scope) {
					        return function() {					         
					        	scope.pnt=pnt;
					        	var markerId='chaukasMarker_' + pnt._id;
					        	var infoContent= "<div style='' id='"+ markerId +"''>  "  ;
					        	//infoContent +="<div style='width:50px;height:50px;float:left;margin-right:10px;border:1px solid lightgray'>News PIC</div>";
					        	infoContent+= " <div> ";
					        	if(pnt.link){ 
					        		infoContent+= "  <a target='_blank' href='" + pnt.link + "'>" + pnt.title + "</a> <br/>" ;
					        	}
					        	else { 
					        		infoContent+= "  <a   href='#/incidents/" + pnt._id + "'>" + pnt.title + "</a> <br/>" ;						        		 	
					        	}
					        	infoContent += (pnt.address) ? pnt.address : " " +  "</div>";
						        infoContent +='<chaukas-comments incident=incident > </chaukas-comments>';
						       /* infoContent += "<textarea type='text' style='width:100%' ng-model='newComment'> </textarea> "								        	
						        infoContent += "<input type='button' value='go' ng-click='postComment(pnt)'> </input> "	*/
					        	infoContent += " </div>";
					        							        
								var newScope={};
								var onload = function() {
					                scope.$apply(function(){
					                	newScope=scope.$new();
					                	newScope.incident=scope.pnt;
					                	//console.log('parent scope= ' + scope.$id + ' newScope= ' + newScope.$id);
					                	$compile(document.getElementById(markerId))(newScope)
					                });

						            google.maps.event.addListener(infoWindow, 'closeclick', (function(newScope) {
					                	return function(){				                		
					                   		newScope.$destroy();				                   		  
					               		}
					                })(newScope));
					             }

					        	infoWindow.setContent(infoContent);
					        	
								google.maps.event.addListener(infoWindow, 'domready', function(a,b,c,d) {
				                   onload();
				                });		                

					            infoWindow.open(map, marker);

					        
					        }
	   			        })(marker, pnt,scope));				 					
					}
					 
				}
				return indxMarker;
 			}

 			function removeMarker(indx){
 				if(indx<=lstMarkers.length-1)
 				{
 					lstMarkers[indx].setMap(null);
 					return true;
 				}
 				return false;
 			}

 			function addReportIncidentMarker(loc){
 				removeReportIncidentMarker();
				var image = {
				  url: '/images/report-inc-marker.png',
				  // size: new google.maps.Size(71, 71),
				   origin: new google.maps.Point(0, 0),
				  // anchor: new google.maps.Point(17, 34),
				  scaledSize: new google.maps.Size(51, 51)
				};

				reportIncidentMarker = new google.maps.Marker({
					position: new google.maps.LatLng(loc.coordinates[1],loc.coordinates[0]),
				    map: map,
				    title:"Report Incident",
				    icon:image,
				    animation: google.maps.Animation.DROP 
				});	

				 
				scope.mapCenter={latitude:loc.coordinates[1],longitude:loc.coordinates[0]}; 
 			} 
 			function removeReportIncidentMarker(){
				if(reportIncidentMarker){ 
					reportIncidentMarker.setMap(null);
				}
			}
			initialize();
		},
		controller:function($scope){
 
		}
	}	 
}]);
chaukas.directive('chaukasComments',['$location','amMoment','incidentsFactory','chaukasSocket','chaukasAuth','chaukasUtils',function($location,amMoment,incidentsFactory,chaukasSocket,chaukasAuth,chaukasUtils){
	return {
		 
		replate:true,
		templateUrl:'/partials/chaukasComments.html',
		 
		link:function(scope,element,attr){
			//console.log('linking new chaukasComments to scope= ' + scope.$id);

			scope.maxComments=attr.maxComments || 5;
			function handleNewComment(data){
				console.log('handling newcomment on scope = ' + scope.$id);
				if(scope.incident._id==data.incident){
					if(!scope.incident.comments){scope.incident.comments=[];}
					scope.incident.comments.push(data.comment);
				}
			}
			var fnHandleNewComment=chaukasSocket.on('newComment',handleNewComment);

			scope.$on("$destroy",
                function handleDestroyEvent() {
					console.log('closing newScope= ' + scope.$id);
					chaukasSocket.remove('newComment',fnHandleNewComment);
					//scope=null;
                }
            );
			if(scope.incident){
				incidentsFactory.getIncidentById(scope.incident._id).then(function(data){
					scope.incident=data.data;
				},function(errMsg){
					console.log(errMsg);
				});	
			}
			
			scope.getDp=function(){
				if(chaukasAuth.user)
				{
					return chaukasAuth.user.picture;
				}
			};
			scope.viewAllComments=function(){
				if(!attr.fullPage){ 
					$location.path('/incidents/' + scope.incident._id);
			 	}
			 	else{
			 		scope.maxComments += scope.maxComments;
			 	}
			};
			scope.postComment=function( ){		 
				
			/*	var newCommentData={};				
				newCommentData.comment={'username':chaukasAuth.loggedUser(),'comment':$scope.newComment};
				newCommentData.incident=incident._id;				 
				function commentAdded(data){
					$scope.newComment='';	
				}	
				chaukasSocket.emit('addComment',newCommentData,commentAdded);
			*/					
				console.log('posting');
				incidentsFactory.postComment(scope.incident._id,scope.newComment).then(function(data){
					scope.newComment='';
				},function(errMsg){
					console.log(errMsg);
				});							
			};
			scope.getCommentsLable=function(){
				if(scope.incident && scope.incident.comments)
				{
					if(scope.incident.comments.length==1){
						return '1 COMMENT';
					}
					else {
						return scope.incident.comments.length + ' COMMENTS';
					}
				}
				return '';
			}

			scope.getLocalizedDate=function(dt){			    
			    return amMoment.applyTimezone(moment.utc(dt ), chaukasUtils.currentTimezone).format(chaukasUtils.dateTimeFormat);    			
			};
			scope.getDateTimeFormat=function(){
				return chaukasUtils.dateTimeFormat;	
			};
			Array.prototype.latestComments=function(num){
				var newArray=[]
				if(this.length>=num){ 
					for (var i =this.length-num;  i < this.length; i++) {
						newArray.push(this[i]);
					};
				}else{return this;}
				return newArray;
			}

		}
	};
}]);
chaukas.directive('chaukasPostComment',function(){
	return{
		link:function(scope,element,attrs) {
		 element.bind("keypress", function(event) {
	            if(event.which === 13) {
	                scope.$apply(function() {
		                scope.$eval(attrs.chaukasPostComment);
	                });
	                event.preventDefault();
	            }
	        });
		}
	};
});
chaukas.directive('filterControl',function(){
	return {
		restrict:'A',
		templateUrl:'/partials/filterControl.html',
		scope:{
			data:'=',
			dateRangeChanged:'&' ,
			dateRange:'=',
			isLoading:'='
		},
		link:function(scope,element,attrs) {
			
			scope.startDate=new Date();
			scope.endDate=getTomorrowDate();

			scope.dateRange=1;
			scope.rangeMode=1;
			 
			scope.$watch('dateRange',function(newVal){
				scope.rangeChanged();
			});
			scope.getDateRangeTitle=function(){
				var dateRangeText='custom';
				switch(scope.dateRange){
					case 1:
						dateRangeText='today';						
						break;
					case 2:
						dateRangeText='week';						

						break;
					case 3:
						dateRangeText='month';						
						break;
					case 4:
						dateRangeText='year';						
						break;
					default:
						dateRangeText='custom';
						break;
				}	
				return dateRangeText;
			};
			scope.rangeChanged=function(){
				if(scope.dateRange==undefined){return;}
				var dateRangeText;

				//var dr=Math.abs(parseInt(scope.dateRange));
				switch(scope.dateRange){
					case 1:
						dateRangeText='today';
						scope.startDate=new Date();
						scope.endDate=new Date();
						break;
					case 2:
						dateRangeText='week';
						scope.startDate=getBackDate(7);
						scope.endDate=new Date();
						break;
					case 3:
						dateRangeText='month';
						scope.startDate=getBackDate(30);
						scope.endDate=new Date();						
						break;
					case 4:
						dateRangeText='year';
						scope.startDate=getBackDate(365);
						scope.endDate=new Date();						
						break;
					default:
						dateRangeText='custom';
						/*var tempDate=new Date(scope.startDate);
						var mnth=tempDate.getMonth() + 1;
						scope.startDate=new Date(tempDate.getFullYear()+'-'+ mnth +'-'+tempDate.getDate());
						tempDate=new Date(scope.endDate);
						var mnth=tempDate.getMonth() + 1;
						scope.endDate=new Date(tempDate.getFullYear()+'-'+ mnth +'-'+tempDate.getDate());*/
						break;
				}			
				//set Hours to include whole days
				scope.startDate.setHours(0,0,0,0)	 ;
				scope.endDate.setHours(23,59,59,59);
				scope.dateRangeChanged({dateRange:dateRangeText,startDate:scope.startDate,endDate:scope.endDate});
				 
			}

			function getTomorrowDate(){ 
				var d=new Date();
				d.setDate(d.getDate() +1);
				return d;

			}
			function getBackDate(byDays){ 
				var d=new Date();
				d.setDate(d.getDate() - byDays);
				return d;
			} 
			 
		}
	};
});
chaukas.directive('passwordMatch', function() {
    return {
      require: 'ngModel',
      scope: {
        otherModelValue: '=passwordMatch'
      },
      link: function(scope, element, attributes, ngModel) {
        ngModel.$validators.compareTo = function(modelValue) {
          return modelValue === scope.otherModelValue;
        };
        scope.$watch('otherModelValue', function() {
          ngModel.$validate();
        });
      }
    };
  });
chaukas.directive('passwordStrength', function() {
    return {
      restrict: 'A',
      require: 'ngModel',
      link: function(scope, element, attrs, ngModel) {
        var indicator = element.children();
        var dots = Array.prototype.slice.call(indicator.children());
        var weakest = dots.slice(-1)[0];
        var weak = dots.slice(-2);
        var strong = dots.slice(-3);
        var strongest = dots.slice(-4);

        element.after(indicator);

        element.bind('keyup', function() {
          var matches = {
                positive: {},
                negative: {}
              },
              counts = {
                positive: {},
                negative: {}
              },
              tmp,
              strength = 0,
              letters = 'abcdefghijklmnopqrstuvwxyz',
              numbers = '01234567890',
              symbols = '\\!@#$%&/()=?¿',
              strValue;

          angular.forEach(dots, function(el) {
            el.style.backgroundColor = '#ebeef1';
          });
          
          if (ngModel.$viewValue) {
            // Increase strength level
            matches.positive.lower = ngModel.$viewValue.match(/[a-z]/g);
            matches.positive.upper = ngModel.$viewValue.match(/[A-Z]/g);
            matches.positive.numbers = ngModel.$viewValue.match(/\d/g);
            matches.positive.symbols = ngModel.$viewValue.match(/[$-/:-?{-~!^_`\[\]]/g);
            matches.positive.middleNumber = ngModel.$viewValue.slice(1, -1).match(/\d/g);
            matches.positive.middleSymbol = ngModel.$viewValue.slice(1, -1).match(/[$-/:-?{-~!^_`\[\]]/g);

            counts.positive.lower = matches.positive.lower ? matches.positive.lower.length : 0;
            counts.positive.upper = matches.positive.upper ? matches.positive.upper.length : 0;
            counts.positive.numbers = matches.positive.numbers ? matches.positive.numbers.length : 0;
            counts.positive.symbols = matches.positive.symbols ? matches.positive.symbols.length : 0;

            counts.positive.numChars = ngModel.$viewValue.length;
            tmp += (counts.positive.numChars >= 8) ? 1 : 0;

            counts.positive.requirements = (tmp >= 3) ? tmp : 0;
            counts.positive.middleNumber = matches.positive.middleNumber ? matches.positive.middleNumber.length : 0;
            counts.positive.middleSymbol = matches.positive.middleSymbol ? matches.positive.middleSymbol.length : 0;

            // Decrease strength level
            matches.negative.consecLower = ngModel.$viewValue.match(/(?=([a-z]{2}))/g);
            matches.negative.consecUpper = ngModel.$viewValue.match(/(?=([A-Z]{2}))/g);
            matches.negative.consecNumbers = ngModel.$viewValue.match(/(?=(\d{2}))/g);
            matches.negative.onlyNumbers = ngModel.$viewValue.match(/^[0-9]*$/g);
            matches.negative.onlyLetters = ngModel.$viewValue.match(/^([a-z]|[A-Z])*$/g);

            counts.negative.consecLower = matches.negative.consecLower ? matches.negative.consecLower.length : 0;
            counts.negative.consecUpper = matches.negative.consecUpper ? matches.negative.consecUpper.length : 0;
            counts.negative.consecNumbers = matches.negative.consecNumbers ? matches.negative.consecNumbers.length : 0;

            // Calculations
            strength += counts.positive.numChars * 4;
            if (counts.positive.upper) {
              strength += (counts.positive.numChars - counts.positive.upper) * 2;
            }
            if (counts.positive.lower) {
              strength += (counts.positive.numChars - counts.positive.lower) * 2;
            }
            if (counts.positive.upper || counts.positive.lower) {
              strength += counts.positive.numbers * 4;
            }
            strength += counts.positive.symbols * 6;
            strength += (counts.positive.middleSymbol + counts.positive.middleNumber) * 2;
            strength += counts.positive.requirements * 2;

            strength -= counts.negative.consecLower * 2;
            strength -= counts.negative.consecUpper * 2;
            strength -= counts.negative.consecNumbers * 2;

            if (matches.negative.onlyNumbers) {
              strength -= counts.positive.numChars;
            }
            if (matches.negative.onlyLetters) {
              strength -= counts.positive.numChars;
            }

            strength = Math.max(0, Math.min(100, Math.round(strength)));

            if (strength > 85) {
              angular.forEach(strongest, function(el) {
                el.style.backgroundColor = '#008cdd';
              });
            } else if (strength > 65) {
              angular.forEach(strong, function(el) {
                el.style.backgroundColor = '#6ead09';
              });
            } else if (strength > 30) {
              angular.forEach(weak, function(el) {
                el.style.backgroundColor = '#e09115';
              });
            } else {
              weakest.style.backgroundColor = '#e01414';
            }
          }
        });
      },
      template: '<span class="password-strength-indicator"><span></span><span></span><span></span><span></span></span>'
    };
  });