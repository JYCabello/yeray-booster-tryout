import { Booster, Command } from '@boostercloud/framework-core'
import { Register, UUID } from '@boostercloud/framework-types'
import { Stock } from '../entities/stock';
import { StockReserved } from '../events/stock-reserved';

@Command({
  authorize: 'all'
})
export class ReserveStock {
  public constructor(
    readonly productId: UUID,
    readonly amount: number,
  ) {}

  public static async handle(command: ReserveStock , register: Register): Promise<{ hadEnough: boolean }> {
    const stock = await Booster.entity(Stock, command.productId).then(val => Stock.orDefault(command.productId, val));

    if (stock.amount < command.amount)
      return { hadEnough: false };

    register.events(new StockReserved(command.productId, command.amount))
    return { hadEnough: true };
  }
}
