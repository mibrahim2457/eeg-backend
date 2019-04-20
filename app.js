var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var fs = require('fs');
var passport = require('passport');
var config = require('./config/database');
var expressWs = require('express-ws')(express());
var app = expressWs.app;
require('./config/passport')(passport);
var jwt = require('jsonwebtoken');
var pause = require('connect-pause');

//set up mongoose connect
var mongoose = require('mongoose');
var mongoDB = config.database;
mongoose.connect(mongoDB, {
    useMongoClient: true
});
var db = mongoose.connection;
db.on('error', console.error.bind(console, 'MongoDB Connection Error'));

app.listen(3000, function() {
    console.log('Server is running at port: '+3000);
});

////////////// Routes /////////////////
var index = require('./routes/index');
var eeg=require('./routes/eeg/index');
var user=require('./routes/users/index');
var history=require('./routes/eeg/history');

app.use(passport.initialize());

var cors = require('cors');
//create a cors middleware
app.use(function(req, res, next) {
//set headers to allow cross origin request.
    res.header("Access-Control-Allow-Origin", "*");
    res.header('Access-Control-Allow-Methods', 'PUT, GET, POST, DELETE, OPTIONS');
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
});

app.use(cors());

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

app.use(logger('dev'));
app.use(bodyParser.json({limit:'50mb'}));
app.use(bodyParser.urlencoded({extended:false, limit:'50mb'}));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, '/public')));

app.use(pause(500));/////delay every request 2s for network latency simulation

app.use(function (req, res, next) {
    console.log('middleware');
    req.jwt_token = getToken(req.headers);
    // console.log(req.jwt_token);
    next();
});

getToken = function (headers) {
    if (headers && headers.authorization) {
        var parted = headers.authorization.split(' ');
        // console.log(parted);

        if (parted.length == 2) {
            return parted[1];
        } else {
            return null;
        }
    } else {
        return null;
    }
};

/////// Sending Request to Routes //////
app.use('/', index);
app.use('/eeg',eeg);
app.use('/users',user);
app.use('/history',history);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handler
app.use(function(err, req, res, next) {
    // set locals, only providing error in development
    res.locals.message = err.message;
    res.locals.error = req.app.get('env') === 'development' ? err : {};
  
    // render the error page
    res.status(err.status || 500);
    res.render('error');
  });

  module.exports = {app:app,expressWs:expressWs};
