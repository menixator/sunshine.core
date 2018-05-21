import { CounterReading } from "@entities/CounterReading";
import { Args, FieldResolver, Resolver, Root } from "@typeql";
import { Repository } from "typeorm";
import { InjectRepository } from "typeorm-typedi-extensions";
import { CounterDefinition } from "../entities/CounterDefinition";
import { PaginationArgs } from "../types/Pagination";

@Resolver(type => CounterDefinition)
export class CounterDefinitionResolver {
  constructor(
    @InjectRepository(CounterDefinition)
    private counterDefinitionRepository: Repository<CounterDefinition>
  ) {}

  @FieldResolver(type => [CounterReading])
  async readings(
    @Root() counterDefinition: CounterDefinition,
    @Args() { skip, take }: PaginationArgs
  ) {
    return (await this.counterDefinitionRepository
      .createQueryBuilder()
      .take(take)
      .skip(skip)
      .relation(CounterDefinition, "readings")
      .of(counterDefinition)
      .loadMany()) as CounterReading[];
  }
}
