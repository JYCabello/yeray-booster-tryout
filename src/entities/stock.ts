import { Entity, Reduces } from '@boostercloud/framework-core'
import { UUID } from '@boostercloud/framework-types'
import { ReserveStock } from '../commands/reserve-stock'
import { ReserveStockCarrier } from '../events/reserve-stock-carrier'
import { StockReceived } from '../events/stock-received'
import { StockReservationRejected } from '../events/stock-reservation-rejected'
import { StockReserved } from '../events/stock-reserved'

@Entity
export class Stock {
  public constructor(
    public readonly id: UUID,
    readonly amount: number,
    readonly accepted: StockReserved[],
    readonly rejected: StockReservationRejected[],
  ) {}

  @Reduces(ReserveStockCarrier)
  public static reduceReserveStockCarrier(event: ReserveStockCarrier, currentStock?: Stock): Stock {
    const current = Stock.defaulted(event.entityID(), currentStock);
    const projected = ReserveStock.decide(current, event);
    switch (projected.type) {
      case "accepted":
        return new Stock(
          current.id,
          current.amount - event.data.amount,
          [...current.accepted, projected.event],
          current.rejected);
      case "rejected":
        return new Stock(
          current.id,
          current.amount,
          current.accepted,
          [...current.rejected, projected.event]);
    }
  }

  @Reduces(StockReceived)
  public static reduceStockReceived(event: StockReceived, currentStock?: Stock): Stock {
    const current = Stock.defaulted(event.entityID(), currentStock);
    return new Stock(
      current.id,
      current.amount + event.amount,
      current.accepted,
      current.rejected);
  }

  @Reduces(StockReserved)
  public static reduceStockReserved(event: StockReserved, currentStock?: Stock): Stock {
    const current = Stock.defaulted(event.entityID(), currentStock);
    return new Stock(
      current.id,
      current.amount,
      current.accepted.filter(a => a.commandId !== event.commandId),
      current.rejected);
  }

  @Reduces(StockReservationRejected)
  public static reduceStockReservationRejected(event: StockReservationRejected, currentStock?: Stock): Stock {
    const current = Stock.defaulted(event.entityID(), currentStock);
    return new Stock(
      current.id,
      current.amount,
      current.accepted,
      current.rejected.filter(a => a.commandId !== event.commandId));
  }

  public static defaulted(id: UUID, current?: Stock): Stock {
    return current || new Stock(id, 0, [], []);
  }

}
