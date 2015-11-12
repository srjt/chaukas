 
var mongoose = require('mongoose')
   ,Schema = mongoose.Schema;
   
 
var rawIncidentSchema = new Schema({    
	title:String, 
    uri:String,
    date:String,
    date_utc:Date,
    locations:Array,
    geocoded:Boolean,
    address:String,
    source:String,
    words:Array,
    city:String
});
 
module.exports = mongoose.model('RawIncident', rawIncidentSchema,'chaukasCrawledData');