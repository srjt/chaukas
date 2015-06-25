(function () {
	'use strict';

	var express=require('express'),
		path=require('path'),
		logger=require('morgan'),
		cookieParser=require('cookie-parser'),
		bodyParser=require('body-parser'),
		sassMiddleware = require('node-sass-middleware');

	
	
	var routes=require('./routes/chaukasRoutes');
    
	var app=express();


	//view engine setup
	app.set('views',path.join(__dirname,'views'));
	app.engine('html',require('ejs').renderFile);
	app.set('view engine','html');

	app.use(logger('dev'));
	app.use(bodyParser.json());
	app.use(bodyParser.urlencoded({
		extended:true
	}));
	app.use(cookieParser());

	app.use(sassMiddleware({
	    src: path.join(__dirname, '../client'),
	    dest: path.join(__dirname, '../client'),
	    debug: true,
	    outputStyle: 'compressed',
	    prefix:  '/prefix'
	}));

	app.use(express.static(path.join(__dirname,'../client')));
	
	app.use('/',routes);
	

	app.set('port',process.env.PORT || 3000);

	var server =app.listen(app.get('port'))
	
	var io=	require('./socket')(server);


	module.exports=app;

}());