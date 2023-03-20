import { UUID } from "@boostercloud/framework-types";

export interface CommandCarrier<CommandData> {
  readonly commandId: UUID;
  readonly data: CommandData;
}