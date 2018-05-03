import { Unit } from "@entities/Unit";
import { Field, Int, ObjectType } from "@typeql";
import {
  Column,
  Entity,
  PrimaryGeneratedColumn,
  OneToMany,
  ManyToOne,
  Unique
} from "typeorm";
import { NamedTimeRange } from "@entities/NamedTimeRange";
import { MeasurementReading } from "@entities/MeasurementReading";
import { Equipment } from "@entities/Equipment";

@Entity("measurement_definitions")
@ObjectType({
  description:
    "Represents the structure and metadata of measurements that will be taken from an equipment"
})
@Unique("equipment_measurement_definition", ["equipment", "name"])
export class MeasurementDefinition {
  @Field(type => Int)
  @PrimaryGeneratedColumn()
  id: number;

  @Field({ nullable: false })
  @Column({ nullable: false })
  name: string;

  @Field()
  @ManyToOne(type => NamedTimeRange)
  range: NamedTimeRange;

  @Field(type => Unit, { nullable: false })
  @ManyToOne(type => Unit, { nullable: false })
  unit: Unit;

  @Field(type => Equipment, { nullable: false })
  @ManyToOne(type => Equipment, equipment => equipment.measurements, {
    nullable: false
  })
  equipment: Equipment;

  @Field(type => [MeasurementReading])
  @OneToMany(type => MeasurementReading, reading => reading.id)
  readings: MeasurementReading[];
}
