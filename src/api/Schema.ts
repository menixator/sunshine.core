import { GraphQLSchema } from "graphql";
import { Mutations } from "./mutations";
import { Query } from "./queries";

export const Schema = new GraphQLSchema({
  mutation: Mutations,
  query: Query
});
