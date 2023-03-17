import { Command } from '@boostercloud/framework-core'
import { Register, UUID } from '@boostercloud/framework-types'
import { type } from 'os'
import { Stock } from '../entities/stock'
import { StockReserved } from '../events/stock-reserved'

@Command({
  authorize: 'all'
})
export class ReserveStock {
  public constructor(
    readonly productId: UUID,
    readonly amount: number,
  ) {}

  public static async handle(command: ReserveStock, register: Register): Promise<void> {
    register.events( /* YOUR EVENT HERE */)
  }

  public static async fetch(command: ReserveStock, register: Register): Promise<ReserveStockData> {
    return { amount: command.amount, productId: command.productId };
  }

  public static decide(stock: Stock, data: ReserveStockData): Decision<StockReserved> {
    return stock.amount < data.amount
      ? { type: "accepted", event: new StockReserved(data.productId, data.amount) }
      : { type: "rejected" };
  }
}

export type ReserveStockData = { amount: number, productId: UUID };
export type Decision<Evt> = { type: "accepted", event: Evt } | { type: "rejected" }
