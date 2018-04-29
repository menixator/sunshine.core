import { Realm } from "@entities/Realm";
import { GraphQLRealm } from "api/output/GraphQLRealm";
import {
  GraphQLFieldConfig,
  GraphQLInt,
  GraphQLNonNull,
  GraphQLString
} from "graphql";
import { getRepository } from "typeorm";
import { RootContext, RootSource } from "../../main";

// Creating a realm
export const CreateRealm = {
  name: "CreateRealm",
  type: GraphQLRealm,
  description: "Creates a new Realm, optionally assigned to a cluster",
  args: {
    name: {
      type: new GraphQLNonNull(GraphQLString),
      description: "The name of the realm to create. Has to be unique"
    },
    parent: {
      type: GraphQLInt,
      defaultValue: null,
      description: "Parent cluster id"
    }
  },
  async resolve(source, args, context): Promise<any> {
    if (!(await context.auth.checkStatus())) {
      throw new Error(`not logged in`);
    }

    let repo = getRepository(Realm);

    let runner = repo.manager.connection.createQueryRunner();
    try {
      await runner.startTransaction();

      let realm = repo.create();
      realm.name = args.name;
      await runner.manager.save(realm);
      if (args.parent !== null) {
        await repo
          .createQueryBuilder("realm", runner)
          .relation("parent")
          .of(realm)
          .set(args.parent);
      }
      await runner.commitTransaction();
      return realm;
    } catch (err) {
      await runner.rollbackTransaction();
      throw err;
    }
  }
} as GraphQLFieldConfig<
  RootSource,
  RootContext,
  {
    name: string;
    parent: number | null;
  }
>;
