import { PassportStatic } from "passport";
import { Strategy } from "passport-google-oauth20";
import { config } from "../../config/app.config";
import { userService } from "../../modules/auth/auth.module";

export const setupGoogleStrategy = (passport: PassportStatic) => {
    passport.use(
       new Strategy({
        clientID: config.CLIENT_ID,
        clientSecret: config.CLIENT_SECRET,
        callbackURL: config.REDIRECT_URI,
        passReqToCallback: true
       }, async (req, accessToken, refreshToken, profile, done) => {
    try {
        // Check if the user exists in the database
        const existingUser = await userService.findUser(profile.id);

        if (!existingUser) {
            const user = {
                googleId: profile.id,
                email: profile.emails?.[0].value,
                name: profile.displayName,
                photo: profile.photos?.[0].value
            }
            // If user does not exist, create a new user
            const newUser = await userService.createUser(user);
            return done(null, newUser);
        }

        // If user exists, return the user
        return done(null, existingUser);
      } catch (error) {
        // Handle any errors
        return done(error, false);
      }   
        
  }))    
  
passport.serializeUser((user: any, done) => done(null, user));
passport.deserializeUser((user: any, done) => done(null, user));
}