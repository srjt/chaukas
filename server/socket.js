module.exports=function(server){ 
	var io = require('socket.io').listen(server);

	io.sockets.on('connection', function (socket) {
		    socket.emit('message', { message: 'welcome to the chaukas' });
		    
		    socket.on('send', function (data) {
		        io.sockets.emit('message', data);
		    });

		    socket.on('addIncident', function (data, fn) {		     
		      io.sockets.emit('newIncident',data);
		      //socket.broadcast.emit('newIncident', data);
		      fn(data);		     
		  	});

		  	socket.on('addComment', function (data, fn) {	
		  	  /*console.log('adding Comment'); 
		  	  for (var i = 0; i < io.sockets.sockets.length; i++) {
		  	   	console.log(io.sockets.sockets[i].id);
		  	  }; */
		      io.sockets.emit('newComment',data);
		      //socket.broadcast.emit('newIncident', data);
		      fn(data);		     
		  	});
	});
}