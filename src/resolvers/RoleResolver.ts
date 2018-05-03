import {
  Resolver,
  Query,
  Arg,
  Int,
  Args,
  ResolverInterface,
  FieldResolver,
  Root,
  Field,
  ArgsType,
  Mutation
} from "@typeql";
import { Role } from "@entities/Role";
import { InjectRepository } from "typeorm-typedi-extensions";
import { Repository } from "typeorm";
import { PaginationArgs } from "types/Pagination";
import { User } from "@entities/User";

@ArgsType()
export class AddRoleInput implements Partial<Role> {
  @Field() name: string;
}

@ArgsType()
export class DeleteRoleInput implements Partial<Role> {
  @Field(type => Int, { description: "Id to delete" })
  id: number;
}

@Resolver(type => Role)
export class RoleResolver implements ResolverInterface<Role> {
  constructor(@InjectRepository(Role) private roleRepo: Repository<Role>) {}

  @Query(type => Role)
  getRole(
    @Arg("id", type => Int)
    id: number
  ) {
    return this.roleRepo.findOneOrFail({
      where: {
        id: id
      }
    });
  }

  @Mutation(type => Role)
  async createRole(@Args() { name }: AddRoleInput): Promise<Role> {
    let role = this.roleRepo.create({
      name
    });

    return this.roleRepo.save(role);
  }

  @Query(type => [Role])
  async getRoles(@Args() { skip, take }: PaginationArgs): Promise<Role[]> {
    return await this.roleRepo.find({
      skip,
      take
    });
  }

  @Mutation(type => Role)
  async deleteUser(@Args() { id }: DeleteRoleInput): Promise<Role> {
    let role = await this.roleRepo.findOneOrFail(id);
    await this.roleRepo.delete(id);
    return role;
  }

  @FieldResolver(type => [User])
  async users(
    @Root() role: Role,
    @Args() { skip, take }: PaginationArgs
  ): Promise<User[]> {
    return (await this.roleRepo
      .createQueryBuilder()
      .take(take)
      .skip(skip)
      .relation(Role, "users")
      .of(role)
      .loadMany()) as User[];
  }
}
