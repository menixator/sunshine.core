import { Resolver, Query } from "@typeql";
import { GraphQLString } from "graphql";

@Resolver()
export class HelloWorldResolver {
  @Query(type => GraphQLString)
  helloWorld(): string {
    return "String";
  }
}
