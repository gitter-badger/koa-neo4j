/**
 * Created by keyvan on 8/20/16.
 */

import {KoaPassport} from 'koa-passport';
import {Strategy as LocalStrategy} from 'passport-local';
import {Strategy as JwtStrategy, ExtractJwt} from 'passport-jwt';
import jwt from 'jsonwebtoken';
import {executeCypher} from './data';


const passport = new KoaPassport();
const secret = 'secret';

passport.serializeUser((user, done) => done(null, user.username));

passport.deserializeUser((username, done) => {
  console.log('Deserializing user ${JSON.stringify(username)}');
  executeCypher('auth.cyp', {username:username}).then((user) => done(null, user), done);
});

passport.use(new LocalStrategy((username, password, done) => {
  executeCypher('auth.cyp', {username:username})
        .then(([user]) => {
          if (!user || password !== user.salt)
            done(new Error('Invalid username or password'));
          else {
            delete user.salt;
            done(null, user);
          }
        }, done);
}));

// koa-passport uses generators which will be deprecated in koa v3, below block should be refactored
// accordingly
// The author of koa-passport has not considered the use cases of done(err), hence we need to wrap
// calls in a promise
const authenticate_local = async (ctx, next) => await new Promise(
    (resolve, reject) => passport.authenticate('local', resolve)(ctx, next)
        .catch(reject))
    .then((user) => {
      ctx.login(user);
      ctx.body = {token: 'JWT ' + jwt.sign(user, secret)};
    })
    .catch((error) => {
      ctx.status = 422;
      ctx.body = {error: String(error)};
    });

passport.use(new JwtStrategy(
  {
    jwtFromRequest: ExtractJwt.fromAuthHeader(),
    secretOrKey: secret
  }, (user, done) => {
        // Check whether payload is user
    if (!user.id) {
      done(new Error('Invalid token'));
    }
    else
            done(null, user);
  }));

const authenticate_jwt = async (ctx, next) => await new Promise(
    (resolve, reject) => passport.authenticate('jwt', {session: false}, resolve)(ctx, next)
        .catch(reject))
    .then((user) => ctx.login(user))
    .catch((error) => {
      ctx.status = 401;
      ctx.body = {error: String(error)};
    });

// var FacebookStrategy = require('passport-facebook').Strategy
// passport.use(new FacebookStrategy({
//         clientID: 'your-client-id',
//         clientSecret: 'your-secret',
//         callbackURL: 'http://localhost:' + (process.env.PORT || 3000) + '/auth/facebook/callback'
//     },
//     function(token, tokenSecret, profile, done) {
//         // retrieve user ...
//         done(null, user)
//     }
// ))
//
// var TwitterStrategy = require('passport-twitter').Strategy
// passport.use(new TwitterStrategy({
//         consumerKey: 'your-consumer-key',
//         consumerSecret: 'your-secret',
//         callbackURL: 'http://localhost:' + (process.env.PORT || 3000) + '/auth/twitter/callback'
//     },
//     function(token, tokenSecret, profile, done) {
//         // retrieve user ...
//         done(null, user)
//     }
// ))
//
// var GoogleStrategy = require('passport-google-auth').Strategy
// passport.use(new GoogleStrategy({
//         clientId: 'your-client-id',
//         clientSecret: 'your-secret',
//         callbackURL: 'http://localhost:' + (process.env.PORT || 3000) + '/auth/google/callback'
//     },
//     function(token, tokenSecret, profile, done) {
//         // retrieve user ...
//         done(null, user)
//     }
// ))

export {authenticate_local, authenticate_jwt};
export default passport;