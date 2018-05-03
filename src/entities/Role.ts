import {
  Column,
  Entity,
  PrimaryGeneratedColumn,
  Index,
  OneToMany
} from "typeorm";
import { User } from "./User";
import { ObjectType, Field, Int } from "type-graphql";

@Entity("roles")
@ObjectType({
  description: "Represents a predefined role set"
})
export class Role {
  @Field(type => Int)
  @PrimaryGeneratedColumn()
  id: number;

  @Field()
  @Index({ unique: true })
  @Column()
  name: string;

  @Field(type => [User])
  @OneToMany(type => User, user => user.role, {
    onDelete: "CASCADE",
    onUpdate: "CASCADE"
  })
  users: User[];
}
