import { ReadModel, Projects } from '@boostercloud/framework-core'
import { UUID, ProjectionResult } from '@boostercloud/framework-types'
import { Stock } from '../entities/stock'

@ReadModel({
  authorize: 'all'
})
export class Inventory {
  public constructor( 
    public id: UUID,
    readonly amount: number,
  ) {}

  @Projects(Stock, "id")
  public static projectStock(entity: Stock, currentInventory?: Inventory): ProjectionResult<Inventory> {
    return new Inventory(entity.id, entity.amount)
  }

}
