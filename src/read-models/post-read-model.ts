import { ReadModel, Projects } from '@boostercloud/framework-core'
import { UUID, ProjectionResult } from '@boostercloud/framework-types'
import { Post } from '../entities/post'

@ReadModel({
  authorize: // Specify authorized roles here. Use 'all' to authorize anyone
})
export class PostReadModel {
  public constructor(
    public id: UUID,
    readonly title: string,
    readonly author: string,
  ) {}

  @Projects(Post, "id")
  public static projectPost(entity: Post, currentPostReadModel?: PostReadModel): ProjectionResult<PostReadModel> {
    return new PostReadModel(entity.id, entity.title, entity.author)
  }

}
