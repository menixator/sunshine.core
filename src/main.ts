import "reflect-metadata";
import cp from "cookie-parser";
import express, { Request, Response } from "express";
import { graphqlExpress, graphiqlExpress } from "apollo-server-express";
import { GraphQLOptions } from "apollo-server-core";
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
import { AuthorizationProvider } from "./AuthorizationProvider";

typeORMUserContainer(Container);
typeGraphQLUseContainer(Container);

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
  await res.locals.auth.checkStatus();
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
    express.json(),
    graphqlExpress((req, res): GraphQLOptions => {
      
      return {
        schema,
        context: <RootContext>{
          req: req!,
          res: res!,
          auth: res!.locals.auth
        }
      };
    })
  );

  app.listen(3001);
  console.log(`started listening at http://localhost:${3001}`);
}

app.use(
  "/graphiql",
  graphiqlExpress({
    endpointURL: "/api/v1"
  })
);

main().catch(err => {
  console.error(err);
});
