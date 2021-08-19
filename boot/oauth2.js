var oauth2orize = require('oauth2orize');
var openid = require('oauth2orize-openid');
var crypto = require('crypto');
var as = require('../as');
var db = require('../db');
var SignJWT = require('jose/jwt/sign').SignJWT;


module.exports = function() {
  
  as.grant(openid.extensions);

  as.grant(oauth2orize.grant.code(function(client, redirectURI, user, ares, cb) {
    console.log('TODO: code grant');
    console.log(client);
    console.log(redirectURI);
    console.log(user);
    console.log(ares);
    
    crypto.randomBytes(32, function(err, buffer) {
      if (err) { return cb(err); }
      
      var code = buffer.toString('base64');
      
      db.run('INSERT INTO authorization_codes (code, client_id, redirect_uri, user_id) VALUES (?, ?, ?, ?)', [
        code,
        client.id,
        redirectURI,
        user.id
      ], function(err) {
        if (err) { return cb(err); }
        return cb(null, code);
      });
    });
  }));
  
  as.exchange(oauth2orize.exchange.code(function(client, code, redirectURI, cb) {
    console.log('TODO: code exchange');
    console.log(client);
    console.log(code);
    console.log(redirectURI);
    
    db.get('SELECT rowid AS id, * FROM authorization_codes WHERE code = ?', [
      code
    ], function(err, row) {
      console.log(err);
      console.log(row);
      
      if (err) { return next(err); }
      if (!row) { return cb(null, false); }
      
      crypto.randomBytes(64, function(err, buffer) {
        if (err) { return cb(err); }
      
        var token = buffer.toString('base64');
      
        db.run('INSERT INTO access_tokens (token, client_id, user_id) VALUES (?, ?, ?)', [
          token,
          row.client_id,
          row.user_id
        ], function(err) {
          if (err) { return cb(err); }
          
          
          var jwt = new SignJWT({ sub: row.user_id.toString() });
          jwt.setProtectedHeader({ alg: 'HS256' })
            .setIssuedAt()
            .setIssuer('http://localhost:3001/')
            .setAudience(client.id)
            .setExpirationTime('2h')
            .sign(crypto.createSecretKey(Buffer.from('foofyasdfaeecasdfdafdedadfdfaedafaeasdfaedbasde')))
            .then(function(idToken) {
              console.log('PROMISED TOKEN');
              console.log(idToken);
              
              return cb(null, token, { id_token: idToken });
            })
          
          
          //return cb(null, token, { id_token: id_token });
        });
      });
    });
  }));
  
  as.serializeClient(function(client, cb) {
    process.nextTick(function() {
      cb(null, {
        id: client.id,
        name: client.name
      });
    });
  });
  
  as.deserializeClient(function(client, cb) {
    process.nextTick(function() {
      return cb(null, client);
    });
  });

};
