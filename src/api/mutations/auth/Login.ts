import { GraphQLFieldConfig, GraphQLNonNull, GraphQLString } from "graphql";
import { RootContext, RootSource } from "../../../main";
import { getRepository } from "typeorm";
import { User } from "@entities/User";
import bcrypt from "bcrypt";
import { AuthToken } from "@entities/AuthToken";

import { v4 as uuidv4 } from "uuid";

// Mutation to log in to the system

export const LogIn = {
  name: "LogIn",
  type: GraphQLString,
  args: {
    name: { type: new GraphQLNonNull(GraphQLString) },
    password: { type: new GraphQLNonNull(GraphQLString) }
  },
  async resolve(source, args, context): Promise<any> {
    if (await context.auth.checkStatus()) {
      throw new Error(`already logged in`);
    }
    let repo = await getRepository(User);
    let user = await repo.findOneOrFail({
      where: {
        name: args.name
      }
    });

    if (!(await bcrypt.compare(args.password, user.hash))) {
      throw new Error(`username or password is incorrect`);
    }

    let token = new AuthToken();

    token.user = user;
    token.value = uuidv4();

    context.auth.authorizeResponseWithToken(token);

    await repo.manager.save(token);

    return user.name;
  }
} as GraphQLFieldConfig<
  RootSource,
  RootContext,
  {
    name: string;
    password: string;
  }
>;
