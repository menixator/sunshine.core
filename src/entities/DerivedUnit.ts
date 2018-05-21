import { Unit } from "@entities/Unit";
import { Field, Int, ObjectType } from "@typeql";
import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from "typeorm";

@Entity("derived_unit")
@ObjectType({
  description: "Represents a collection of Units"
})
export class DerivedUnit {
  @Field(type => Int)
  @PrimaryGeneratedColumn()
  id: number;

  @Field(type => Unit, {
    nullable: false,
    description: "The unit that this unit was derived from"
  })
  @ManyToOne(type => Unit, {
    nullable: false,
    onDelete: "CASCADE",
    onUpdate: "CASCADE"
  })
  parent: Unit;

  @Field({
    nullable: false,
    description: "Singular full name of the unit. Eg: Watt"
  })
  @Column({ nullable: false })
  singular: string;

  @Field({
    nullable: false,
    description: "Plural full name of the unit: Eg: Watts"
  })
  @Column({ nullable: false })
  plural: string;

  @Field({
    nullable: false,
    description: "Singular symbol for the unit: Eg: W"
  })
  @Column({ nullable: false })
  symSingular: string;

  @Field({
    nullable: false,
    description: "Pluaral symbol for the unit: Eg: kW"
  })
  @Column({ nullable: false })
  symPlural: string;

  @Field(type => Int, {
    nullable: false,
    description: "Multiplier to modify the base unit"
  })
  @Column({ nullable: false })
  mult: number;
}
