import { Field, Int, ObjectType } from "@typeql";
import { Column, Entity, PrimaryGeneratedColumn, OneToMany } from "typeorm";
import { DerivedUnit } from "@entities/DerivedUnit";

@Entity("units")
@ObjectType({
  description: "Represents a collection of Units"
})
export class Unit {
  @Field(type => Int)
  @PrimaryGeneratedColumn()
  id: number;

  @Field({nullable: false, description: "Singular full name of the unit. Eg: Watt"})
  @Column({nullable: false})
  singular: string;

  @Field({nullable: false, description: "Plural full name of the unit: Eg: Watts"})
  @Column({nullable: false})
  plural: string;

  @Field({nullable: false, description: "Singular symbol for the unit: Eg: W"})
  @Column({nullable: false})
  symSingular: string;

  
  @Field({nullable: false, description: "Pluaral symbol for the unit: Eg: kW"})
  @Column({nullable: false})
  symPlural: string;

  @Field(type => DerivedUnit)
  @OneToMany(type => DerivedUnit, derivedUnit => derivedUnit.parent)
  derivedUnits: DerivedUnit[];
}
