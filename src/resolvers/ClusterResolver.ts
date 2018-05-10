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
import { Cluster } from "../entities/Cluster";
import { PaginationArgs } from "../types/Pagination";
import { Realm } from "@entities/Realm";

@ArgsType()
export class AddClusterInput implements Partial<Cluster> {
  @Field() name: string;
}

@ArgsType()
export class DeleteClusterInput implements Partial<Cluster> {
  @Field(type => Int, { description: "Id to delete" })
  id: number;
}

@Resolver(type => Cluster)
export class ClusterResolver {
  constructor(
    @InjectRepository(Cluster) private clusterRepo: Repository<Cluster>
  ) {}

  @Query(type => Cluster)
  getCluster(
    @Arg("id", type => Int)
    id: number
  ) {
    return this.clusterRepo.findOneOrFail({
      where: {
        id: id
      }
    });
  }

  @Mutation(type => Cluster)
  async createCluster(@Args() { name }: AddClusterInput): Promise<Cluster> {
    let realm = this.clusterRepo.create({
      name
    });

    return this.clusterRepo.save(realm);
  }

  @Mutation(type => Cluster)
  async deleteCluster(@Args() { id }: DeleteClusterInput): Promise<Cluster> {
    let realm = await this.clusterRepo.findOneOrFail(id);
    await this.clusterRepo.delete(id);
    return realm;
  }


  @Query(type => [Cluster])
  async getClusters(@Args() { skip, take }: PaginationArgs): Promise<
    Cluster[]
  > {
    return await this.clusterRepo.find({
      skip,
      take
    });
  }

  @FieldResolver(type => [Realm])
  async children(
    @Root() realm: Cluster,
    @Args() { skip, take }: PaginationArgs
  ): Promise<Realm[]> {
    return (await this.clusterRepo
      .createQueryBuilder()
      .take(take)
      .skip(skip)
      .relation(Cluster, "children")
      .of(realm)
      .printSql()
      .loadMany()) as Realm[];
  }
}
