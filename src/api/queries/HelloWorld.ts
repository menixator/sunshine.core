import { GraphQLFieldConfig, GraphQLString } from "graphql";
import { RootContext, RootSource } from "../../main";

export const HelloWorld = {
  name: "Hello World",
  type: GraphQLString,
  async resolve(root, args, context) {
    return "Hello!"
  }
} as GraphQLFieldConfig<RootSource, RootContext, {}>;
