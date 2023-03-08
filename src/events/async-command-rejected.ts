import { Event } from '@boostercloud/framework-core'
import { UUID } from '@boostercloud/framework-types'

@Event
export class AsyncCommandRejected {
  public constructor(
    readonly commandId: UUID,
  ) {}

  public entityID(): UUID {
    return this.commandId;
  }
}
