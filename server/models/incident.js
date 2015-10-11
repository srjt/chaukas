 
var mongoose = require('mongoose')
   ,Schema = mongoose.Schema;
   
 
var incidentSchema = new Schema({    
	title:String,
    loc:{
        type:{
            type:String,
            required:true,
            enum:['Point','Polygon'],
            default:'Point'
        },
        coordinates: [{type:Number}]
    },
    link:String,
    date:Date,
    address:String,
    user:{type: Schema.Types.ObjectId,ref:'User'},
    comments:[{
    	date:Date,
    	comment:String,
    	user:{type: Schema.Types.ObjectId,ref:'User'}
    }]
});

incidentSchema.index({ loc: '2dsphere' });


module.exports = mongoose.model('Incident', incidentSchema,'chaukasData');
