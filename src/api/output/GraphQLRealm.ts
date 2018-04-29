import { GraphQLInt, GraphQLObjectType, GraphQLString } from "graphql";

export const GraphQLRealm = new GraphQLObjectType({
  name: "Realm",
  description:
    "A segragated abstraction that represents a seperate unit to enclose equipment/s",
  fields: () => ({
    id: { type: GraphQLInt },
    name: { type: GraphQLString },
    parent: { type: GraphQLRealm }
  })
});
