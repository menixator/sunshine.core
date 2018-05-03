import {
  Column,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  Index
} from "typeorm";

import { Realm } from "./Realm";

import { ObjectType, Field, Int } from "@typeql";

@Entity("clusters")
@ObjectType({
  description: "Represents a collection of Realms"
})
export class Cluster {
  @Field(type => Int)
  @PrimaryGeneratedColumn()
  id: number;

  @Field()
  @Column()
  @Index({ unique: true })
  name: string;
  
  @Field(type => [Realm], {
    description: "Realms contained in the cluster"
  })
  @OneToMany(type => Realm, equipment => equipment.id)
  children: Realm[];
}
