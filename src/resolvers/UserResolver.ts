import { Role } from "@entities/Role";
import { User } from "@entities/User";
import {
  Arg,
  Args,
  ArgsType,
  Field,
  FieldResolver,
  Int,
  Mutation,
  Query,
  Resolver,
  Root,
  Ctx
} from "@typeql";
import bcrypt from "bcrypt";
import { Repository } from "typeorm";
import { InjectRepository } from "typeorm-typedi-extensions";
import { PaginationArgs } from "../types/Pagination";
import { RootContext } from "main";

@ArgsType()
export class LoginInput implements Partial<User> {
  @Field() name: string;
  @Field() password: string;
}

@ArgsType()
export class AddUserInput implements Partial<User> {
  @Field() name: string;

  @Field(type => Int)
  roleId: number;

  @Field() password: string;
}

@ArgsType()
export class DeleteUserInput implements Partial<User> {
  @Field(type => Int, { description: "Id to delete" })
  id: number;
}

@ArgsType()
export class UpdateUserRole implements Partial<User> {
  @Field(type => Int)
  id: number;

  @Field(type => Int)
  roleId: number;
}

@Resolver(type => User)
export class UserResolver {
  constructor(@InjectRepository(User) private userRepo: Repository<User>) {}

  @Query(type => User)
  getUser(
    @Arg("id", type => Int)
    id: number
  ) {
    return this.userRepo.findOneOrFail({
      where: {
        id: id
      }
    });
  }

  @Query(type => User, { nullable: true })
  whoami(@Ctx() { auth }: RootContext) {
    if (!auth.authorized) {
      return null;
    }

    return auth.user;
  }

  @Mutation(type => User)
  async login(@Args() { password, name }: LoginInput, @Ctx() { auth }: RootContext){
    await auth.login(name, password);
    return auth.user;
  }

  @Mutation(type => User)
  async createUser(@Args() { password, name, roleId }: AddUserInput): Promise<
    User
  > {
    let user = this.userRepo.create({
      name,
      hash: await bcrypt.hash(password, 10),
      role: {
        id: roleId
      }
    });

    return this.userRepo.save(user);
  }

  @Mutation(type => User)
  async deleteUser(@Args() { id }: DeleteUserInput): Promise<User> {
    let user = await this.userRepo.findOneOrFail(id);
    await this.userRepo.delete(id);
    return user;
  }

  @Mutation(type => User)
  async updateUserRole(@Args() { id }: UpdateUserRole): Promise<User> {
    let user = await this.userRepo.findOneOrFail(id);
    await this.userRepo.delete(id);
    return user;
  }

  @Query(type => [User])
  async getUsers(@Args() { skip, take }: PaginationArgs): Promise<User[]> {
    return await this.userRepo.find({
      skip,
      take
    });
  }

  @FieldResolver(type => Role)
  async role(@Root() user: User): Promise<Role> {
    let role = (await this.userRepo
      .createQueryBuilder()
      .relation(User, "role")
      .of(user)
      .loadOne()) as Role;

    return role;
  }
}
