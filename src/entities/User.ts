import {
  Column,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  Index
} from "typeorm";
import { Role } from "./Role";

@Entity("users")
export class User {
  @PrimaryGeneratedColumn() id: number;
  @ManyToOne(type => Role, { onDelete: "CASCADE", onUpdate: "CASCADE" })
  role: Role;

  @Index({ unique: true })
  @Column()
  name: string;

  @Column({ nullable: false })
  hash: string;
}
