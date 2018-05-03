import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn
} from "typeorm";
import { User } from "./User";
import { ObjectType, Field } from "@typeql";

export const LAST_TOUCHED_EXPIRATION = 1 * 24 * 60 * 60 * 1000;

@Entity("auth_tokens")
@ObjectType({
  description: "A token used to keep a user logged into the application"
})
export class AuthToken {
  @Field({
    description: "Authentication token identifier"
  })
  @PrimaryGeneratedColumn()
  id: number;

  @Field({
    description: "The identifier iteself"
  })
  @Field()
  @Column()
  value: string;

  @Field()
  @CreateDateColumn()
  created: Date;

  @Field()
  @Column({ type: "datetime", default: () => "CURRENT_TIMESTAMP" })
  lastTouched: Date;

  get expired() {
    return Date.now() - this.lastTouched.getTime() > LAST_TOUCHED_EXPIRATION;
  }

  @ManyToOne(type => User)
  @JoinColumn()
  user: User;
}
