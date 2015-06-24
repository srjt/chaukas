chaukas.directive('chaukasMap',['$window','$document','$compile','incidentsFactory','chaukasAuth','chaukasSocket',
	function  ($window,$document,$compile,incidentsFactory,chaukasAuth,chaukasSocket) {	
	return {
		restrict:'E',
		template:'<div id="map-canvas" style="min-height:500px;height:100%" ></div>',
		replace:true,
		scope:{
			data:'=',
			addDataPoint:'=',
			removeDataPoint:'='	,
			mapCenter:'=',
			mapZoom:'=',
			disableInfo:'@',
			currentCity:'='
		},
		link:function(scope,element){
			var map;
 			var filterScope;
 			scope.initDateRange=1;
			function initialize(){
			  	var mapOptions = {
			    	zoom: 11,
			    	center: new google.maps.LatLng(scope.currentCity.latitude, scope.currentCity.longitude),
			    	mapTypeId: google.maps.MapTypeId.ROADMAP
			    
			  	};
			  	map = new google.maps.Map(element[0],mapOptions);		 
			  
				var filterControl = document.createElement('div');
				var attFilterControl = document.createAttribute("filter-control"); 
				filterControl.setAttributeNode(attFilterControl);
				
				var attData=document.createAttribute('data');
				attData.value='data';
				filterControl.setAttributeNode(attData);
	
				var attDateRange=document.createAttribute('date-range');
				attDateRange.value='initDateRange';
				filterControl.setAttributeNode(attDateRange);


				scope.fnDateRangeChanged=function(dateRange,startDate,endDate){
					if(dateRange!='custom'){
						incidentsFactory.getIncidents(dateRange).then(function(data){
							scope.data=data.data;	
							if((!scope.data || scope.data.length<=0) && scope.initDateRange<4){
								scope.initDateRange++;
							}					 
						},function(errMsg){
							console.log(errMsg);
						}) ;
					}
					else {
						incidentsFactory.getIncidents(dateRange,startDate,endDate).then(function(data){
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

				filterScope=scope.$new();        	 
	        	var compiledFilterControl=$compile(filterControl)(filterScope)
				map.controls[google.maps.ControlPosition.TOP_LEFT].push(compiledFilterControl[0]);
			}
			
		 
			initialize();

			var lstMarkers=[];
			var marker;
			
			scope.$watch('data',function(newVal){
				if(newVal) { 
					clearMarkers(); 
					for (i = 0; i < newVal.length; i++) {					 
						newVal[i].mapIndex=	addMarker(newVal[i]);		 
					}
				}
			});
 
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
			function clearMarkers	(){
				for(var i=0;i<lstMarkers.length;i++){
					lstMarkers[i].setMap(null);
				}
				lstMarkers=[];
			}
			
			addMarker=function(pnt){
				var indxMarker=-1;
 				if(pnt && pnt.latitude && pnt.longitude	    ){   					 
					marker = new google.maps.Marker({
						position: new google.maps.LatLng(pnt.latitude,pnt.longitude),
					    map: map,
					    title:pnt.title,
					    animation: google.maps.Animation.DROP
					});	
					lstMarkers.push(marker);					 
					indxMarker=lstMarkers.length-1;

					if(!scope.disableInfo) { 
						google.maps.event.addListener(marker, 'click', (function(marker, pnt,scope) {					 
					        return function() {
					        	var infoWindow = new google.maps.InfoWindow();
					        	if(!isInfoWindowOpen()){
						        	scope.pnt=pnt;
						        	var markerId='chaukasMarker_' + pnt._id;
						        	var infoContent= "<div style='' id='"+ markerId +"''>";
						        	infoContent +="<div style='width:50px;height:50px;float:left;margin-right:10px;border:1px solid lightgray'>News PIC</div>"
						        	infoContent+= " <div> <a target='_blank' href='" + pnt.link + "'>" + pnt.title + "</a> <br/>" ;
						        	infoContent += pnt.address + "</div>"
							        infoContent +='<chaukas-comments incident=incident > </chaukas-comments>'
							       /* infoContent += "<textarea type='text' style='width:100%' ng-model='newComment'> </textarea> "								        	
							        infoContent += "<input type='button' value='go' ng-click='postComment(pnt)'> </input> "	*/
						        	infoContent += " </div>"
						        							        
									var newScope={};
									var onload = function() {
						                scope.$apply(function(){
						                	newScope=scope.$new();
						                	newScope.incident=scope.pnt;
						                	console.log('parent scope= ' + scope.$id + ' newScope= ' + newScope.$id);
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
					            function isInfoWindowOpen(){
								    var map = infoWindow.getMap();
								    return (map !== null && typeof map !== "undefined");
								}

					        }
	   			        })(marker, pnt,scope));				 					
					}
					/*google.maps.event.addListener(infoWindow,'closeclick',(function(maerker){
				   		//marker.setMap(null); //removes the marker
				   		console.log('closing');
				   		//remove chaukasComment directive from page.
					})(marker));*/
				}
				return indxMarker;
 			}


 			removeMarker=function(indx){
 				if(indx<=lstMarkers.length-1)
 				{
 					lstMarkers[indx].setMap(null);
 					return true;
 				}
 				return false;
 			}
			//google.maps.event.addDomListener($window.window, 'load', initialize);
		},
		controller:function($scope){
 
		/*	$scope.postComment=function(incident){		 
				
				var newCommentData={};				
				newCommentData.comment={'username':chaukasAuth.loggedUser(),'comment':$scope.newComment};
				newCommentData.incident=incident._id;				 
				function commentAdded(data){
					$scope.newComment='';	
				}	
				chaukasSocket.emit('addComment',newCommentData,commentAdded);
								
				console.log('posting');
				incidentsFactory.postComment(incident._id,$scope.newComment).then(function(data){
					$scope.newComment='';
				},function(errMsg){
					console.log(errMsg);
				});							
			};*/
		}
	}	 
}]);
chaukas.directive('chaukasComments',['$location','incidentsFactory','chaukasSocket',function($location,incidentsFactory,chaukasSocket){
	return {
		 
		replate:true,
		templateUrl:'/partials/chaukasComments.html',
		 
		link:function(scope,element,attr){
			console.log('linking new chaukasComments to scope= ' + scope.$id);

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
			dateRange:'='
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
						scope.endDate=getTomorrowDate();
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
						break;
				}				 
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
