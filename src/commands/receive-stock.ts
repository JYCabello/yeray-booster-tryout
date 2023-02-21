import { Command } from '@boostercloud/framework-core'
import { Register, UUID } from '@boostercloud/framework-types'
import { StockReceived } from '../events/stock-received'

@Command({
  authorize: 'all'
})
export class ReceiveStock {
  public constructor(
    readonly productId: UUID,
    readonly amount: number,
  ) {}

  public static async handle(command: ReceiveStock , register: Register): Promise<void> {
    register.events(new StockReceived(command.productId, command.amount))
  }
}
