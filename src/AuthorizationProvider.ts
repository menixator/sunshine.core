import { Request, Response } from "express";
import bcrypt from "bcrypt";
import { AuthToken } from "@entities/AuthToken";
import { User } from "@entities/User";
import { Repository, getRepository } from "typeorm";
import { GraphQLError } from "graphql";

export const AUTH_COOKIE_NAME = "auth_id";

export class AuthorizationProvider {
  public cookieToken: string | null;
  public authorized: boolean = false;
  public checked: boolean = false;

  public req: Request;
  public res: Response;

  public user: User;
  public token: AuthToken;

  public authRepo: Repository<AuthToken> = getRepository(AuthToken);
  public userRepo: Repository<User> = getRepository(User);

  constructor(
    token: AuthorizationProvider["cookieToken"],
    req: AuthorizationProvider["req"],
    res: AuthorizationProvider["res"]
  ) {
    this.cookieToken = token;
    this.req = req;
    this.res = res;
  }

  public static create(req: Request, res: Response): AuthorizationProvider {
    return new AuthorizationProvider(
      req.cookies[AUTH_COOKIE_NAME] || null,
      req,
      res
    );
  }

  public async login(name: string, password: string) {
    let user = await this.userRepo.findOne({ name });
    if (!user) throw new GraphQLError(`There is no user present with that name`);

    let matches = await bcrypt.compare(password, user.hash);
    if (!matches) throw new GraphQLError(`Username or Password is incorrect`);

    let token = new AuthToken();
    token.lastTouched = new Date();
    token.user = user;
    token.value = AuthToken.generateToken();
    await this.authRepo.save(token);

    this.token = token;
    this.user = user;
    this.authorized = true;
    this.checked = true;

    this.res.cookie(AUTH_COOKIE_NAME, token.value, {
      httpOnly: true,
      maxAge: 5 * 10 * 1000
    });
  }

  public async touch(): Promise<void> {
    let token = await this.getToken();
    // Delete if the token is expired.
    if (token) {
      if (token.expired) {
        console.log("Token was expired!")
        this.res.clearCookie(AUTH_COOKIE_NAME);
        await this.authRepo.delete(token);
      } else {
        console.log("Token was refreshed!")
        token.lastTouched = new Date();
        await this.authRepo.save(token);
      }
    }
  }

  protected async getToken(): Promise<AuthToken | null> {
    if (this.cookieToken === null) return null;
    let token = await this.authRepo.findOne({
      where: {
        value: this.cookieToken
      },
      relations: ["user"]
    });
    if (!token) return null;
    this.token = token;
    this.user = token.user;

    return token;
  }

  public async checkStatus(force: boolean = false): Promise<boolean> {
    if (this.checked && !force) return this.authorized;

    let token = await this.getToken();
    this.checked = true;
    if (!token) {
      console.log(
        `couldnt find the token(${this.cookieToken}) in the database`
      );
      this.res.clearCookie(AUTH_COOKIE_NAME);
      return false;
    }

    if (token.expired) {
      this.res.clearCookie(AUTH_COOKIE_NAME);
      await this.authRepo.delete(token);
      return false;
    }
    this.authorized = true;

    return true;
  }
}
