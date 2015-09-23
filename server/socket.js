module.exports=function(server){ 
	var io = require('socket.io').listen(server);
	 

	io.sockets.on('connection', function (socket) {
			// Heroku won't actually allow us to use WebSockets
			// so we have to setup polling instead.
			// https://devcenter.heroku.com/articles/using-socket-io-with-node-js-on-heroku
			
			io.set('transports', ['websocket', 
      'flashsocket', 
      'htmlfile', 
      'xhr-polling', 
      'jsonp-polling', 
      'polling']);
  			//io.set("polling duration", 1);
		    
		    socket.emit('message', { message: 'welcome to the chaukas' });
		    
		    socket.on('send', function (data) {
		        io.sockets.emit('message', data);
		    });

		    socket.on('addIncident', function (data, fn) {	
		    	console.log('adding incident'); 	     
		      io.sockets.emit('newIncident',data);
		      //socket.broadcast.emit('newIncident', data);
		      fn(data);		     
		  	});

		  	socket.on('addComment', function (data, fn) {	
		  	  /*console.log('adding Comment'); 
		  	  for (var i = 0; i < io.sockets.sockets.length; i++) {
		  	   	console.log(io.sockets.sockets[i].id);
		  	  }; */

		  	  console.log('emmitting newComment');
		      io.sockets.emit('newComment',data);
		      //socket.broadcast.emit('newIncident', data);
		      fn(data);		     
		  	});
	});
}
