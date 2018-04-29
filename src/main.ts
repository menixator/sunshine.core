import { AuthorizationProvider } from "AuthorizationProvider";
import { Schema } from "api/Schema";
import cp from "cookie-parser";
import express, { Request, Response } from "express";
import eGraphql from "express-graphql";
import "reflect-metadata";
import { createConnection } from "typeorm";

export type RootSource = null;

export type RootContext = {
  req: Request;
  res: Response;
  auth: AuthorizationProvider;
};

export const app = express();

app.use(cp());

app.use("/api/v1", async (req, res, next) => {
  res.locals.auth = AuthorizationProvider.create(req, res);
  await res.locals.auth.touch();
  next();
});

app.use(
  "/api/v1",
  eGraphql((req, res) => {
    return {
      graphiql: true,
      schema: Schema,
      context: <RootContext>{
        req: req,
        res: res,
        auth: res.locals.auth
      }
    };
  })
);

async function main() {
  await createConnection();
  app.listen(3000);
}

main().catch(err => {
  console.error(err);
});
