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

@Entity("realms")
export class Realm {
  @PrimaryGeneratedColumn() id: number;

  @Index({unique: true})
  @Column() name: string;

  @ManyToOne(type => Cluster, realm => realm.children)
  parent: Cluster;

  @OneToMany(type => Equipment, equipment => equipment.location)
  equipments: Equipment[];
}
