import { CounterReading } from "@entities/CounterReading";
import { Equipment } from "@entities/Equipment";
import { Unit } from "@entities/Unit";
import { Field, Int, ObjectType } from "@typeql";
import { Column, Entity, ManyToOne, OneToMany, PrimaryGeneratedColumn, Unique } from "typeorm";

@Entity("counter_definition")
@ObjectType({
  description: "Represents a definition for a counter reading"
})
@Unique("equipment_counter_definition", ["equipment", "name"])
export class CounterDefinition {
  @Field(type => Int)
  @PrimaryGeneratedColumn()
  id: number;

  @Field()
  @Column()
  name: string;

  @Field(type => Equipment)
  @ManyToOne(type => Equipment, equipment => equipment.counters)
  equipment: Equipment;

  @Field(type => Unit)
  @ManyToOne(type => Unit)
  unit: Unit;

  @Field(type => [CounterReading])
  @OneToMany(type => CounterReading, reading => reading.definition)
  readings: CounterReading[];
}
