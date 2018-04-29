import { GraphQLFieldConfig, GraphQLString } from "graphql";
import { getManager } from "typeorm";
import { RootContext, RootSource } from "../../../main";

// Mutation to log in to the system

export const LogOut = {
  name: "LogOut",
  type: GraphQLString,
  async resolve(source, args, context): Promise<any> {
    if (!(await context.auth.checkStatus())) {
      throw new Error(`cant log out when you're not logged in`);
    }
    let token = await context.auth.getToken();

    await getManager().remove(token);
    return "ok";
  }
} as GraphQLFieldConfig<RootSource, RootContext, {}>;
