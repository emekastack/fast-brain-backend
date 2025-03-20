import passport, { PassportStatic } from "passport";
import { Strategy as GoogleStrategy, Strategy } from "passport-google-oauth20";
import { config } from "../../config/app.config";

export const setupGoogleStrategy = (passport: PassportStatic) => {
    passport.use(
       new Strategy({
        clientID: config.CLIENT_ID,
        clientSecret: config.CLIENT_SECRET,
        callbackURL: config.REDIRECT_URI,
        passReqToCallback: true
       }, (req, accessToken, refreshToken, profile, done) => {
        console.log({accessToken, refreshToken, profile})
        return done(null, profile)
       }))    
}