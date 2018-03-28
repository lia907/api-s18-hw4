var express = require('express');
var bodyParser = require('body-parser');
var passport = require('passport');
var authJwtController = require('./auth_jwt');
var User = require('./user');
var jwt = require('jsonwebtoken');
var Movie = require('./movie');
var dotenv = require('dotenv').config();
var mongoose = require('mongoose');

mongoose.connect(process.env.mongoDB, (err, database) => {
    if(err) throw err;
    console.log('Connected to database.');
    db = database;
    console.log('Database connected on ' + process.env.mongoDB);
});

var app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

app.use(passport.initialize());

var router = express.Router();

router.route('/movies/view/:title')
    .get(authJwtController.isAuthenticated, function (req, res) {
        var title = req.params.title;
        Movie.findOne({title: title}, function(err, movie) {
            if (err) res.send(err);

            var movieJson = JSON.stringify(movie);
            res.json(movie);
        });
    });

router.route('/movies/viewall')
    .get(authJwtController.isAuthenticated, function (req, res) {
        Movie.find(function (err, movie) {
            if (err) res.send(err);
            res.json(movie);
        });
    });

router.route('/movies/insert')
    .post(authJwtController.isAuthenticated, function (req, res) {
        Movie.findOne({title: req.body.title}).exec(function(err, movie){
            if (movie === null){
                var newMovie = new Movie(req, res);
                newMovie.title = req.body.title;
                newMovie.year = req.body.year;
                newMovie.genre = req.body.genre;
                newMovie.actors = req.body.actors;
                newMovie.save(function(err) {
                    if (err) {
                        // duplicate entry
                        if (err.code == 11000)
                            return res.json({ success: false, msg: 'Movie already in database.'});
                        else
                            return res.send(err);
                    }

                    res.json({ msg: 'Movie insert success.' });
                });
            }
            else{
                res.json({ msg: 'Movie already in database.'});
            }
        });
    });

router.route('/movies/update/:title')
    .put(authJwtController.isAuthenticated, function (req, res) {
        Movie.findOne({title: req.params.title}).exec(function(err, movie) {
            if (movie !== null) {
                movie.title = req.body.title;
                movie.year = req.body.year;
                movie.genre = req.body.genre;
                movie.actors = req.body.actors;
                movie.save(function(err) {
                    if (err) {
                        // duplicate entry
                        if (err.code == 11000)
                            return res.json({ success: false, msg: 'Movie already exists in database.'});
                        else
                            return res.send(err);
                    }
                    res.json({ msg: 'Movie update success.' });
                });
            }
            else
            {
                res.json({ msg: 'Movie update failed. Movie does not exist in database.' });
            }
        });
    });

router.route('/movies/delete/:title')
    .delete(authJwtController.isAuthenticated, function(req, res){
        Movie.remove({title: req.params.title}, function(err, movie){
            if (err) return res.send(err);

            res.json({msg: 'Movie delete successful.'});
        });
    });

router.post('/signup', function(req, res) {
    if (!req.body.username || !req.body.fullname || !req.body.password) {
        res.json({success: false, msg: 'Please pass username, fullname, and password.'});
    }
    else {
        var user = new User();
        user.username = req.body.username;
        user.fullname = req.body.fullname;
        user.password = req.body.password;

        user.save(function(err) {
            if (err) {
                // duplicate entry
                if (err.code == 11000)
                    return res.json({ success: false, msg: 'User already exists in database. '});
                else
                    return res.send(err);
            }
            res.json({ msg: 'User sign up success.' });
        });
    }
});

router.post('/signin', function(req, res) {
    var userNew = new User();
    userNew.username = req.body.username;
    userNew.fullname = req.body.fullname;
    userNew.password = req.body.password;

    User.findOne({ username: userNew.username }).select('username fullname password').exec(function(err, user) {
        if (err) res.send(err);

        user.comparePassword(userNew.password, function(isMatch){
            if (isMatch) {
                var userToken = {id: user._id, username: user.username};
                var token = jwt.sign(userToken, process.env.SECRET_KEY);
                res.json({success: true, token: 'JWT ' + token});
            }
            else {
                res.status(401).send({success: false, msg: 'Authentication failed. Wrong password.'});
            }
        });


    });
});

app.use('/', router);
app.listen(process.env.PORT || 5000);
console.log("Listening on port " + (process.env.PORT || 5000));