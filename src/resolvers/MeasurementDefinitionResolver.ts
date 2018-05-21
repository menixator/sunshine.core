import { MeasurementReading } from "@entities/MeasurementReading";
import { Args, FieldResolver, Resolver, Root } from "@typeql";
import { Repository } from "typeorm";
import { InjectRepository } from "typeorm-typedi-extensions";
import { MeasurementDefinition } from "../entities/MeasurementDefinition";
import { PaginationArgs } from "../types/Pagination";

@Resolver(type => MeasurementDefinition)
export class MeasurementDefinitionResolver {
  constructor(
    @InjectRepository(MeasurementDefinition)
    private measurementDefinitionRepository: Repository<MeasurementDefinition>
  ) {}

  @FieldResolver(type => [MeasurementReading])
  async readings(
    @Root() measurementDefinition: MeasurementDefinition,
    @Args() { skip, take }: PaginationArgs
  ) {
    return (await this.measurementDefinitionRepository
      .createQueryBuilder()
      .take(take)
      .skip(skip)
      .relation(MeasurementDefinition, "readings")
      .of(measurementDefinition)
      .loadMany()) as MeasurementReading[];
  }
}
