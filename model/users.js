const assert = require('assert');
const express = require('express');
const bodyParser = require('body-parser');
const app = express();
app.use('/users/:id', bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
const USERS = 'users';

const uuidv4 = require('uuid/v4');  // For generating random token
var moment = require('moment'); // For working with token timeout
var bcrypt = require('bcrypt'); // For hashing the password
const saltRounds = 10;

function Users(db) {
  this.db = db;
  this.users = db.collection(USERS);
}


Users.prototype.newUser = function(userinfo,password,id,authTimeout) {
      var hash = bcrypt.hashSync(password, saltRounds);
      var token = uuidv4()
      var dateFormat = 'YYYY-MM-DD HH:mm:ss';
      timeout = moment().add(authTimeout ,'seconds').format(dateFormat);
      const tokeninsert = [{token,timeout}]; 
      data = { _id: id,pass:hash, userinfo,tokens:tokeninsert };
      return this.users.insertOne(data).
      then(function(results){
        var createdmessage =  {status: "CREATED",authToken: token};
          return createdmessage;
      }).catch((err) => {
      var existsmessage = {status: "EXISTS",info: `user ${id} already exists`};
     return existsmessage;
  });     
    
}

Users.prototype.cacheUser = function(id, mustFind=true) {
      const searchSpec = { _id: id };
      return this.users.find(searchSpec).toArray().
        then(function(users) {
        return new Promise(function(resolve, reject) {
            if (users.length === 1) {
              resolve();
            }
            else {
              reject();
            }
          })
      });     
}


Users.prototype.getUser = function(id,inputtoken) {
        var dateFormat = 'YYYY-MM-DD HH:mm:ss';
        const searchSpec = { _id: id, tokens: { $elemMatch: { token: inputtoken,timeout:{$gte:moment().format(dateFormat)} } }};
        return this.users.find(searchSpec).toArray().
          then(function(users) {
            return new Promise(function(resolve, reject) {
      	 if (users.length === 1) {
      	  resolve(users[0].userinfo);
      	 }
      	 else {
      	  reject(id);
      	 }
          });
        });
}


Users.prototype.verifyPass = function(id, mustFind=true,password) {
  const searchSpec = { _id: id };
  return this.users.find(searchSpec).toArray().
    then(function(users) {
      return new Promise(function(resolve, reject) {
          if (users.length === 1) {
            var isvalid = bcrypt.compareSync(password.pw, users[0].pass);
            console.log(isvalid);
            if(isvalid){
            resolve();  
            }
            else{
              reject();  
            }
            
          }
          else {
            reject(new Error(`Cannot verify Password of user ${id}`));
          }
      });
    });
}


Users.prototype.createnewauthtoken = function(id,password,authTimeout) {
            var dateFormat = 'YYYY-MM-DD HH:mm:ss';      
            timeout = moment().add(authTimeout ,'seconds').format(dateFormat);
            var token = uuidv4();
            const tokeninsert = {token,timeout}; 
            return this.users.updateOne({_id: id},{ $push: { "tokens": tokeninsert }}).
            then(function(results) {
            return new Promise(function(resolve, reject) {
            if (results.modifiedCount != 1) {
              reject(`{ "status": "ERROR_UNAUTHORIZED","info": "/users/${id}/auth requires a valid 'pw' password query parameter"}`);
            }
            else {
            resolve(token);
            }
          });
        });
            
}

module.exports = {
  Users: Users,
};
