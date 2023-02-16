import { Command } from '@boostercloud/framework-core'
import { Register, UUID } from '@boostercloud/framework-types'

@Command({
  authorize: 'all'// Specify authorized roles here. Use 'all' to authorize anyone
})
export class CreatePost {
  public constructor(
    readonly postId: UUID,
    readonly title: string,
    readonly content: string,
    readonly author: string,
  ) {}

  public static async handle(command: CreatePost , register: Register): Promise<void> {
    register.events( /* YOUR EVENT HERE */)
  }
}
