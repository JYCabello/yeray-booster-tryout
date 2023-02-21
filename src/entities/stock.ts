import { Entity, Reduces } from '@boostercloud/framework-core'
import { UUID } from '@boostercloud/framework-types'
import { StockReserved } from '../events/stock-reserved'
import { StockReceived } from '../events/stock-received'

@Entity
export class Stock {
  public constructor(
    public id: UUID,
    readonly amount: number,
    readonly revision: number,
  ) {}

  @Reduces(StockReserved)
  public static reduceStockReserved(event: StockReserved, currentStock?: Stock): Stock {
    const stock = Stock.orDefault(event.entityID(), currentStock)
    return new Stock(stock.id, stock.amount - event.amount, stock.revision + 1)
  }

  @Reduces(StockReceived)
  public static reduceStockReceived(event: StockReceived, currentStock?: Stock): Stock {
    const stock = Stock.orDefault(event.entityID(), currentStock)
    return new Stock(stock.id, stock.amount + event.amount, stock.revision + 1)
  }

  public static orDefault(id: UUID, stock: Stock | undefined): Stock {
    if (stock)
      return stock;
    return new Stock(id, 0, 0)
  }
}
