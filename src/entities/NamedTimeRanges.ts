import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity("named_time_ranges")
export class NamedTimeRange {
  @PrimaryGeneratedColumn() id: number;
  @Column() name: string;
  @Column() value: number;
}
