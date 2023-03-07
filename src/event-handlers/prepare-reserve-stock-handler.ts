import { PrepareReserveStock } from '../events/prepare-reserve-stock'
import { EventHandler } from '@boostercloud/framework-core'
import { Register } from '@boostercloud/framework-types'

@EventHandler(PrepareReserveStock)
export class PrepareReserveStockHandler {
  public static async handle(event: PrepareReserveStock, register: Register): Promise<void> {
    
  }
}
