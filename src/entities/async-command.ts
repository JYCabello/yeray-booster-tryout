import { Entity, Reduces } from '@boostercloud/framework-core'
import { UUID } from '@boostercloud/framework-types'
import { CommandAccepted } from '../events/command-accepted'
import { CommandRejected } from '../events/command-rejected'

@Entity
export class AsyncCommand {
  public constructor(
    public id: UUID,
    readonly state: string,
  ) {}

  @Reduces(CommandAccepted)
  public static reduceCommandAccepted(event: CommandAccepted): AsyncCommand {
    return new AsyncCommand(event.entityID(), "accepted");
  }

  @Reduces(CommandRejected)
  public static reduceCommandRejected(event: CommandRejected): AsyncCommand {
    return new AsyncCommand(event.entityID(), "rejected");
  }

}
