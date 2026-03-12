import jwt, { SignOptions, VerifyOptions } from "jsonwebtoken";
import { UserDocument } from "../database/models/user.model";
import { SessionDocument } from "../database/models/session.model";
import { config } from "../config/app.config";
import { RoleType } from "../common/enums/role.enum";

export type AccessTPayload = {
  userId: UserDocument["_id"];
  sessionId: SessionDocument["_id"];
};

export type RefreshTPayload = {
  sessionId: SessionDocument["_id"];
  role: RoleType;
};

export const accessTokenSignOptions: SignOptions = {
  expiresIn: "15m",
  audience: ["user"],
};

export const refreshTokenSignOptions: SignOptions = {
  expiresIn: "30d",
  audience: ["user"],
};

export const signJwtToken = (
  payload: AccessTPayload | RefreshTPayload,
  options?: SignOptions & { secret?: string }
) => {
  const secret = options?.secret || config.JWT.SECRET;
  const opts = options ? { ...options } : accessTokenSignOptions;
  return jwt.sign(payload, secret, opts as any);
};

export const verifyJwtToken = <TPayload extends object = AccessTPayload>(
  token: string,
  options?: VerifyOptions & { secret?: string }
) => {
  try {
    const secret = options?.secret || config.JWT.SECRET;
    const opts = options ? { ...options } : {};
    const payload = jwt.verify(token, secret, opts as any) as TPayload;
    return { payload };
  } catch (err: any) {
    return {
      error: err.message,
    };
  }
};
