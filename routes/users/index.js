var express = require('express');
var router = express.Router();
var mongoose = require('mongoose');
var passport = require('passport');
var config = require('../../config/database');
require('../../config/passport')(passport);
var jwt = require('jsonwebtoken');
var User = require("../../models/user");
const sendmail = require('sendmail')();
var nodemailer = require('nodemailer');
var generator = require('generate-password');
var bcrypt = require('bcrypt');
var HTTPStatus = require('http-status');


var transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'eeganalyzer@gmail.com',
        pass: 'eeg@1234'
    }
});

router.post('/', function(req, res, next) {
    var newUser = User({
        name: req.body.userName,
        password: req.body.userPassword,
        email: req.body.userEmail,
        meta: {
            age: '',
            gender: ''
        }
    });
    console.log(newUser);
    newUser.save(function(err) {
        if(err) {
            console.log(err.message);
            res.status(400).send(err.message);
        }
        else {
            console.log("Users Created.....");
            var payload = {id: newUser.id};
            var token = jwt.sign(payload, config.secret,{expiresIn: 432000});
            var user = newUser;
            user.password = '';
            res.json({success: true, token: 'JWT' + token, user: user});
        }
    })
});

router.post('/recover', function(req, res, next) {
    console.log(req.body);
    User.findOne({
        email: req.body.email
    }, function(err, user) {
        if (err) throw err;
        if(!user) {
            res.status(401).send({success: false, msg: 'Authentication Failed. User NOT FOUND.', isUserFound: false});
        }
        else {
            var password = generator.generate({
                length: 8,
                numbers: true
            });
            user.password = password;

            user.save(function (err) {
                if (err) {
                    console.log(err.message);
                    res.status(400).send(err.message);
                }
                else {
                    var mailOption = {
                        from: 'eeganalyzer.com <eeganalyzer@gmail.com>',
                        sender: 'eeganalyzer.com <eeganalyzer@gmail.com>',

                        to: user.email,
                        subject: 'Recover Password',
                        html: '<p>Use this password to login. After login, please change password that you can remember.</p><p><b>Password: </b>'+password+'</p>'
                    };
                    transporter.sendMail(mailOption, function(error, info){
                        if (error) {
                            console.log(error);
                            res.status(HTTPStatus.INTERNAL_SERVER_ERROR).send({success: false, msg: error, isUserFound: true});
                        }
                        else {
                            console.log('Email Sent: '+info.response);
                            res.status(200).json({success: true, msg: info.response});
                        }
                    });
                }
            });
        }
    });
});

router.get('/', passport.authenticate('jwt', {session: false}), function (req, res, next) {
    if (req.jwt_token) {
        User.find({}, function(err, users) {
            if (err) res.send(err);
            else res.send(users);
        });
    }
    else {
        return res.status(403).send({success: false, msg: 'Unauthorized. 3'});
    }
});

router.put('/:id', passport.authenticate('jwt', {session: false}), function (req, res, next) {
    console.log("Token:    " + req.jwt_token);
    if (req.jwt_token) {
        console.log(req.params);

        User.findById(req.params.id, function(err, user) {
            if (err) res.status(401).send(err);
            else {
                console.log("Gender:  " + req.body.meta.gender);
                user.meta.age=req.body.meta.age;
                user.meta.gender=req.body.meta.gender;
                console.log("User:   " + user.meta.gender);

                user.save(function(err) {
                    if (err) res.status(401).send(err);
                    else res.json({message: 'User\'s Meta Updated...!'});
                });
            }
            // console.log("Hello..........!");
        });
    }
    else {
        return res.status(403).send({success: true, msg: 'Unauthorized. 2'});
    }
});

router.put('/password/:id', passport.authenticate('jwt', {session: false}), function (req, res, next) {
    if (req.jwt_token) {
        console.log(req.params);

        User.findById(req.params.id, function(err, user) {
            if (err) {
                res.status(401).send(err);
                alert(err);
                console.log(err);
            }  
            else {
                user.comparePassword(req.body.currPassword, function (err, isMatch) {
                    if (isMatch && !err) {
                        user.password=req.body.newPassword;
                        user.save(function(err) {
                            if (err) return res.status(401).send(err);
                            else res.json({message: 'User\'s Password Updated...!'});
                        });
                    }
                    else {
                        res.status(401).send({success: false, msg: 'Wrong Current Password.', isPasswordCorrect: false, isUserFound: true});
                    }
                });
            }
        });
    }
    else {
        return res.status(403).send({success: false, msg: 'Unauthorized 1.'});
    }
});

router.post('/login', function(req, res, next) {
    console.log(req.body);
    User.findOne({
        email: req.body.email
    }, function(err, user) {
        if (err) throw err;
        if (!user) {
            res.status(401).send({success: false, msg: 'Authentication Failed. User NOT FOUND...!', isUserFound: false});
        }
        else {
            console.log(user);
            user.comparePassword(req.body.password, function (err, isMatch) {
                if (isMatch && !err) {
                    var payload = {id: user.id};
                    var token = jwt.sign(payload, config.secret);
                    var newUser = user;
                    newUser.password =  '';
                    console.log("Token 1:    " + token);

                    res.status(200).json({success: true, token: 'JWT '+token, user: newUser});
                }
                else {
                    res.status(401).send({success: false, msg: 'Authentication Failed. Wrong Password.', isPasswordCorrect: false, isUserFound: true});
                }
            });
        }
    });
});

getToken = function(headers) {
    if (headers && headers.authorization) {
        var parted = headers.authorization.split(' ');

        if (parted.length == 2) {
            return parted[1];
        }
        else {
            return null;
        }
    }
    else {
        return null;
    }
};

module.exports=router;