import { Entity, Reduces } from '@boostercloud/framework-core'
import { UUID } from '@boostercloud/framework-types'
import { AsyncCommandStarted } from '../events/async-command-started'
import { AsyncCommandAccepted } from '../events/async-command-accepted'
import { AsyncCommandRejected } from '../events/async-command-rejected'

@Entity
export class AsyncCommand {
  public constructor(
    public readonly id: UUID,
    readonly state: string,
  ) {}

  @Reduces(AsyncCommandStarted)
  public static reduceAsyncCommandStarted(event: AsyncCommandStarted, currentAsyncCommand?: AsyncCommand): AsyncCommand {
    return new AsyncCommand(event.entityID(), "processing");
  }

  @Reduces(AsyncCommandAccepted)
  public static reduceAsyncCommandAccepted(event: AsyncCommandAccepted, currentAsyncCommand?: AsyncCommand): AsyncCommand {
    return new AsyncCommand(event.entityID(), "accepted");
  }

  @Reduces(AsyncCommandRejected)
  public static reduceAsyncCommandRejected(event: AsyncCommandRejected, currentAsyncCommand?: AsyncCommand): AsyncCommand {
    return new AsyncCommand(event.entityID(), "rejected");
  }

}
