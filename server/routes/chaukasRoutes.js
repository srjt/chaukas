(function  () {
	'use strict';
	var express=require('express'),
		router=express.Router(),
		mongojs=require('mongojs'),
		ObjectId = mongojs.ObjectId,
		 
		db=mongojs('chaukasDB',['chaukasCrawledData','chaukasData']);
	
	var socketClient = require("socket.io-client");
	var	socket=socketClient.connect('http://localhost:3000');
		 
	//GET home page
	router.get('/',function  (req,res) {
		res.render('index.html');
	});

	router.get('/api/rawdata',function  (req,res) {
		db.chaukasCrawledData.find(function  (err,data) {
			 res.json(data);
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
 				db.chaukasData.find({"date": {"$gte": new Date(startDate), "$lt": new Date(endDate)}}).sort({address:1},function(err,data){
 					console.log(new Date(startDate));
 					if(err){
 						fnErrorResponse(  err);

 					}
 					else {
 						res.json(data);
 					}
 				});
 				
 			}
 		}
 		else { 
			db.chaukasData.find( ).sort({address:1},function  (err,data) {
				 res.json(data);
			});	
		}
	});

 	router.get('/api/incidents/:id',function  (req,res) {
		db.chaukasData.findOne({
			_id:ObjectId(req.params.id)
		} ,function  (err,data) {
			if(err){res.json(err)}
			else{res.json(data);}
		});	
	});

	router.post('/api/incidents/:id',function   (req,res,next) {
		//res.json(req.params);
		db.chaukasData.findOne({
			_id:ObjectId(req.params.id)
		},function  (err,data) {
			
			if(data){ 
				var updIncident={};
				for(var n in data){
					updIncident[n]=data[n];	
				}
				
				var newComment=req.body;
				newComment.date=getCurrentUTCDateNTime(); 
				if(updIncident.comments==undefined){
					updIncident['comments']=[];
				}
				updIncident['comments'].push(newComment);

				//socket.emit('addComment',{'incident':req.params.id,'comment':newComment},function(data){});
				//res.json(updIncident);

				db.chaukasData.update({
					_id:ObjectId(req.params.id)
				},updIncident,{
					multi:false
				},function  (err,data) {
					res.writeHead(200,{
						'Content-Type':'application/json; charset=utf-8'
					});
					socket.emit('addComment',{'incident':req.params.id,'comment':newComment},function(data){});
					res.end(JSON.stringify(data));
				});
			}
		});		 
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