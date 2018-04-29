import {
  Column,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  OneToOne
} from "typeorm";
import { Equipment } from "./Equipment";
import { NamedTimeRange } from "./NamedTimeRanges";

@Entity("measurements")
export class Measurement {
  @PrimaryGeneratedColumn() id: number;
  @Column() name: string;

  @OneToOne(type => NamedTimeRange)
  type: NamedTimeRange;

  @ManyToOne(type => Equipment)
  equipment: Equipment;
}
