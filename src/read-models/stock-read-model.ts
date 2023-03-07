import { ReadModel, Projects } from '@boostercloud/framework-core'
import { UUID, ProjectionResult } from '@boostercloud/framework-types'
import { Stock } from '../entities/stock'

@ReadModel({
  authorize: 'all'
})
export class StockReadModel {
  public constructor(
    public readonly id: UUID,
    readonly amount: number,
  ) {}

  @Projects(Stock, "id")
  public static projectStock(entity: Stock, currentStockReadModel?: StockReadModel): ProjectionResult<StockReadModel> {
    return new StockReadModel(entity.id, entity.amount);
  }
}
