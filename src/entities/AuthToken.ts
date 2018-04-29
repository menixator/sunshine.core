import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn
} from "typeorm";
import { User } from "./User";

export const LAST_TOUCHED_EXPIRATION = 1 * 24 * 60 * 60 * 1000;

@Entity("auth_tokens")
export class AuthToken {
  @PrimaryGeneratedColumn() id: number;

  @Column() value: string;

  @CreateDateColumn() created: Date;

  @Column({ type: "datetime", default: () => "CURRENT_TIMESTAMP" })
  lastTouched: Date;

  get expired() {
    return Date.now() - this.lastTouched.getTime() > LAST_TOUCHED_EXPIRATION;
  }

  @ManyToOne(type => User)
  @JoinColumn()
  user: User;
}
