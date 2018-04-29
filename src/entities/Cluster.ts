import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from "typeorm";

import { Realm } from "./Realm";

@Entity("cluster")
export class Cluster {
  @PrimaryGeneratedColumn() id: number;

  @Column() name: string;

  @OneToMany(type => Realm, equipment => equipment.id)
  children: Realm[];
}
