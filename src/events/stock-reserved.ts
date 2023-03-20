import { Event } from '@boostercloud/framework-core'
import { UUID } from '@boostercloud/framework-types'
import { PreprocessedCommand } from './preprocessed-command';

@Event
export class StockReserved implements PreprocessedCommand {
  public constructor(
    readonly productId: UUID,
    readonly amount: number,
    readonly commandId: UUID,
  ) {}

  public entityID(): UUID {
    return this.productId;
  }
}
