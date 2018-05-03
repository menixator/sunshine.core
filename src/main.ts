import cp from "cookie-parser";
import express, { Request, Response } from "express";
import eGraphql from "express-graphql";
import "reflect-metadata";
import {
  createConnection,
  useContainer as typeORMUserContainer
} from "typeorm";
import { join } from "path";
import {
  useContainer as typeGraphQLUseContainer,
  buildSchema
} from "type-graphql";
import { Container } from "typedi";

typeORMUserContainer(Container);
typeGraphQLUseContainer(Container);
import { AuthorizationProvider } from "AuthorizationProvider";

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

async function main() {
  await createConnection();

  const schema = await buildSchema({
    resolvers: [join(__dirname, "./resolvers/**/*")]
  });

  app.use(
    "/api/v1",
    eGraphql((req, res) => {
      return {
        graphiql: true,
        schema,
        context: <RootContext>{
          req: req,
          res: res,
          auth: res.locals.auth
        },
        formatError(err) {
          console.log(err.stack);
          return err;
        }
      };
    })
  );

  app.listen(3001);
  console.log(`started listening at http://localhost:${3001})}`);
}

main().catch(err => {
  console.error(err);
});
