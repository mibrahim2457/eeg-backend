var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var User = require("./user");
var mongoosePaginate = require('mongoose-paginate');

//create history schema
var historySchema = new Schema({
    user: {type: Schema.Types.ObjectId, ref: 'User', required: true},
    eeg: {
        signal: {type: String, required: true},
        sample_rate: {type: String, required: true},
    },
    age: {type: Number, required: false},
    isEpilepsy: {type: Boolean, required: false},
    created: Date
});

//on every save, add the date
historySchema.pre('save', function(next) {
    //get current date
    this.created = new Date();
    next();
});

historySchema.plugin(mongoosePaginate);
var History = mongoose.model('History', historySchema);

module.exports = History;