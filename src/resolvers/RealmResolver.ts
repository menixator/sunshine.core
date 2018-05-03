import {
  Arg,
  ArgsType,
  Field,
  Int,
  Mutation,
  Query,
  Resolver,
  Args,
  FieldResolver,
  Root
} from "@typeql";
import { Repository } from "typeorm";
import { InjectRepository } from "typeorm-typedi-extensions";
import { Realm } from "../entities/Realm";
import { PaginationArgs } from "../types/Pagination";
import { Equipment } from "@entities/Equipment";
import { Cluster } from "@entities/Cluster";

@ArgsType()
export class AddRealmInput implements Partial<Realm> {
  @Field() name: string;
}

@ArgsType()
export class AddRealmToClusterInput implements Partial<Realm> {
  @Field(type => Int)
  id: number;
  @Field(type => Int)
  clusterId: number;
}

@ArgsType()
export class DeleteRealmInput implements Partial<Realm> {
  @Field(type => Int, { description: "Id to delete" })
  id: number;
}

@Resolver(type => Realm)
export class RealmResolver {
  constructor(@InjectRepository(Realm) private realmRepo: Repository<Realm>) {}

  @Query(type => Realm)
  getRealm(
    @Arg("id", type => Int)
    id: number
  ) {
    return this.realmRepo.findOneOrFail({
      where: {
        id: id
      }
    });
  }

  @Mutation(type => Realm)
  async createRealm(@Args() { name }: AddRealmInput): Promise<Realm> {
    let realm = this.realmRepo.create({
      name
    });

    return this.realmRepo.save(realm);
  }

  @Mutation(type => Realm)
  async deleteRealm(@Args() { id }: DeleteRealmInput): Promise<Realm> {
    let realm = await this.realmRepo.findOneOrFail(id);
    await this.realmRepo.delete(id);
    return realm;
  }

  @Mutation(type => Realm)
  async addRealmToCluster(@Args()
  {
    clusterId,
    id
  }: AddRealmToClusterInput): Promise<Realm> {
    let realm = await this.realmRepo.findOneOrFail(id);

    await this.realmRepo
      .createQueryBuilder()
      .relation(Realm, "parent")
      .of(realm)
      .set(clusterId);

    return realm;
  }

  @Mutation(type => Realm)
  async clearRealmParent(@Args() { id }: AddRealmToClusterInput): Promise<
    Realm
  > {
    let realm = await this.realmRepo.findOneOrFail(id);

    await this.realmRepo
      .createQueryBuilder()
      .relation(Realm, "parent")
      .of(realm)
      .set(null);

    return realm;
  }

  @Query(type => [Realm])
  async getRealms(@Args() { skip, take }: PaginationArgs): Promise<Realm[]> {
    return await this.realmRepo.find({
      skip,
      take
    });
  }

  @FieldResolver(type => [Equipment])
  async equipments(
    @Root() realm: Realm,
    @Args() { skip, take }: PaginationArgs
  ): Promise<Equipment[]> {
    return (await this.realmRepo
      .createQueryBuilder()
      .take(take)
      .skip(skip)
      .relation(Realm, "equipments")
      .of(realm)
      .loadMany()) as Equipment[];
  }

  @FieldResolver(type => Cluster, { nullable: true })
  async parent(
    @Root() realm: Realm,
    @Args() { skip, take }: PaginationArgs
  ): Promise<Cluster> {
    return (await this.realmRepo
      .createQueryBuilder()
      .take(take)
      .skip(skip)
      .relation(Realm, "parent")
      .of(realm)
      .loadOne()) as Cluster;
  }
}
