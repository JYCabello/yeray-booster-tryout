import { Command } from '@boostercloud/framework-core'
import { Register, UUID } from '@boostercloud/framework-types'
import { Stock } from '../entities/stock'
import { ReserveStockCarrier } from '../events/reserve-stock-carrier';
import { StockReservationRejected } from '../events/stock-reservation-rejected';
import { StockReserved } from '../events/stock-reserved'

@Command({
  authorize: 'all'
})
export class ReserveStock {
  public constructor(
    readonly productId: UUID,
    readonly amount: number,
  ) {}

  public static async handle(command: ReserveStock, register: Register): Promise<{ commandId: UUID }> {
    const data = await ReserveStock.fetch(command, register);
    register.events(data);
    return { commandId: data.commandId };
  }

  public static async fetch(command: ReserveStock, register: Register): Promise<ReserveStockCarrier> {
    return new ReserveStockCarrier({ amount: command.amount, productId: command.productId }, UUID.generate());
  }

  public static decide(stock: Stock, carrier: ReserveStockCarrier): Decision<StockReserved, StockReservationRejected> {
    return carrier.data.amount <= stock.amount
      ? { type: "accepted",
          event:
            new StockReserved(
              carrier.data.productId,
              carrier.data.amount,
              carrier.commandId) }
      : { type: "rejected",
          event:
            new StockReservationRejected(
              carrier.data.productId,
              carrier.data.amount,
              carrier.commandId) };
  }
}

export type ReserveStockData = { amount: number, productId: UUID };
export type Decision<Evt, RejEvt> = { type: "accepted", event: Evt } | { type: "rejected", event: RejEvt }
