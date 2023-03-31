# Event Projections
## The problem
Inserting events in a stream is an effectful operation, so it can fail, this is not particularly troublesome in command handlers, as they would bubble up the error to the consumer, but in the case of projected events in a handler, it can be hard to track, and it will break workflows that rely on the projected events.

This is specially severe if the amount of projected events is significant and/or there's heavy concurrency, as both Dynamo and Cosmos will throttle.

### Example
If we want to keep track of who is following who in a social media platform, we would start with a `Follow` command, and its consequent event, entity, and a handler to project an event for the person being followed:
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

@Event
export class Followed {
  public constructor(
    readonly userID: UUID,
    readonly toFollow: UUID,
  ) {}

  public entityID(): UUID {
    return this.userID;
  }
}

@Event
export class WasFollowed {
  public constructor(
    readonly userID: UUID,
    readonly follower: UUID,
  ) {}

  public entityID(): UUID {
    return this.userID;
  }
}

@Entity
export class Followship {
  public constructor(
    public id: UUID,
    readonly following: UUID[],
    readonly followers: UUID[],
  ) {}

  @Reduces(Followed)
  public static reduceCommandAccepted(event: Followed, current?: Followship): Followship {
    const user = current || new Followship(event.entityID(), [], []);
    return new Followship(event.entityID(), [...user.following, event.toFollow], user.followers);
  }

  @Reduces(WasFollowed)
  public static reduceCommandRejected(event: WasFollowed, current?: Followship): Followship {
    const user = current || new Followship(event.entityID(), [], []);
    return new Followship(event.entityID(), user.following, [...user.followers, event.follower]);
  }
}

// If this insertion were to fail, the handler will never run and the followed user would not get its `followers` collection updated.
@EventHandler(Followed)
export class FollowedHandler {
  public static async handle(event: Followed, register: Register): Promise<void> {
    register.events(new WasFollowed(event.toFollow, event.userID));
  }
}
```

## How the solution would look
A projection is just a pure function that generates a collection of events derived from the original event. It will be retried until it is successful.
```ts
@Projection(Followed)
export class FollowedProjections {
  public static async handle(event: Followed, register: Register): EventInterface[] {
    return [new WasFollowed(event.toFollow, event.userID)];
  }
}
```

## The inner works of the solution
This will not rely on any existing abstraction, and it heavily depends on the backend, so these are the mechanisms that we would need:

- A way to keep track of which events have been completely processed by a projection.
- A way to deterministically generate idempotency keys for every projected event. Since the projected events can live in different partitions, it is possible that we would insert only some events, with an idempotency key and an upsert operation, we would work around this issue.

