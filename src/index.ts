import "dotenv/config"
import express, {Request, Response, NextFunction} from "express";
import "./database/database"
import cors from "cors"
import session from "express-session";
import {filterXSS} from "xss";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import { config } from "./config/app.config";
import { asyncHandler } from "./middlewares/asyncHandler";
import { HTTPSTATUS } from "./config/http.config";
import { errorHandler } from "./middlewares/errorHandler";
import appRouter from "./routes";
import isAuthenticated from "./middlewares/isAuthenticated";
import redis from "./config/redis.config";


// redis.set("testKey", "Welcome to Redis!").then(() => {
//     redis.get("testKey").then((value) => {
//         console.log("Redis testKey value:", value);
//     });
// });
const app = express();
const BASE_PATH = config.BASE_PATH;

app.use(express.json());
app.use(express.urlencoded({extended: true}));
app.use(cors({
    origin: config.APP_ORIGIN,
    credentials: true
}))
app.use(helmet());
app.use(cookieParser())
app.use((req, res, next) => {
    if (req.body) {
        req.body = JSON.parse(filterXSS(JSON.stringify(req.body)));
    }
    next();
})

app.get("/", asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    res.status(HTTPSTATUS.OK).json({
        message: "Hello Subscriber!"
    })    
}))

app.use(BASE_PATH, appRouter)

app.use(errorHandler);


app.listen(config.PORT, () => {    
    console.log(`server running at port ${config.PORT}`);
})