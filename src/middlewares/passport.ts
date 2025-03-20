import passport from "passport";
import { setupGoogleStrategy } from "../common/strategy/google.strategy";

const initializePassport = () => {
    setupGoogleStrategy(passport);
}

initializePassport();
export default passport;