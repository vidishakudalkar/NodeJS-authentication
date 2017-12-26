#!/usr/bin/env nodejs
const assert = require('assert');
const mongo = require('mongodb').MongoClient;
const process = require('process');
const users = require('./model/users');
const model = require('./model/model');
const server = require('./server/server');
const options = require('./options.js').options;
const DB_URL = 'mongodb://localhost:27017/users';

  

mongo.connect(DB_URL).
  //then((db) => users.initUsers(db)).
  then(function(db) {
    const model1 = new model.Model(db);
    server.serve(options, model1);
  }).
  catch((e) => console.error(e));