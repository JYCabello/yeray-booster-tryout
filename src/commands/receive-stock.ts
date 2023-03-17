import { Command } from '@boostercloud/framework-core'
import { Register, UUID } from '@boostercloud/framework-types'

@Command({
  authorize: 'all'
})
export class ReceiveStock {
  public constructor(
    readonly productId: UUID,
    readonly amount: number,
  ) {}

  public static async handle(command: ReceiveStock , register: Register): Promise<void> {
    register.events( /* YOUR EVENT HERE */)
  }
}
