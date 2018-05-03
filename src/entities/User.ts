import {
  Column,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  Index
} from "typeorm";
import { Role } from "./Role";
import { ObjectType, Field, Int } from "@typeql";

@Entity("users")
@ObjectType({
  description: "Represents an arbitrary user of the application"
})
export class User {
  @Field(type => Int)
  @PrimaryGeneratedColumn()
  id: number;
  
  @Field(type => Role, {
    nullable: false,
    description: "The Role of the user"
  })
  @ManyToOne(type => Role, role => role.users, {
    nullable: false,
    onDelete: "CASCADE",
    onUpdate: "CASCADE"
  })
  role: Role;

  @Field({ nullable: false, description: "The name assigned to the user" })
  @Index({ unique: true })
  @Column({ nullable: false })
  name: string;

  @Column({ nullable: false })
  hash: string;
}
