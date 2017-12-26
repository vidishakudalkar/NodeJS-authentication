const express = require('express');
const bodyParser = require('body-parser');
const app = express();

const https = require('https');
const fs = require('fs');
const uuidv4 = require('uuid/v4');


const NOT_FOUND = 404;
const UNAUTHORIZED = 401;
const SERVER_ERROR = 500;
const NO_CONTENT = 204;
const SEE_OTHER = 303;
const OK = 200;
const CREATED = 201;
const BAD_REQUEST = 400;


function serve(options, model) {
  const app = express();
  app.locals.model = model;
  app.locals.options=options;
  const KEY_PATH = `${app.locals.options.sslDir}/key.pem`;
  const CERT_PATH = `${app.locals.options.sslDir}/cert.pem`;
  app.locals.port = options.port;
  setupRoutes(app);
  https.createServer({
  key: fs.readFileSync(KEY_PATH),
  cert: fs.readFileSync(CERT_PATH),
}, app).listen(app.locals.port, function() {
    console.log(`listening on port ${app.locals.port}`);
  });

}

function Users(db) {
  this.db = db;
  this.users = db.collection('users');
}

function setupRoutes(app) {
  app.use('/users/:id', bodyParser.json());
  app.use(bodyParser.urlencoded({ extended: true }));
  app.put('/users/:id', newUser(app));
  app.use('/users/:id', cacheUser(app));
  app.get('/users/:id', getUser(app));
  app.use('/users/:id/auth', verifyPass(app));
  app.put('/users/:id/auth', createnewauthtoken(app));  
}




function requestUrl(req) {
  const port = req.app.locals.port;
  return `${req.protocol}://${req.hostname}:${port}${req.originalUrl}`;
}


  
module.exports = {
  serve: serve
}

function newUser(app) {
  return function(request, response) {
    const password = request.query.pw;
    const id = request.params.id;
    const userinfo = request.body;
    if (typeof userinfo ==='undefined'|| typeof id==='undefined'|| typeof password==='undefined') {
      response.sendStatus(BAD_REQUEST);
    }
    else {
      request.app.locals.model.users.newUser(userinfo,password,id,app.locals.options.authTimeout).
       then(function(results) {
        if(results.status==="CREATED"){
           response.location(`/users/${id}`);
           response.status(CREATED);
           response.json(results);       
        }
        else{
          response.location(`/users/${id}`);
          response.json(results);
        }
        
       }).
       catch((err) => {
       console.error(err);
       response.sendStatus(NO_CONTENT);
       });
      }
    }; 
}


function cacheUser(app) {
  return function(request, response, next) {
    const id = request.params.id;
    if (typeof id === 'undefined') {
      response.sendStatus(BAD_REQUEST);
    }
    else {
      request.app.locals.model.users.cacheUser(id, false).
  then(function(user) {
    next();
  }).catch((err) => {
    response.status(NOT_FOUND);
    var notfoundtext = {status: "ERROR_NOT_FOUND",info: `user ${id} not found`};
    response.json(notfoundtext);
  });
    }
  }
}

function getUser(app) {
  return function(request, response) {
    const id = request.params.id;
    const headervalue = request.headers.authorization;
    if (typeof id === 'undefined') {
      response.sendStatus(BAD_REQUEST);
    }
    else if(typeof headervalue==='undefined'){
        response.status(UNAUTHORIZED);
        var requirebearerheader = { status: "ERROR_UNAUTHORIZED",info: `/users/${id} requires a bearer authorization header`};
        response.json(requirebearerheader);
    }
    else {
      const token = headervalue.substring(7);
      request.app.locals.model.users.getUser(id,token).
      then((results) => response.json(results)).
      catch((err) => {
      response.status(UNAUTHORIZED);
      var requirebearerheader = { status: "ERROR_UNAUTHORIZED",info: `/users/${id} requires a bearer authorization header`};
      response.json(requirebearerheader);
      });
    }
  }
}

 
function verifyPass(app) {
  return function(request, response, next) {
    const id = request.params.id;
    const password = request.body;
    if (typeof password === 'undefined') {
      response.sendStatus(BAD_REQUEST);
    }
    else {
      request.app.locals.model.users.verifyPass(id, false,password).
  then(function(user) {
    request.user = user;
    console.log(request.user);
    next();
  }).
  catch((err) => {
    response.status(UNAUTHORIZED);
    var unauthorizedtext  ={ status: "ERROR_UNAUTHORIZED",info: `/users/${id}/auth requires a valid 'pw' password query parameter`}; 
    response.json(unauthorizedtext);

  });
    }
  }
} 


function createnewauthtoken(app) {
  return function(request, response) {
    const id = request.params.id;
    const password = request.body;
    if (typeof password==='undefined') {
      response.sendStatus(BAD_REQUEST);
    }
    else {
      request.app.locals.model.users.createnewauthtoken(id,password,app.locals.options.authTimeout).
  then(function(token) {
    response.status(OK);
    var returnstataus ={ status: "OK",authToken: `${token}`};
    response.json(returnstataus);
  }).
  catch((err) => {
    console.error(err);
    response.sendStatus(NOT_FOUND);
  });
    
  };
}
}