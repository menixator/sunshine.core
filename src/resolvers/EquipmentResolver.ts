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
import { Equipment } from "../entities/Equipment";
import { PaginationArgs } from "../types/Pagination";
import { Realm } from "@entities/Realm";

@ArgsType()
export class AddEquipmentInput implements Partial<Equipment> {
  @Field() name: string;
  @Field(type => Int)
  realmId: number;
  @Field() comparator: string;
}

@ArgsType()
export class DeleteEquipmentInput implements Partial<Equipment> {
  @Field(type => Int, { description: "Id to delete" })
  id: number;
}

@Resolver(type => Equipment)
export class EquipmentResolver {
  constructor(
    @InjectRepository(Equipment) private equipmentRepo: Repository<Equipment>
  ) {}

  @Query(type => Equipment)
  getEquipment(
    @Arg("id", type => Int)
    id: number
  ) {
    return this.equipmentRepo.findOneOrFail({
      where: {
        id: id
      }
    });
  }

  @Mutation(type => Equipment)
  async createEquipment(@Args()
  {
    name,
    comparator,
    realmId
  }: AddEquipmentInput): Promise<Equipment> {
    let realm = this.equipmentRepo.create({
      name,
      comparator,
      location: {
        id: realmId
      }
    });

    return this.equipmentRepo.save(realm);
  }

  @Mutation(type => Equipment)
  async deleteEquipment(@Args() { id }: DeleteEquipmentInput): Promise<
    Equipment
  > {
    let realm = await this.equipmentRepo.findOneOrFail(id);
    await this.equipmentRepo.delete(id);
    return realm;
  }

  @Query(type => [Equipment])
  async getEquipments(@Args() { skip, take }: PaginationArgs): Promise<
    Equipment[]
  > {
    return await this.equipmentRepo.find({
      skip,
      take
    });
  }

  @FieldResolver(type => [Realm])
  async children(
    @Root() realm: Equipment,
    @Args() { skip, take }: PaginationArgs
  ): Promise<Realm[]> {
    return (await this.equipmentRepo
      .createQueryBuilder()
      .take(take)
      .skip(skip)
      .relation(Equipment, "children")
      .of(realm)
      .loadMany()) as Realm[];
  }
}