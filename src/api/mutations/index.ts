import { GraphQLObjectType } from "graphql";
import { LogIn } from "./auth/Login";
import { LogOut } from "./auth/Logout";
import { CreateRealm } from "./CreateRealm";

export const Mutations = new GraphQLObjectType({
  name: "Mutations",

  fields: {
    login: LogIn,
    logout: LogOut,

    createRealm: CreateRealm
  }
});
