var express = require('express');
var router = express.Router();
var User = require("../../models/user");
var UserHistory=require('../../models/history');
var passport = require('passport');
var config = require('../../config/database');
require('../../config/passport')(passport);
var jwt = require('jsonwebtoken');
var mongoosePaginate = require('mongoose-paginate');
var dateFormat = require('dateformat');
var uploadDir='./uploads/';
var path = require('path');

router.get('/user/:id', passport.authenticate('jwt', { session: false}),function (req,res,next) {
    
    console.log(req.query);
    if (req.jwt_token) {
        var page = parseInt(req.query.page); //either a value or undefined
        var limit = parseInt(req.query.limit);
        var offset = req.query.offset;

        var query   = {user:req.params.id};
        console.log(limit);
        var options = {
            sort:     { created: -1 },
            
            offset: (page*limit),
            limit:    limit
        };
        UserHistory.paginate(query,options, function(err, result) {
            console.log(err,result.docs);
            if (err) res.send(err);
            else
                res.send(result);
        });
    } else {
        return res.status(403).send({success: false, msg: 'Unauthorized. 6'});
    }
});

router.get('/data/recordings/:fileName', function(req, res) {
    console.log(req);
    res.sendFile(path.resolve(uploadDir,req.params.fileName))
});
module.exports = router;