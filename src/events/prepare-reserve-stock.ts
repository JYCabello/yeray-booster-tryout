import { Event } from '@boostercloud/framework-core'
import { UUID } from '@boostercloud/framework-types'

@Event
export class PrepareReserveStock {
  public constructor(
    readonly productId: UUID,
    readonly amount: number,
    readonly commandId: UUID,
    readonly expectedRevision: number,
  ) {}

  public entityID(): UUID {
    return this.productId;
  }
}
