(function  () {
	'use strict';
	var express=require('express'),
		router=express.Router(),

		mongoose=require('mongoose'),		
		Schema = mongoose.Schema,
   		ObjectId = Schema.ObjectId,

   		jwt = require('jwt-simple'),
   		moment = require('moment'),
   		config = require('../config'),
		request = require('request'),
		//metaInspector=require('node-metainspector'),
		
		User = require('../models/user.js'),
		Incident = require('../models/incident.js'),
		rawIncident = require('../models/rawIncident.js'),
		
		socketClient = require("socket.io-client"),
		socket=socketClient.connect(process.env.SERVER_URI ||  'http://localhost:3000');

	mongoose.connect(process.env.MONGOLAB_URI || 'mongodb://localhost/chaukasDB');
	

 	router.get('/',function  (req,res) {
		res.render('index.html');
	});
	router.get('/api/rawdata/:city',function  (req,res) {
		rawIncident.find({'city':req.params.city},function(err,rawIncidents){
			res.json(rawIncidents);
		});		 
	});
 	router.get('/api/incidents/nearby/:latitude/:longitude',function  (req,res) { 
		Incident.find({loc:  { '$geoWithin' :{'$box':[[77.21058524002228,28.626518378657526],[77.23989642013703,28.638308247875997]] }}})
				.limit(20)
				.populate('user')
				.exec(function(err,incident){ 				    			 
	 				if(err){
	 					fnErrorResponse(res,  err);
	 				}
	 				else{
	 					 
	 					res.json(incident);
	 				}
 				});
 	});  	 	
 	router.get('/api/incidents',function  (req,res) { 		 		
 		var startDate, endDate,swLng,swLat,neLng,neLat;
 		if(req.query.sw){ 
			swLng=req.query.sw.substr(0,req.query.sw.indexOf(','));
			swLat=req.query.sw.substr(req.query.sw.indexOf(',') + 1 );
		}
		if(req.query.ne) {
 			neLng=req.query.ne.substr(0,req.query.ne.indexOf(','));
			neLat=req.query.ne.substr(req.query.ne.indexOf(',') + 1);
 		}
 		if(req.query.filter) {	
 			startDate=req.query.filter.substr(0,req.query.filter.indexOf(','));
 			endDate=req.query.filter.substr(req.query.filter.indexOf(',') +1); 	 			 
 		}
		console.log(startDate);
		console.log(endDate);
		console.log(swLng + ' ' + swLat + ' ' + neLng + ' ' + neLat);
	
		var query={};
		if(!isNaN(Date.parse(startDate)) && !isNaN(Date.parse(endDate))){
			query.date={
				"$gte":new Date(startDate),
				"$lt" : new Date(endDate)
			}
		}
		if(swLng && swLng>=0 && swLat && swLat>=0 && neLng && neLng>=0 && neLat && neLat>=0){
			query.loc={
				"$geoWithin":{
					"$box":[
							[ parseFloat(  swLng),parseFloat( swLat)],
							[ parseFloat(  neLng),parseFloat( neLat)]
						   ]
				}
			}
		}  

		console.log(query);

		Incident.find(query)
				.populate('user')
				.exec(function(err,incident){
					if(err){ 
						fnErrorResponse(res,err);
					}
					else {
						console.log('responded');
						res.json(incident);
					}
				});       		 
	});
 	router.get('/api/incidents/:id',function  (req,res) {
 		Incident.findOne({_id:req.params.id}) 	
 		.populate('user')
 		.populate('comments.user').exec(function(err,incident){ 			 
 			if(err){res.json(err);}
 			else{res.json(incident);}
 		}); 		
	});
 	router.post('/api/incident',function(req,res,next){
	    var incident = new Incident({
	    	link:req.body.link,
			title: req.body.title,
			desc:req.body.desc,
			loc:req.body.loc,
			loc_type:'ROOFTOP',
			address:req.body.address,
			user:req.body.user,
			date:getCurrentUTCDate()
	    });
	    incident.save(function() {	  
	    	socket.emit('addIncident',{'incident': incident},function(data){});  	 
	      	res.send({ 'incident': incident });
	    }); 		 
 	});
	router.post('/api/incident/:id',function   (req,res,next) {
		Incident.findOne({_id:req.params.id},function(err, incident){
			if(incident){
				var updIncident={};			 
				updIncident.comments=incident.comments;
				var newComment=req.body;

				newComment.date=getCurrentUTCDateNTime(); 
				if(updIncident.comments==undefined){
					updIncident['comments']=[];
				}
				console.log(newComment);
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
							console.log('emitting addComment' );
							socket.emit('addComment',{'incident':req.params.id,'comment':newComment},function(data){});
							res.end(JSON.stringify(updatedIncident));
						}
				});				
			}
		});		 		 
	});
	router.put('/api/incident/:id',function   (req,res,next) {
		console.log(req.params.id);
		Incident.remove({_id:req.params.id},function(err){
			console.log('removed');
			console.log(err);
			if (!err) {
		        res.status(200).send();
		    }
		    else {
		    	fnErrorResponse(err);         
		    }
		});		 		 
	});	  
	
	router.post('/api/auth/facebook', function(req, res) {
		var accessTokenUrl = 'https://graph.facebook.com/v2.3/oauth/access_token';
		var graphApiUrl = 'https://graph.facebook.com/v2.3/me';
		var params = {
		code: req.body.code,
		client_id: req.body.clientId,
		client_secret: config.FACEBOOK_SECRET,
		redirect_uri: req.body.redirectUri
		};
	 
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
	          			} else{
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

	/*router.get('/api/utils/linkinfo',function(req,res){		
		var client = new metaInspector(req.query.lnk, { timeout: 5000 });
		client.on("fetch", function(){ 			
 			res.json({
				title:client.title,
				description:client.description
			});
		});
		client.on("error", function(err){
		    console.log(error);
		});

		client.fetch();
	});*/

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