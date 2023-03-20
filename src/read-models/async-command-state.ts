import { ReadModel, Projects } from '@boostercloud/framework-core'
import { UUID, ProjectionResult } from '@boostercloud/framework-types'
import { AsyncCommand } from '../entities/async-command'

@ReadModel({
  authorize: 'all'
})
export class AsyncCommandState {
  public constructor(
    public id: UUID,
    readonly state: string,
  ) {}

  @Projects(AsyncCommand, "id")
  public static projectAsyncCommand(entity: AsyncCommand, currentAsyncCommandState?: AsyncCommandState): ProjectionResult<AsyncCommandState> {
    return new AsyncCommandState(entity.id, entity.state);
  }

}
