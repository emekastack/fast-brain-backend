import { ErrorCode } from "../../common/enums/error-code.enum";
import { VerificationEnum } from "../../common/enums/verfication-code.enum";
import { RegisterDto } from "../../common/interface/auth.interface";
import { BadRequestException } from "../../common/utils/catch-errors";
import { fortyFiveMinutesFromNow } from "../../common/utils/date-time";
import { config } from "../../config/app.config";
import UserModel from "../../database/models/user.model";
import VerificationCodeModel from "../../database/models/verification.model";
import { sendEmail } from "../../mailers/mailer";
import { verifyEmailTemplate } from "../../mailers/templates/template";


// export class UserService {
//     public async findUser(googleId: string): Promise<any> {
//         const user = await UserModel.findOne({googleId});
//         return user;
//     }

//     public async createUser(user: any): Promise<any> {
//         const newUser = new UserModel({
//             email: user.email,
//             name: user.name,
//             photo: user.photo,
//             googleId: user.googleId
//         });
//         const savedUser = await newUser.save();
//         return savedUser;
//     }
// }

export class AuthService {
    public async register(registerData: RegisterDto) {
        const { name, email, password } = registerData;

        const existingUser = await UserModel.exists({ email });

        if (existingUser) {
            throw new BadRequestException("User with this email already exists", ErrorCode.AUTH_EMAIL_ALREADY_EXISTS);
        }

        const newUser = await UserModel.create({
            name,
            email,
            password
        })

        const userId = newUser._id;

        const verification = await VerificationCodeModel.create({
            userId,
            type: VerificationEnum.EMAIL_VERIFICATION,
            expiresAt: fortyFiveMinutesFromNow()
        })

        const verificationUrl = `${config.APP_ORIGIN}/confirm-email?code=${verification.code}`;

        console.log("Verification URL:", verificationUrl);

        // await sendEmail({
        //     to: newUser.email,
        //     ...verifyEmailTemplate(verificationUrl)
        // })

        return {
            user: newUser,
        }
    }
}