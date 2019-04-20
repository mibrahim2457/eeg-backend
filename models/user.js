var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var bcrypt = require('bcrypt');

SALT_WORK_FACTOR = 10;

//create a schema
var userSchema = new Schema({
    name: {type: String, required: true},
    password: {type: String, required: true},
    email: {type: String, required: true, unique: true},

    meta: {
        age:    {type: Number, required: false},
        gender: {type: String, required: false}
    },
    created_at: Date,
    updated_at: Date,
    history: [{type: Schema.Types.ObjectId, ref: 'History'}]
});

//on every save, add the date
userSchema.pre('save', function(next) {
    const user = this;

    //get current date
    var currentDate = new Date();

    //change updated_at field to current date
    this.updated_at = currentDate;
    //if created_at does exist, then add current date to it
    if(!this.created_at)
        this.created_at = currentDate;

    if(!user.isModified('password')) return next();

    //generate a salt
    var salt = bcrypt.genSaltSync(SALT_WORK_FACTOR);
    this.password = bcrypt.hashSync(this.password, salt);

    next();
});

userSchema.methods.comparePassword = function (passw, cb) {
    bcrypt.compare(passw, this.password, function(err, isMatch) {
        if (err) return cb(err, false);
        cb(null, isMatch);
    });
};

var User = mongoose.model('User', userSchema);

module.exports = User;