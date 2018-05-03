import { ArgsType, Field, Int } from "@typeql";

@ArgsType()
export class PaginationArgs {
  @Field(type => Int, { nullable: true })
  skip = 0;

  @Field(type => Int, { nullable: true })
  take = 25;
}
