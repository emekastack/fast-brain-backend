import "dotenv/config"
import express, {Request, Response, NextFunction} from "express";
import "./config/db.config"
import cors from "cors"
import cookieParser from "cookie-parser";
import { config } from "./config/app.config";
import { asyncHandler } from "./middlewares/asyncHandler";
import { HTTPSTATUS } from "./config/http.config";
import { errorHandler } from "./middlewares/errorHandler";
import appRouter from "./routes";
import passport from "./middlewares/passport";

const app = express();
const BASE_PATH = config.BASE_PATH;

app.use(express.json());
app.use(express.urlencoded({extended: true}));
app.use(cors({
    origin: config.APP_ORIGIN,
    credentials: true
}))
app.use(cookieParser())
app.use(passport.initialize());

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