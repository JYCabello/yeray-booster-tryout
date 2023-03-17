import { Event } from '@boostercloud/framework-core'
import { UUID } from '@boostercloud/framework-types'

@Event
export class StockReservationRejected {
  public constructor(
    readonly productId: UUID,
    readonly amount: number,
    readonly commandId: UUID,
  ) {}

  public entityID(): UUID {
    return this.productId;
  }
}
