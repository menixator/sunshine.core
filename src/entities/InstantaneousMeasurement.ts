import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { Equipment } from "./Equipment";

@Entity("instantaneous_measurements")
export class InstantaneousMeasurement {
  @PrimaryGeneratedColumn() id: number;
  @Column() name: string;

  @ManyToOne(type => Equipment)
  equipment: Equipment;
}
