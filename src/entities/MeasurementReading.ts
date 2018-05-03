import { MeasurementDefinition } from "@entities/MeasurementDefinition";
import { Field, Int, ObjectType } from "@typeql";
import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from "typeorm";

@Entity("measurement_readings")
@ObjectType({
  description: "Represents a reading acquired from an equipment"
})
export class MeasurementReading {
  @Field(type => Int)
  @PrimaryGeneratedColumn()
  id: number;

  @Field({ nullable: false })
  @Column({ nullable: false })
  value: number;

  @Field(type => Date, { nullable: false })
  @Column({ type: "datetime", nullable: false })
  date: Date;

  @ManyToOne(type => MeasurementDefinition, definition => definition.readings, {
    nullable: false
  })
  definition: MeasurementDefinition;
}
