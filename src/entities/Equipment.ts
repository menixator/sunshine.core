import {
  Column,
  Entity,
  PrimaryGeneratedColumn,
  ManyToOne,
  OneToMany,
  Index
} from "typeorm";
import { Realm } from "./Realm";
import { InstantaneousMeasurement } from "./InstantaneousMeasurement";
import { Measurement } from "./Measurement";

@Entity("equipments")
export class Equipment {
  @PrimaryGeneratedColumn() id: number;
  @Column() name: string;

  @ManyToOne(type => Realm, realm => realm.equipments)
  location: Realm;

  @Index({ unique: true })
  @Column({ nullable: false })
  comparator: String;

  @OneToMany(
    type => InstantaneousMeasurement,
    measurement => measurement.equipment
  )
  instantenousMeasurements: InstantaneousMeasurement[];

  @OneToMany(type => Measurement, measurement => measurement.equipment)
  measurements: Measurement[];
}
