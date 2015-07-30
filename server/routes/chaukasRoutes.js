(function  () {
	'use strict';
	var express=require('express'),
		router=express.Router(),		
		mongoose=require('mongoose'),		
		Schema = mongoose.Schema,
   		ObjectId = Schema.ObjectId,
   		jwt = require('jwt-simple'),
   		moment = require('moment'); 
		

	mongoose.connect('mongodb://localhost/chaukasDB');
	var User = require('../models/user.js');
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
 				fnErrorResponse(res,'invalid request');
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
 						fnErrorResponse(res,  err);
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
 		Incident.findOne({_id:req.params.id})
 		.populate('comments.user').exec(function(err,incident){ 			 
 			if(err){res.json(err);}
 			else{res.json(incident);}
 		}); 		
	});

	router.post('/api/incidents/:id',function   (req,res,next) {		
		Incident.findOne({_id:req.params.id},function(err, incident){
			if(incident){				
				var updIncident={};			 
				updIncident.comments=incident.comments;
				var newComment=req.body;

				newComment.date=getCurrentUTCDateNTime(); 
				if(updIncident.comments==undefined){
					updIncident['comments']=[];
				}console.log(newComment);
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


	 

	/*
	 |--------------------------------------------------------------------------
	 | Log in with Email
	 |--------------------------------------------------------------------------
	 */
	router.post('/auth/login', function(req, res) {
	  User.findOne({ email: req.body.email }, '+password', function(err, user) {
	    if (!user) {
	      return res.status(401).send({ message: 'Wrong email and/or password' });
	    }
	    user.comparePassword(req.body.password, function(err, isMatch) {
	      if (!isMatch) {
	        return res.status(401).send({ message: 'Wrong email and/or password' });
	      }
	      else{
	      	returnUserToken(res,user);
	      	//res.send({ token: createJWT(user) });
	      }
	    });
	  });
	});
	/*
	 |--------------------------------------------------------------------------
	 | Login with Facebook
	 |--------------------------------------------------------------------------
	 */
 	var config = require('../config');
	
	var request = require('request');

	router.post('/api/auth/facebook', function(req, res) {
	  var accessTokenUrl = 'https://graph.facebook.com/v2.3/oauth/access_token';
	  var graphApiUrl = 'https://graph.facebook.com/v2.3/me';
	  var params = {
	    code: req.body.code,
	    client_id: req.body.clientId,
	    client_secret: config.FACEBOOK_SECRET,
	    redirect_uri: req.body.redirectUri
	  };
console.log('Step 1');
	  // Step 1. Exchange authorization code for access token.
	  request.get({ url: accessTokenUrl, qs: params, json: true }, function(err, response, accessToken) {
	    if (response.statusCode !== 200) {
	      return res.status(500).send({ message: accessToken.error.message });
	    }
console.log('Step 2');
	    // Step 2. Retrieve profile information about the current user.
	    request.get({ url: graphApiUrl, qs: accessToken, json: true }, function(err, response, profile) {
	      if (response.statusCode !== 200) {
	        return res.status(500).send({ message: profile.error.message });
	      }
console.log('Step 3a');	      
	      if (req.headers.authorization) {
	      	console.log('Step 3a1 ' +profile.id);	
	        User.findOne({ facebook: profile.id }, function(err, existingUser) {
	          if (existingUser) {
	            //return res.status(409).send({ message: 'There is already a Facebook account that belongs to you' });
	           	returnUserToken(res,existingUser);

	          }
	          else {
		          var token = req.headers.authorization.split(' ')[1];
		          var payload = jwt.decode(token, config.TOKEN_SECRET);
		          console.log('Step 3a2 ' + payload.sub);
		          User.findById(payload.sub, function(err, user) {	          	
		            if (!user) {
		             // return res.status(400).send({ message: 'User not found' });
		             user=new User();
		            }
		            user.email=profile.email;
		            user.facebook = profile.id;
		            user.picture = user.picture || 'https://graph.facebook.com/v2.3/' + profile.id + '/picture?type=large';
		            user.displayName = user.displayName || profile.name;
		            console.log('Step 3a3 Saving user ' + user.displayName);
		            user.save(function(err, savedUser) {
		              console.log('Step 3a4' );
			          	if(err){
			          		fnErrorResponse(res,err);
			          	}
			          	else{ 
			          		returnUserToken(res,savedUser);
			          	}
		            });
		          });
		      }
	        });
	      } else {
console.log('Step 3b');	      	
	        // Step 3b. Create a new user account or return an existing one.
	        User.findOne({ facebook: profile.id }, function(err, existingUser) {
	        	if(err){
	        		fnErrorResponse(res,err);
	        	}
	          	if (existingUser) {	 
	          		console.log('Step 3b1');	         	
	            	returnUserToken(res,existingUser);
	          	}else{
			        var user = new User();
			        user.email=profile.email;
			        user.facebook = profile.id;
			        user.picture = 'https://graph.facebook.com/' + profile.id + '/picture?type=large';
			        user.displayName = profile.name;
			        console.log('saving ' + user.displayName);
			        user.save(function(err,savedUser) {
				        if(err){
				        	fnErrorResponse(res,err);
				        }
				        else{ 
				        	returnUserToken(res,savedUser);
				        }
			    	});
	      		}
	        });
	      }
	    });
	  });
	});

	/*
	 |--------------------------------------------------------------------------
	 | Create Email and Password Account
	 |--------------------------------------------------------------------------
	 */
	router.post('/auth/signup', function(req, res) {
	  User.findOne({ email: req.body.email }, function(err, existingUser) {
	    if (existingUser) {
	      return res.status(409).send({ message: 'Email is already taken' });
	    }
	    var user = new User({
	      displayName: req.body.displayName,
	      email: req.body.email,
	      password: req.body.password
	    });
	    user.save(function() {
	    	returnUserToken(res,user);
	      //res.send({ token: createJWT(user) });
	    });
	  });
	});



	function createJWT(user) {
	  var payload = {
	    sub: user._id,
	    iat: moment().unix(),
	    exp: moment().add(14, 'days').unix()
	  };
	  return jwt.encode(payload, config.TOKEN_SECRET);
	}

	var fnErrorResponse=function(res,errMsg){
		console.log(errMsg);
		res.status(500).send({ error: errMsg});			 
	}

	function returnUserToken(res,user){
		if(!user.email){fnErrorResponse(res,'invalid user');}
		else{
			console.log('returning User: ' + user.email);
			var token = createJWT(user);
			res.send({user:user, token: token });
		}
	}




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