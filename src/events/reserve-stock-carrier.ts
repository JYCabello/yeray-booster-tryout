import { Event } from '@boostercloud/framework-core'
import { UUID } from '@boostercloud/framework-types'
import { ReserveStockData } from '../commands/reserve-stock'

@Event
export class ReserveStockCarrier {
  public constructor(
    readonly data: ReserveStockData,
  ) {}

  public entityID(): UUID {
    return this.data.productId;
  }
}
