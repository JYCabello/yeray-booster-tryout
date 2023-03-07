import { Entity, Reduces } from '@boostercloud/framework-core'
import { UUID } from '@boostercloud/framework-types'
import { PrepareReserveStock } from '../events/prepare-reserve-stock'

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
      return stock.revise().withCommit(event.commandId);
    
    return stock.revise().withReject(event.commandId);
  }

  public static orDefault(id: UUID, current?: Stock): Stock {
    if (current)
      return current;
    return new Stock(id, 0, 0, [], [], []);
  }

  public revise(): Stock {
    return new Stock(
      this.id,
      this.amount,
      this.revision + 1,
      this.toCommit,
      this.toReject,
      this.toRetry);
  }

  public withRetry(commandId: UUID): Stock {
    return new Stock(
      this.id,
      this.amount,
      this.revision,
      this.toCommit,
      this.toReject,
      [commandId, ...this.toRetry]);
  }

  public withCommit(commandId: UUID): Stock {
    return new Stock(
      this.id,
      this.amount,
      this.revision,
      [commandId, ...this.toCommit],
      this.toReject,
      this.toRetry.filter(id => id != commandId));
  }

  public withReject(commandId: UUID): Stock {
    return new Stock(
      this.id,
      this.amount,
      this.revision,
      this.toCommit,
      [commandId, ...this.toReject],
      this.toRetry.filter(id => id != commandId));
  }

}
