import { AuthController } from "./auth.controller";
import {UserService} from "./auth.service";

const userService = new UserService();
const authController = new AuthController()

export { userService, authController };
