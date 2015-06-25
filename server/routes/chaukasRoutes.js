(function  () {
	'use strict';
	var express=require('express'),
		router=express.Router(),		
		mongoose=require('mongoose'),		
		Schema = mongoose.Schema,
   		ObjectId = Schema.ObjectId; 
		

	mongoose.connect('mongodb://localhost/chaukasDB');
	var Incident = require('../models/incident.js');
	var rawIncident = require('../models/rawIncident.js');

	
	var socketClient = require("socket.io-client");
	var	socket=socketClient.connect('http://localhost:3000');


  


	//GET home page
	router.get('/',function  (req,res) {
		res.render('index.html');
	});

	router.get('/api/rawdata',function  (req,res) {
		rawIncident.find(function(err,rawIncidents){
			res.json(rawIncidents);
		});		 
	});
 
 	router.get('/api/incidents',function  (req,res) {
 		var fnErrorResponse=function(errMsg){
 			res.status(500).send({ error: errMsg});
			 
 		}
 		if(req.query.filter){
 			
 			var startDate, endDate;
 			if(req.query.filter=='today'){
 				startDate=	getCurrentUTCDate()  ;
 				endDate=	getTomorrowUTCDate()  ; 				 
 			}
 			else if (req.query.filter=='week'){
				startDate=	getBackUTCDate(7)  ;
 				endDate=	 getCurrentUTCDate() ;
 			}
 			else if(req.query.filter=='month'){
				startDate=  	getBackUTCDate(30);
 				endDate=	getCurrentUTCDate()  ;
 			}
 			else if(req.query.filter=='year'){
				startDate=	getBackUTCDate(365);
 				endDate=	getCurrentUTCDate()    ;
 			} 			
 			else {
 				startDate=req.query.filter.substr(0,req.query.filter.indexOf(','));
 				endDate=req.query.filter.substr(req.query.filter.indexOf(',') +1); 				
 			}
 			console.log(startDate);
 			console.log(endDate);

 			if(isNaN(Date.parse(startDate)) || isNaN(Date.parse(endDate))){
 				fnErrorResponse('invalid request');
 			}
 			else { 
				/*res.json({
 					"startDate":startDate,
 					"startDateParse":Date.parse(startDate),
 					"endDate":endDate,
 					"endDateParse":Date.parse(endDate)
 				});*/

				Incident.find({"date": {"$gte": new Date(startDate), "$lt": new Date(endDate)}},function(err,incidents){
					if(err){
 						fnErrorResponse(  err);
 					}
 					else {
 						res.json(incidents);
 					}
				});				
 				
 			}
 		}
 		else { 
 			Incident.find().sort({address:1}).exec(function(err,incidents){
 				 res.json(incidents);
 			});			
		}
	});

 	router.get('/api/incidents/:id',function  (req,res) {
 		Incident.findOne({_id:req.params.id},function(err,incident){ 			 
 			if(err){res.json(err);}
 			else{res.json(incident);}
 		}); 		
	});

	router.post('/api/incidents/:id',function   (req,res,next) {		
		Incident.findOne({_id:req.params.id},function(err, incident){
			if(incident){
				
				var updIncident={}
			 
				updIncident.comments=incident.comments;
				var newComment=req.body;
				newComment.date=getCurrentUTCDateNTime(); 
				if(updIncident.comments==undefined){
					updIncident['comments']=[];
				}
				updIncident['comments'].push(newComment);

 
				
				//socket.emit('addComment',{'incident':req.params.id,'comment':newComment},function(data){});
				//res.json(updIncident);

				Incident.update({_id:req.params.id},
					{comments:updIncident.comments},
					{multi:false},
					function(err, updatedIncident) {
						console.log(err);
						if(err){res.json(err);}
						else{
							res.writeHead(200,{
								'Content-Type':'application/json; charset=utf-8'
							});
							
							socket.emit('addComment',{'incident':req.params.id,'comment':newComment},function(data){});
							res.end(JSON.stringify(updatedIncident));
						}
				});				
			}
		});		 		 
	});


	 


	router.post('/api/auth/facebook',function(req,res,next){
		console.log(req.body);
		res.json(req.body);
	});



	function getCurrentUTCDateNTime(){
		return new Date().toISOString().
  		replace(/T/, ' ').   
  		replace(/\..+/, '') ;		 
	}
	function getCurrentUTCDate(){ 
		return new Date().toISOString().
  		replace(/T.+/, ' ').trim();
	}
	function getTomorrowUTCDate(){ 
		var d=new Date();
		d.setDate(d.getDate() +1);
		return d.toISOString().
  		replace(/T.+/, ' ').trim();
	}
	function getBackUTCDate(byDays){ 
		var d=new Date();
		d.setDate(d.getDate() - byDays);
		return d.toISOString().
  		replace(/T.+/, ' ').trim();
	}
	module.exports=router;
}());