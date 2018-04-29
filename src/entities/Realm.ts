import {
  Column,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  OneToMany
} from "typeorm";
import { Cluster } from "./Cluster";
import { Equipment } from "./Equipment";

@Entity("realms")
export class Realm {
  @PrimaryGeneratedColumn() id: number;

  @Column() name: string;

  @ManyToOne(type => Cluster, realm => realm.children)
  parent: Cluster;

  @OneToMany(type => Equipment, equipment => equipment.location)
  equipments: Equipment[];
}
