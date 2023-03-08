import { Event } from '@boostercloud/framework-core'
import { UUID } from '@boostercloud/framework-types'

@Event
export class StockReceived {
  public constructor(
    readonly productId: UUID,
    readonly amount: number,
  ) {}

  public entityID(): UUID {
    return this.productId;
  }
}
