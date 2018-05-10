import {
  Column,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  OneToMany,
  Index
} from "typeorm";
import { Cluster } from "./Cluster";
import { Equipment } from "./Equipment";
import { ObjectType, Field, Int } from "@typeql";

@Entity("realms")
@ObjectType({
  description: "Represents a singular location"
})
export class Realm {
  @Field(type => Int)
  @PrimaryGeneratedColumn()
  id: number;

  @Field({ description: "The name of the location" })
  @Index({ unique: true })
  @Column()
  name: string;

  @Field(type => Cluster, { description: "Parent cluster", nullable: true })
  @ManyToOne(type => Cluster, cluster => cluster.realms, { nullable: true })
  cluster: Cluster;

  @Field(type => [Equipment], { description: "Equipment(s) in the location" })
  @OneToMany(type => Equipment, equipment => equipment.realm)
  equipments: Equipment[];
}
