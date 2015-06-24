sachetAdmin.directive('sachetMap',['$window','$document','$compile','incidentDataFactory',function  ($window,$document,$compile,incidentDataFactory) {
	
	return {
		restrict:'E',
		template:'<div id="map-canvas" style="height:500px" ></div>',
		replace:true,
		scope:{
			data:'=',
			addDataPoint:'=',
			removeDataPoint:'='
			 
		},
		link:function(scope,element){
			var map;
			function initialize(){
			  var mapOptions = {
			    zoom: 11,
			    center: new google.maps.LatLng(28.666667, 77.216667),
			     mapTypeId: google.maps.MapTypeId.ROADMAP
			  };
			  map = new google.maps.Map(element[0],mapOptions);			
			}
			initialize();

			var lstMarkers=[];
			var marker;
			var infowindow = new google.maps.InfoWindow();
			scope.$watch ('data',function(newVal){
				clearMarkers(); 
				for (i = 0; i < newVal.length; i++) {					 
					addMarker(newVal[i]);		 
				}			
			});
		 
		 	scope.addDataPoint=function(pnt){
		 		scope.data.push(pnt);
		 		pnt.mapIndex=addMarker(pnt);
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
					google.maps.event.addListener(marker, 'click', (function(marker, pnt,scope) {

						function displayComment(){
							var allComments='';
							if(pnt && pnt.comments){
								for (var i = 0; i < pnt.comments.length; i++) {
									var cmnt=pnt.comments[i];
									var cmntTemplate = "<div class='cmnt' style='display:table' >"
						        		cmntTemplate += " <img src='/images/dp.jpg' style='width:40px;height:40px' >"
							        	cmntTemplate += " <div style='float:right;padding:3px;width:200px'>"
								        	cmntTemplate += " <span style='font-weight:bold'> "+cmnt.username+" </span> "
								        	cmntTemplate += " <span>" + cmnt.comment+ "</span> "  ;
								        	cmntTemplate += " <div style='color:##9197a3'>"+cmnt.date+"</div>"
						        		cmntTemplate += " </div>  "
						        	cmntTemplate += " </div>  "
						        	allComments+=cmntTemplate;

								};
							}
							return allComments;					         
						}
						function	getCommentsLable(){
							if(pnt.comments ){
								if(pnt.comments.length==1){
									return '1 COMMENT';
								}
								else {
									return pnt.comments.length + ' COMMENTS';
								}
							}
							return ''
						}
				        return function() {
				        	var markerId='sachetMarker_' + pnt._id;
				        	var infoContent= "<div style='width:250px' id='"+ markerId +"''> <a target='_blank' href='" + pnt.link + "'>" + pnt.title + "</a> <br/>" 
				        	infoContent += pnt.address
				        	infoContent += " <div class='cmnts'> "
				        		infoContent += "<div style='font-size:8px;font-weight:bold;color:coral'> " + pnt.date  
				        			infoContent += "<div style=' float:right'> "+ getCommentsLable() +"  </div>"
				        		infoContent +="</div>"				        		
				        		
				        		infoContent += displayComment();					        	 
								 
					        	infoContent += "<div class='cmnt' style='display:table' >"
					        		infoContent += " <img src='/images/dp.jpg' style='width:40px;height:40px' >"
						        	infoContent += " <div style='float:right;padding-left:3px;width:200px'>"
							        	infoContent += "<textarea type='text' style='width:100%' ng-model='newComment'> </textarea> "								        	
					        			infoContent += "<input type='button' value='go' ng-click='postComment(\"" + pnt._id +"\")'> </input> "
					        		infoContent += " </div>  ";
					        	infoContent += " </div>  ";
				        	infoContent += " </div>"
				        							        
							  
							var onload = function() {
				                scope.$apply(function(){
				                	$compile(document.getElementById(markerId))(scope)
				                });
				             }

				        	infowindow.setContent(infoContent);
				        	
							google.maps.event.addListener(infowindow, 'domready', function(a,b,c,d) {
			                   onload();
			                });

				            infowindow.open(map, marker);
				        }
   			        })(marker, pnt,scope));				 					
				
				
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
			$scope.postComment=function(incidentId){
				console.log('posting');
				/*incidentDataFactory.postComment(incidentId,$scope.newComment).then(function(data){
					console.log(data);
				},function(errMsg){
					console.log(errMsg);
				});					*/		
			};
		}
	}	 
}]) 

;
