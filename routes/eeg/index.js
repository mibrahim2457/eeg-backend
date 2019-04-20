var express = require('express');
var router = express.Router();
var PythonShell = require('python-shell');
var path = require('path');
var multer = require('multer');
var uploadDir='./uploads/';
var tempDir='./Temp/';
var passport = require('passport');
var config = require('../../config/database');
require('../../config/passport')(passport);
var jwt = require('jsonwebtoken');
var HTTPStatus = require('http-status');
var fs = require('fs');
var User = require("../../models/user");
var UserHistory=require('../../models/history');
const { spawn } = require('child_process');

var storage = multer.diskStorage({
    destination: function(req, file, callback) {
        callback(null, uploadDir)
    },
    filename: function(req, file, callback) {
        console.log(file);
        callback(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname))
    }
});


var PyShellOptions ={};
var sample_rate;
var signal_file;

router.post('/:id', passport.authenticate('jwt', {session: false}), function(req, res, next) {
    console.log(req.body);
    if (req.jwt_token) {
        var upload = multer({
            storage: storage,
            fileFilter: function(req, file, callback) {
                var ext = path.extname(file.originalname);
                if (ext !== '.csv') {
                    return callback(res.status(406).end('Only .csv files are allowed'), null)
                }
                callback(null, true)
            }
        }).single('eegFile');
        upload(req, res, function(err) {
            if(err) {
                return res.end('Error while uploading file...!');
            }
            console.log(req.body);

            //Executing Python Code/Script
            sample_rate = req.body.sampleRate;
            console.log("Sample_Rate:   " + sample_rate);
            signal_file = path.resolve(req.file.path);
            console.log("Signal File:   " + signal_file);

            User.findById(req.params.id, function(err, user) {
                if (err) {
                    // console.log("EEG Error......!!");
                    res.status(401).end(err);

                }
                else {
                    PyShellOptions = {
                        mode: 'JSON',
                        pythonOptions: ['-u'],
                        scriptPath: 'F:/University/Final Year/FYP/EEG/EEG-Diagnosis(Python)', //Python Code Folder
                        args: [signal_file, sample_rate, user.meta.age, user.meta.gender]
                    };
                    //Executing Python Code/Script
                    console.log(user.meta.age);
                    console.log(user.meta.gender);

                    try {
                        var spawn = require('child_process').spawn,
                        main  = spawn('python', ['F:/University/Final Year/FYP/EEG/EEG-Diagnosis(Python)/main.py',
                        signal_file, sample_rate, user.meta.age, user.meta.gender]);

                        let count = 1;
                        let results
                        main.stdout.on('data', function(data) {
                                count++;
                                //console.log(data.toString());

                                results = data.toString();
                                
                                //console.log(results);
                                
                                console.log("Count:   " + count);
                                
                                console.log("Inside Data......");
                                //results = data.toString();
                                //console.log("Data Type:     " + typeof(data));

                                if (count === 2) {
                                    if (results) {
                                        console.log("Inside.....2");
                                        //results = JSON.stringify(results);
                                        results = JSON.parse(results);
                                        
                                        console.log("JSON Error: " + JSON.error);
                                        console.log("Results1:     " + results);
                                        console.log("Results:   " + results.isEpilepsy);
                                        console.log("Results Type:   " + typeof(results));
            
                                        var userHistory=new UserHistory({
                                            
                                            //console.log("Inside.......3");
                                            user:user._id,
                                            age:user.meta.age,
                                            isEpilepsy:results.isEpilepsy,
                                            eeg:{
                                                signal:path.basename(signal_file),
                                                sample_rate:sample_rate
                                            }
                                        });
                                        userHistory.save(function (err) {
                                            if (err) console.log(err);
                                            else console.log("User History Saved......");
                                        });
                                        console.log("Hello...");
                                        return res.send(results)
                                    }
                                    else {
                                        fs.stat(signal_file, function (err, stats) {
                                            console.log(stats);//here we got all information of file in stats variable
            
                                            if (err) {
                                                console.error(err);
                                            }
                                            else {
                                                fs.unlink(signal_file, function (err) {
                                                    if (err) console.log(err);
                                                    else console.log('file deleted successfully');
                                                });
                                            }
                                        });
                                        return res.status(HTTPStatus.INTERNAL_SERVER_ERROR).send('Something bad happened1');
                                    }
                                } 

                            });
                        
                        /*PythonShell.run('main.py', PyShellOptions, function (err, results) {
                            console.log("Inside Python Shell......1");
                            if (err) {
                                // throw err;
                                console.log("Inside Python Shell......2");
                                 console.log("Error2:    " + err.message);
                            }

                            console.log("Results Type:   " + typeof(results));
                            console.log('results: %j', results);
                            if (results) {
                                console.log("Inside Python Shell......3");
                                var UserHistory = new UserHistory({
                                    user: user._id,
                                    age: user.meta.age,
                                    isEpilepsy: results[0].isEpilepsy,
                                    eeg: {
                                        signal: path.basename(signal_file),
                                        sample_rate: sample_rate
                                    }
                                });
                                UserHistory.save(function (err) {
                                    if (err) console.log(err);
                                });
                                res.send(results[0]);
                            }
                            else {
                                fs.stat(signal_file,function (err, stats) {
                                    console.log(stats);

                                    if (err) {
                                        console.error(err);
                                    }
                                    else {
                                        fs.unlink(signal_file, function(err) {
                                            if (err) console.log(err);
                                            else console.log('File Deleted Successfully...!');
                                        });
                                    }
                                });
                                res.status(HTTPStatus.INTERNAL_SERVER_ERROR).send('Something Bad Happened...!');
                            }
                        });*/
                        
                    }catch (err){
                        return res.end("Error while Executing Python Code/Script.....!");
                    }
                }
            });
        });
    }
    else {
        return res.status(403).send({success: false, msg: 'Unauthorized. 5'});
    }
});

router.get('/', passport.authenticate('jwt', {session: false}), function(req, res, next) {
    console.log(req.query);
    if (req.jwt_token) {
        var userId = req.query.userId;
        var recordId = req.query.recordId;

        UserHistory.findOne({_id: recordId}).populate('user').exec(function (err, record) {
            if (err) res.end(err);
            var user = record.user;

            if (userId == user._id) {
                sample_rate = record.eeg.sample_rate;
                signal_file = path.resolve(uploadDir + record.eeg.signal);
                console.log(sample_rate);
                console.log(signal_file);

                PyShellOptions = {
                    mode: 'json',
                    pythonOptions: ['-u'],
                    scriptPath: 'F:/University/Final Year/FYP/EEG/EEG-Diagnosis(Python)', //Python Code Folder
                    args: [signal_file, sample_rate, user.meta.age, user.meta.gender]
                };
                ///Executing Python Code/Script
                try {
                    PythonShell.run('main.py', PyShellOptions, function (err, results) {
                        console.log("Get Request Inside Python Shell........");
                        if (err) {
                            console.log("Error.......");
                            console.log(err.message);
                        }
                        console.log('results: %j', results);
                        if (results) {
                            
                            res.send(results[0]);
                        }
                        else {
                            fs.stat(signal_file,function (err, stats) {
                                console.log(stats);

                                if (err) {
                                    console.error(err);
                                }
                                else {
                                    fs.unlink(signal_file, function(err) {
                                        if (err) console.log(err);
                                        else console.log('File Deleted Successfully...!');
                                    });
                                }
                            });
                            res.status(HTTPStatus.INTERNAL_SERVER_ERROR).send('Something Bad Happened...!');
                        }
                    });
                }
                catch (err){
                    return res.end("Error while Executing Python Code/Script.....!");
                }
            }
        });
    }
    else {
        return res.status(403).send({success: false, msg: 'Unauthorized. 4'});
    }
});

router.ws('/echo', function(ws, req) {
    ws.on('message', function(msg) {
        ws.send(msg);
    });
});

router.get('data/recordings/:fileName', function(req, res) {
    res.sendFile(path.resolve(tempDir, req.params.fileName))
});

module.exports = router;