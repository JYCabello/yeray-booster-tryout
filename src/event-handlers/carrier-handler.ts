import { Booster, EventHandler } from '@boostercloud/framework-core'
import { Register } from '@boostercloud/framework-types'
import { Stock } from '../entities/stock'
import { CommandAccepted } from '../events/command-accepted';
import { CommandRejected } from '../events/command-rejected';
import { ReserveStockCarrier } from '../events/reserve-stock-carrier'
import { StockReservationRejected } from '../events/stock-reservation-rejected';
import { StockReserved } from '../events/stock-reserved';

@EventHandler(ReserveStockCarrier)
export class CarrierHandler {
  public static async handle(event: ReserveStockCarrier, register: Register): Promise<void> {
    const entity = await Booster.entity(Stock, event.entityID()) as Stock;
    if (entity.accepted.some(a => a.commandId === event.data.commandId)) {
      register.events(
        new StockReserved(event.entityID(), event.data.amount, event.data.commandId),
        new CommandAccepted(event.data.commandId)
      );
    }
    if (entity.rejected.some(a => a.commandId === event.data.commandId)) {
      register.events(
        new StockReservationRejected(event.entityID(), event.data.amount, event.data.commandId),
        new CommandRejected(event.data.commandId)
      );
    }
  }
}
