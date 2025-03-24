import "dotenv/config"
import express, {Request, Response, NextFunction} from "express";
import "./database/database"
import cors from "cors"
import session from "express-session";
import cookieParser from "cookie-parser";
import { config } from "./config/app.config";
import { asyncHandler } from "./middlewares/asyncHandler";
import { HTTPSTATUS } from "./config/http.config";
import { errorHandler } from "./middlewares/errorHandler";
import appRouter from "./routes";
import passport from "./middlewares/passport";
import isAuthenticated from "./middlewares/isAuthenticated";

const app = express();
const BASE_PATH = config.BASE_PATH;

app.use(express.json());
app.use(express.urlencoded({extended: true}));
app.use(cors({
    origin: config.APP_ORIGIN,
    credentials: true
}))
app.use(cookieParser())

app.use(session({
    name: "session",
    secret: config.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,   
    cookie: {
        maxAge: 1000 * 60 * 60 * 24,
        secure: config.NODE_ENV === "production",
        sameSite: "lax",
        httpOnly: true
    }  
}))
app.use(passport.initialize());
app.use(passport.session());

app.get("/", asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    // res.status(HTTPSTATUS.OK).json({
    //     message: "Hello Subscriber!"
    // })
    res.send('<a href="/api/v1/auth/google">Login with Google</a>');
}))

app.use(BASE_PATH, appRouter)

app.use(errorHandler);


app.listen(config.PORT, () => {    
    console.log(`server running at port ${config.PORT}`);
})