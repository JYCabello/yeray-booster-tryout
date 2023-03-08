import { PrepareReserveStock } from '../events/prepare-reserve-stock'
import { Booster, EventHandler } from '@boostercloud/framework-core'
import { Register } from '@boostercloud/framework-types'
import { Stock } from '../entities/stock'
import { CommitReserveStock } from '../events/commit-reserve-stock';
import { RejectReserveStock } from '../events/reject-reserve-stock';
import { AsyncCommandStarted } from '../events/async-command-started';
import { AsyncCommandAccepted } from '../events/async-command-accepted';
import { AsyncCommandRejected } from '../events/async-command-rejected';

@EventHandler(PrepareReserveStock)
export class PrepareReserveStockHandler {
  public static async handle(event: PrepareReserveStock, register: Register): Promise<void> {
    // TODO: Ask around if it's actually possible to not have the entity.
    const stock: Stock = await Booster.entity(Stock, event.entityID()) as Stock;

    if (stock.toRetry.some(cId => cId == event.commandId))
      register.events(
        new PrepareReserveStock(event.productId, event.amount, event.commandId, stock.revision),
        new AsyncCommandStarted(event.commandId)
      );
    
    if (stock.toCommit.some(cId => cId == event.commandId))
      register.events(
        new CommitReserveStock(event.productId, event.commandId),
        new AsyncCommandAccepted(event.commandId)
      );

    if (stock.toReject.some(cId => cId == event.commandId))
      register.events(
        new RejectReserveStock(event.productId, event.commandId),
        new AsyncCommandRejected(event.commandId)
      );
  }
}
