import { Booster, Command } from '@boostercloud/framework-core'
import { Register, UUID } from '@boostercloud/framework-types'
import { Stock } from '../entities/stock';
import { PrepareReserveStock } from '../events/prepare-reserve-stock'

@Command({
  authorize: 'all'
})
export class ReserveStock {
  public constructor(
    readonly productId: UUID,
    readonly amount: number,
  ) {}

  public static async handle(command: ReserveStock , register: Register): Promise<{ commandId: UUID }> {
    const commandId = UUID.generate();
    const stock = Stock.orDefault(command.productId, await Booster.entity(Stock, command.productId));
    register.events(new PrepareReserveStock(command.productId, command.amount, commandId, stock.revision));
    return { commandId };
  }
}
