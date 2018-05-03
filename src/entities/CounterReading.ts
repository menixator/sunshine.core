import { CounterDefinition } from "@entities/CounterDefinition";
import { Field, Int, ObjectType } from "@typeql";
import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from "typeorm";

@Entity("counter_readings")
@ObjectType({
  description: "Represents a Counter reading acquired from an equipment"
})
export class CounterReading {
  @Field(type => Int)
  @PrimaryGeneratedColumn()
  id: number;

  @Field({ nullable: false })
  @Column({ nullable: false })
  value: number;

  @Field(type => Date, { nullable: false })
  @Column({ type: "datetime", nullable: false })
  date: Date;

  @ManyToOne(type => CounterDefinition, { nullable: false })
  definition: CounterDefinition;
}
