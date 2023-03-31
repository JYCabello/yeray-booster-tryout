# Event Projections
## The problem
Inserting events in a stream is an effectful operation, so it can fail, this is not particularly troublesome in command handlers, as they would bubble up the error to the consumer, but in the case of projected events in a handler, it can be hard to track, and it will break workflows that rely on the projected events.

This is specially severe if the amount of projected events is significant and/or there's heavy concurrency, as both Dynamo and Cosmos will throttle.

### Example
If we want to keep track of who is following who in a social media platform, we would start with a `Follow` command, and its consequent event and entity:
```ts
// Ignore the security part for the sake of the example.
@Command({ authorize: 'all'})
export class Follow {
  public constructor(
    readonly userId: UUID,
    readonly toFollow: UUID,
  ) {}

  public static async handle(command: Follow, register: Register): Promise<void> {
    register.events(new Follow(command.userId, command.toFollow));
  }
}


```
