import {
  Column,
  Entity,
  PrimaryGeneratedColumn,
  Index,
  OneToMany
} from "typeorm";
import { User } from "./User";

@Entity("roles")
export class Role {
  @PrimaryGeneratedColumn() id: number;

  @Index({ unique: true })
  @Column()
  name: string;

  @OneToMany(type => User, user => user.id, {
    onDelete: "CASCADE",
    onUpdate: "CASCADE"
  })
  users: User[];
}
