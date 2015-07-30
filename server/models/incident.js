 
var mongoose = require('mongoose')
   ,Schema = mongoose.Schema;
   
 
var incidentSchema = new Schema({    
	title:String,
    longitude: {type:Number , default: 0},
    latitude: {type: Number, default:0},
    link:String,
    date:Date,
    address:String,
    comments:[{
    	date:Date,
    	comment:String,
    	user:{type: Schema.Types.ObjectId,ref:'User'}
    }]
});
 
module.exports = mongoose.model('Incident', incidentSchema,'chaukasData');
