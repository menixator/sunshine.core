import { GraphQLObjectType } from "graphql";
import { HelloWorld } from "./HelloWorld";

export const Query = new GraphQLObjectType({
  name: "Query",

  fields: {
    helloWorld: HelloWorld
  }
});
