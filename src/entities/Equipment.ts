import { CounterDefinition } from "@entities/CounterDefinition";
import { MeasurementDefinition } from "@entities/MeasurementDefinition";
import { Field, Int, ObjectType } from "@typeql";
import {
  Column,
  Entity,
  Index,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique
} from "typeorm";
import { Realm } from "./Realm";

@Entity("equipments")
@Unique("realm_equipment_idx", ["realm", "name"])
@ObjectType({
  description: "Represents a piece of equipment"
})
export class Equipment {
  @Field(type => Int)
  @PrimaryGeneratedColumn()
  id: number;

  @Field({ nullable: false })
  @Column({ nullable: false })
  name: string;

  @Field(type => Realm, { nullable: false })
  @ManyToOne(type => Realm, realm => realm.equipments, {
    nullable: false,
    onDelete: "CASCADE",
    onUpdate: "CASCADE"
  })
  realm: Realm;

  @Field({ nullable: false })
  @Index({ unique: true })
  @Column({ nullable: false })
  comparator: String;

  @Field(type => [MeasurementDefinition])
  @ManyToOne(type => MeasurementDefinition)
  measurements: MeasurementDefinition[];

  @Field(type => [CounterDefinition])
  @ManyToOne(type => CounterDefinition)
  counters: CounterDefinition[];
}
