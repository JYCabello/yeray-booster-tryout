import { Event } from '@boostercloud/framework-core'
import { UUID } from '@boostercloud/framework-types'
import { ReserveStockData } from '../commands/reserve-stock'
import { CommandCarrier } from './command-carrier';

@Event
export class ReserveStockCarrier implements CommandCarrier<ReserveStockData> {
  public constructor(
    public readonly data: ReserveStockData,
    public readonly commandId: UUID
  ) { }

  public entityID(): UUID {
    return this.data.productId;
  }
}
