import { Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { User } from "./User";

@Entity("auth_tokens")
export class AuthToken {
  @PrimaryGeneratedColumn() id: number;

  @ManyToOne(type => User)
  @JoinColumn()
  user: User;
}
