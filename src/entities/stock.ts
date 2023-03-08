import { Entity, Reduces } from '@boostercloud/framework-core'
import { UUID } from '@boostercloud/framework-types'
import { CommitReserveStock } from '../events/commit-reserve-stock';
import { PrepareReserveStock } from '../events/prepare-reserve-stock'
import { RejectReserveStock } from '../events/reject-reserve-stock';

@Entity
export class Stock {
  public constructor(
    public readonly id: UUID,
    readonly amount: number,
    readonly revision: number,
    readonly toCommit: UUID[],
    readonly toReject: UUID[],
    readonly toRetry: UUID[],
  ) {}

  @Reduces(PrepareReserveStock)
  public static reducePrepareReserveStock(event: PrepareReserveStock, currentStock?: Stock): Stock {
    const stock = Stock.orDefault(event.entityID(), currentStock);
    
    if (event.expectedRevision != stock.revision)
      return stock.revise().withRetry(event.commandId);

    if (stock.amount <= event.amount)
      return stock.revise().setToCommit(event.commandId, event.amount);
    
    return stock.revise().setToReject(event.commandId);
  }

  @Reduces(CommitReserveStock)
  public static reduceCommitReserveStock(event: CommitReserveStock, currentStock?: Stock): Stock {
    return Stock.orDefault(event.entityID(), currentStock).revise().commit(event.commandId);
  }


  @Reduces(RejectReserveStock)
  public static reduceRejectReserveStock(event: RejectReserveStock, currentStock?: Stock): Stock {
    return Stock.orDefault(event.entityID(), currentStock).revise().reject(event.commandId);
  }

  public static orDefault(id: UUID, current?: Stock): Stock {
    if (current)
      return current;
    return new Stock(id, 0, 0, [], [], []);
  }

  private revise(): Stock {
    return new Stock(
      this.id,
      this.amount,
      this.revision + 1,
      this.toCommit,
      this.toReject,
      this.toRetry);
  }

  private withRetry(commandId: UUID): Stock {
    return new Stock(
      this.id,
      this.amount,
      this.revision,
      this.toCommit,
      this.toReject,
      [commandId, ...this.toRetry]);
  }

  private setToCommit(commandId: UUID, amount: number): Stock {
    return new Stock(
      this.id,
      this.amount + amount,
      this.revision,
      [commandId, ...this.toCommit],
      this.toReject,
      this.toRetry).removeFromRetry(commandId);
  }

  private setToReject(commandId: UUID): Stock {
    return new Stock(
      this.id,
      this.amount,
      this.revision,
      this.toCommit,
      [commandId, ...this.toReject],
      this.toRetry).removeFromRetry(commandId);
  }

  private removeFromRetry(commandId: UUID): Stock {
    return new Stock(
      this.id,
      this.amount,
      this.revision,
      this.toCommit,
      this.toReject,
      this.toRetry.filter(id => id != commandId));
  }

  private commit(commandId: UUID): Stock {
    return new Stock(
      this.id,
      this.amount,
      this.revision,
      this.toCommit.filter(id => id != commandId),
      this.toReject,
      this.toRetry);
  }

  private reject(commandId: UUID): Stock {
    return new Stock(
      this.id,
      this.amount,
      this.revision,
      this.toCommit,
      this.toReject.filter(id => id != commandId),
      this.toRetry);
  }

}
