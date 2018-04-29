import { Request, Response } from "express";
import { getRepository, Repository } from "typeorm";
import { AuthToken } from "@entities/AuthToken";

export const AUTH_COOKIE_NAME = "auth_id";

export class AuthorizationProvider {
  public static create(req: Request, res: Response): AuthorizationProvider {
    return new AuthorizationProvider(
      req.cookies[AUTH_COOKIE_NAME] || null,
      req,
      res
    );
  }

  public authorizeResponseWithToken(token: AuthToken): void {
    this.res.cookie(AUTH_COOKIE_NAME, token.value, {
      httpOnly: true,
      maxAge: 5 * 10 * 1000
    });
  }

  public token: string | null;
  public req: Request;
  public res: Response;
  public repo: Repository<AuthToken> = getRepository(AuthToken);

  constructor(
    token: AuthorizationProvider["token"],
    req: AuthorizationProvider["req"],
    res: AuthorizationProvider["res"]
  ) {
    this.token = token;
    this.req = req;
    this.res = res;
  }

  public async touch(): Promise<void> {
    let token = await this.getToken();
    // Delete if the token is expired.
    if (token) {
      if (token.expired) {
        console.log('token has expired?')
        this.res.clearCookie(AUTH_COOKIE_NAME);
        await this.repo.delete(token);
      } else {
        token.lastTouched = new Date();
        await this.repo.save(token);
      }
    }
  }

  public async getToken(): Promise<AuthToken | null> {
    if (this.token === null) return null;
    let token = await this.repo.findOne({
      where: {
        value: this.token
      }
    });
    if (!token) return null;
    return token;
  }

  public async checkStatus(): Promise<boolean> {
    let token = await this.getToken();

    if (!token) {
      console.log(`couldnt find the token(${this.token}) in the database`);
      this.res.clearCookie(AUTH_COOKIE_NAME);
      return false;
    }

    if (token.expired) {
      this.res.clearCookie(AUTH_COOKIE_NAME);
      await this.repo.delete(token);
      return false;
    }

    return true;
  }
}
