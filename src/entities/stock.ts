import { Entity, Reduces } from '@boostercloud/framework-core'
import { UUID } from '@boostercloud/framework-types'
import { Decision, ReserveStock } from '../commands/reserve-stock'
import { ReserveStockCarrier } from '../events/reserve-stock-carrier'
import { StockReceived } from '../events/stock-received'
import { StockReserved } from '../events/stock-reserved'

@Entity
export class Stock {
  public constructor(
    public readonly id: UUID,
    readonly amount: number,
    readonly accepted: { commandId: UUID, event: StockReserved }[],
    readonly rejected: { commandId: UUID }[],
  ) {}

  @Reduces(ReserveStockCarrier)
  public static reduceReserveStockCarrier(event: ReserveStockCarrier, currentStock?: Stock): Stock {
    const current = currentStock || this.defaulted(event.entityID());
    const projected = ReserveStock.decide(current, event.data);
    switch (projected.type) {
      case "accepted":
        return new Stock(
          current.id,
          current.amount + event.data.amount,
          [...current.accepted, { commandId: event.commandId, event: projected.event }],
          current.rejected);
      case "rejected":
        return new Stock(
          current.id,
          current.amount + event.data.amount,
          current.accepted,
          [...current.rejected, { commandId: event.commandId }]);
    }
  }


  @Reduces(StockReceived)
  public static reduceStockReceived(event: StockReceived, currentStock?: Stock): Stock {
    return currentStock || this.defaulted(event.entityID());
  }

  @Reduces(StockReserved)
  public static reduceStockReserved(event: StockReserved, currentStock?: Stock): Stock {
    return currentStock || this.defaulted(event.entityID());
  }

  public static defaulted(id: UUID): Stock {
    return new Stock(id, 0, [], []);
  }

}
