import { Event } from '@boostercloud/framework-core'
import { UUID } from '@boostercloud/framework-types'

@Event
export class CommitReserveStock {
  public constructor(
    readonly productId: UUID,
    readonly commandId: UUID,
  ) {}

  public entityID(): UUID {
    return this.productId;
  }
}
