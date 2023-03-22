# Concurrency Aware Command Abstraction
## The problem
When a command is received it is possible to request the entity in the handler, make a decision based on that information and emit the resulting event, except it is not guaranteed that the emitted event will be inserted in a stream that is still consistent with the decision made.

### Example
At the moment of retrieving stock in an inventory management application, it should be possible to verify that there is enough units of the product available.

```ts
@Command({
  authorize: 'all'
})
export class ReserveStock {
  public constructor(
    readonly productId: UUID,
    readonly amount: number,
  ) {}

  public static async handle(command: ReserveStock , register: Register): Promise<{ hadEnough: boolean }> {
    const stock = 
      await Booster
        .entity(Stock, command.productId)
        .then(val => Stock.orDefault(command.productId, val));

    if (stock.amount < command.amount)
      return { hadEnough: false };

    register.events(new StockReserved(command.productId, command.amount))
    return { hadEnough: true };
  }
}
```

Afterwards, the entity will process the event, updating the amount value:

```ts
@Entity
export class Stock {
  public constructor(
    public readonly id: UUID,
    public readonly amount: number,
  ) {}

  @Reduces(StockReserved)
  public static reduceStockReserved(event: StockReserved, currentStock?: Stock): Stock {
    const stock = Stock.orDefault(event.entityID(), currentStock);
    return new Stock(stock.id, stock.amount - event.amount);
  }

  public static orDefault(id: UUID, current?: Stock): Stock {
    return current || new Stock(id, 0);
  }
}
```

The issue with this, is that it is perfectly possible (and often happens) that a second consumer attempts the same command in the time the first takes to make the decision and insert its event into the stream, rendering the decision made by the second one inconsistent.

```mermaid
sequenceDiagram
  autonumber
  Reserve 6 units ->> Entity: Request current state
  Reserve 5 units ->> Entity: Request current state
  Entity ->> Reserve 6 units: Stock available: 8
  Note right of Reserve 6 units: 6 <= 8, can reserve
  Entity ->> Reserve 5 units: Stock available: 8
  Note right of Reserve 5 units: 5 <= 8, can reserve
  Reserve 5 units ->> Reserve 5 units: A bit of latency, since the 6 units one started first
  Reserve 6 units ->> Stream: Stock reserved: 6
  Stream ->> Entity: Stock reserved: 6
  Note right of Entity: New stock available: 8 - 6 = 2
  Reserve 5 units ->> Stream: Stock reserved: 5
  Stream ->> Entity: Stock reserved: 5
  rect rgb(120, 0, 0)
    Note right of Entity: New stock available: 2 - 5 = -3<br/>Panic breaks in the warehouse
  end
```

## The journey to the solution
Booster is effectively a distributed runtime, but since the code is stateless, any form of network negotiation between instances would mean an engineering effort that is unlikely to succeed while keeping the serverless attractive of Booster. The only stateful place is the storage, which presents an interesting engineering puzzle in terms of resource economy, because in cases where storage is the only available state, locks are a well proven solution, but they present resource, performance and fault tolerance challenges that have some many "corner cases" that the term itself loses its meaning.

A pessimistic lock was immediately put aside, considering that an optimistic lock or a solution with no locks at all would be easier to maintain, less error-prone, and less expensive in terms of cloud bills, at least in the case of the no locks one, since it would mean fewer read/write operations. Only after failing to solve the problem deterministically with one of the others, this option would be considered again.

Since optimistic locking is usually the easier to maintain and the less error-prone of the three, a first attempt was made to solve the problem with an optimistic lock using a revision mechanism, and it revealed to be intensive in resources: With the number of meta-events used to handle the concurrency growing logistically, a form of exponential growth (common in epidemics, which is fitting, given how one could feel when looking at the cloud bill), with the amount of concurrent requests. Adding insult to injury, the metadata needed to handle the entity versioning would mean that this feature would only work with new entities defined as `Concurrency Aware`, or it would require a migration process that would warrant its own RFC.

The non-locking solution, showed a significant smaller resource footprint, a not-so-complex implementation, compatible with the current state of affairs, and significantly more performant.

## How the solution would look
If we had the solution already, its documentation would look like this:
### Concurrency Aware Commands
There are cases where absolute certainty that the event being emitted is consistent with the state of the system is required. One case would be making sure that a product only be reserved when there's enough stock. Lacking that certainty, two users could each claim a reservation over the last unit of a product. For this, we can use a `Concurrency Aware Command`.

```ts
@Command({
  authorize: 'all'
})
export class ReserveStock {
  public constructor(
    readonly productId: UUID,
    readonly amount: number,
  ) {}

  public static async fetch(
    command: ReserveStock,
    requestContext: RequestContext
  ): Promise<ReserveStockData> {
    return { amount: command.amount, productId: command.productId };
  }

  public static decide(
    stock: Stock,
    carrier: ReserveStockData
  ): Decision<StockReserved, StockReservationRejected> {
    return carrier.data.amount <= stock.amount
      ? { type: "accepted",
          event:
            new StockReserved(
              carrier.data.productId,
              carrier.data.amount,
              carrier.commandId) }
      : { type: "rejected",
          event:
            new StockReservationRejected(
              carrier.data.productId,
              carrier.data.amount,
              carrier.commandId) };
  }

  public entityID(): UUID {
    return this.productId;
  }
}

type ReserveStockData = { amount: number, productId: UUID };
```

The `fetch` function will request any information needed from the request context or any third parties, and produce all the information needed to decide whether to accept or reject the command. Notice that the `fetch` function receives a `RequestContext` instead of the standard `Register`, this is because the decision as to which event to send has not been made yet.

The `decide` function will then receive that information and will, as its name implies, accept or reject the command, the rejection event is optional and can be typed as `void`.

The `Decision` type looks like this:
```ts
export type Decision<Evt, RejEvt> =
  { type: "accepted", event: Evt } |
  { type: "rejected", event: RejEvt }
```
Event handlers and entities for this kind of commands and events look exactly the same.

These commands are meant to act on a single entity, so you need to implement the `entityID` member. Also, the emitted events do not need such member, it is recommended, for the sake of convenience, to implement it, though.

The endpoint for the command will always return an object in the shape of `{ commandId: UUID }`, with this identifier, we can query the `AsyncCommandState` endpoint:
```graphql
query {
  AsyncCommandState(id: "ad920755-f593-46e8-9960-ba4f606893f3") {
    state
  }
}
```

Which will return:
```json
{
  "data": {
    "AsyncCommandState": null
  }
}
```
Until the command has been processed, returning then:
```json
{
  "data": {
    "AsyncCommandState": {
      "state": "accepted"
    }
  }
}
```

## Notes on the solution API
Two important parts are not represented in the documentation:
1. The way to define the "data", "success event" and "rejection event".
1. How would the CLI look like.

Requesting suggestions on this part.

## The inner works of the solution
The command handler will run the fetch function, and insert that data in a `meta event` called `Prepare` that carries the data needed to make the decision and the identifier of the command.

The runtime will then intercept the reduction of that event, which will not be visible to the consumer, and will call the `decide` function on the handler, reducing the resulting event on the entity directly. After that, it will insert the event, together with the command identifier in one of two collections that will be on the metadata of the entity, the `rejected` or `accepted` one, depending on the decision.

An internal handler, not visible for the consumer, will receive the `Prepare` event and will, depending on whether the entity has the command in the `Accept` or in the `Reject` collection:
- Emit a `Command Accepted` or `Command Rejected` event.
- Emit an `Echo` event that carries either of the events.

### The Echo event
The entity, then, will reduce the `Echo` event by removing the contained event from the corresponding internal collection, ignoring the actual event, because it was already reduced.

Another handler, the `Echo` handler will then trigger any handlers defined for the Acceptance or Rejection events.

### The Command Accepted/Rejected event
These events exist only to update the `Command Result` entity, which will project into its own read model `AsyncCommandState`, which the consumer can use to get the result of the operation.

### A diagram of the solution
```mermaid
stateDiagram-v2
  state "Read Model" as rm
  state "Command Handler" as ch
  state "Prepare Event" as pe
  state "Entity" as ent
  state "Entity" as ent2
  state "Entity" as ent3
  state "Prepare Handler" as ph
  state accepting_command <<choice>>
  state processing_accepted_event <<choice>>
  state processing_rejected_event <<choice>>
  state "Entity after accepting" as eaa
  state "Entity that accepted" as eta
  state "Entity that rejected" as etr
  state "Entity after rejecting" as ear
  state "Command Accepted" as ca
  state "Command Rejected" as cmdrjct
  state "Echo" as ma
  state "Echo" as mr
  state "Meta Event" as me
  state "Command Result" as cmdrslt
  state "Command Result" as cmdrsltrm
  state "Accept Handler" as ah
  state "Reject Handler" as rh
  state "Decision (atomic, pure operation)" as decision
  state "Echo Handler" as eha
  state "Echo Handler" as ehr

  classDef event fill:#de7316
  classDef metaEvent fill:#a8a114
  classDef handler fill:#16cade,color:black
  classDef entity fill:black,color:white
  classDef readModel fill:#14a834

  [*] --> ch: Returns Command id\nto the consumer
  Event
  Handler
  Entity
  rm
  ma
  mr
  me
  ch --> pe: Carries all data needed\nto make a decision
  pe --> decision
  pe --> ph
  state decision {
    ent --> accepting_command
    accepting_command --> Accepted: Condition met
    accepting_command --> Rejected: Condition no met
    Accepted --> eaa: Stores Accepted event \nand Command id
    Rejected --> ear: Stores Rejected event \nand Command id
  }
  decision --> ph
  ph --> processing_accepted_event: Accepted
  ph --> processing_rejected_event: Rejected
  processing_accepted_event --> ma: Carries\nAccepted\nEvent
  processing_accepted_event --> ca
  processing_rejected_event --> cmdrjct
  processing_rejected_event --> mr: Carries\nRejected\nEvent
  ca --> cmdrslt
  cmdrjct --> cmdrslt
  cmdrslt --> cmdrsltrm: This allows the consumer to\n follow up on the operation.
  ma --> eha
  eha --> ah:For developer\ndefined handlers
  ma --> eta
  mr --> ehr
  ehr --> rh:For developer\ndefined handlers
  mr --> etr
  etr --> ent2: Removes Event and\nCommand id from\nrejected.\n\nDoes NOT process\nit again.
  eta --> ent3: Removes Event and\nCommand id from\naccepted.\n\nDoes NOT process\nit again.

  class Accepted, Rejected, Event, ca, cmdrjct event
  class ch, ph, Handler, ah, rh, eha, ehr handler
  class ent, Entity, eaa, ear, cmdrslt, eta, etr, ent2, ent3 entity
  class rm, cmdrsltrm readModel
  class mr, ma, me, pe metaEvent
```

## Does this actually work?
Here is a [PlusCal (TLA<sup>+</sup>)](https://lamport.azurewebsites.net/tla/tla.html) specification of the solution. Given the assumptions made are accurate, the algorithm itself is proven correct. There's also a [poor man's implementation in this repository](https://github.com/JYCabello/yeray-booster-tryout).

```TLA
---------------------- MODULE concurrency_aware_command_meta ----------------------
EXTENDS TLC, Integers, Sequences, FiniteSets
\* Set null as a model value.
CONSTANTS Amounts, null

(***************************************************************************)
(* Feature for concurrency aware commands, the idea is to be able to wrap  *)
(* a command in an abstraction that guarantees that the decision as to     *)
(* whether to accept it or not is always done with the version of the      *)
(* entity that will process the resulting event, for this:                 *)
(*                                                                         *)
(* 1.  The command handler will gather all the information needed to make  *)
(* a decision, assign an ID to the command, emit a command towards the     *)
(* command state entity and emit a meta event that contains all the        *)
(* information needed for the entity to make the decision.                 *)
(*                                                                         *)
(* 2.  The reduction of the meta entity will then use that information to  *)
(* make a decision and construct an event that will process immediately,   *)
(* both on the business logic level and at the workflow level, adding it   *)
(* to a collection of acceptance/rejection of events.                      *)
(*                                                                         *)
(* 3.  The handler will process the meta event, projecting an event to     *)
(* update the command state and the actual event generated by the entity.  *)
(*                                                                         *)
(* 4.  The entity will ignore the actual event because it already          *)
(* processed it, and the meta entity will remove it from its accepted      *)
(* collection.  The emission of the event is needed for handlers to react  *)
(* on it.                                                                  *)
(***************************************************************************)

(***************************************************************************)
(* To verify that no inconsisten event, a warehouse with stock business    *)
(* model will be used, as it's easy to see that stock going negative or    *)
(* commands not receiving a response should never happen.                  *)
(***************************************************************************)

(*--fair algorithm concurrency_aware_command variables
  possibleCommands =
    [ amount: 2..(Amounts + 1),
      state : {"not sent"} ],
  (*************************************************************************)
  (* ASSUMPTION: The update of an entity from the stream and the update of *)
  (* a read model from the entity is guaranteed to be eventually           *)
  (* consistent.                                                           *)
  (*                                                                       *)
  (* This will double as the read model for command state, saving us from  *)
  (* modelling the entity.                                                 *)
  (*************************************************************************)
  commands \in [ 1..Amounts -> possibleCommands ],
  entity =
    (* This field is the actual entity *)
    [ amount   |-> Amounts * 2,
      (* These two sets are part of the meta entity *)
      accepted |-> {},
      rejected |-> {},
      (*********************************************************************)
      (* ASSUMPTION: The entity processes every event in order.            *)
      (*                                                                   *)
      (* There will be no revision in the implementation, this is just to  *)
      (* keep track of the events that have been processed, that mechanism *)
      (* is already in Booster.                                            *)
      (*********************************************************************)
      revision |-> 0 ],
  events = <<>>,
  (*************************************************************************)
  (* ASSUMPTION: The handler eventually processes every event, not         *)
  (* necessarily in order.                                                 *)
  (*************************************************************************)
  handledEvents = {};

define
NoOverdraft == 0 <= entity.amount

AcceptOrRejectNotBoth ==
  entity.accepted \intersect entity.rejected = {}

AllCommandsAreConsumed ==
  \A id \in DOMAIN commands:
    \/ commands[id].state = "accepted"
    \/ commands[id].state = "rejected"

AllCommandsEventuallyConsumed == <>[] AllCommandsAreConsumed

AcceptEvent(evt) ==
  [ type |-> "accept",
    data |->
    [ commandId |-> evt.data.commandId,
      amount    |-> evt.data.amount ]]

RejectEvent(evt) ==
  [ type |-> "reject",
    data |-> [ commandId |-> evt.data.commandId ]]

CommandAcceptedEvent(evt) ==
  [ type |-> "command-accepted",
    data |-> [ commandId |-> evt.data.commandId ]]

CommandRejectedEvent(evt) ==
  [ type |-> "command-rejected",
    data |-> [ commandId |-> evt.data.commandId ]]
end define;

(* Entity macros *)

macro SetToAccept() begin
  entity :=
    [ amount   |-> entity.amount - evt.data.amount,
      revision |-> entity.revision + 1,
      accepted |-> 
        entity.accepted \union {AcceptEvent(evt)},
      rejected |-> entity.rejected ];
end macro;

macro SetToReject() begin
  entity :=
    [ amount   |-> entity.amount,
      revision |-> entity.revision + 1,
      accepted |-> entity.accepted,
      rejected |-> 
        entity.rejected \union {RejectEvent(evt)}];
end macro;

macro ProcessPrepareReducer() begin
  if evt.data.amount <= entity.amount then
    SetToAccept();
  else
    SetToReject();
  end if;
end macro;

macro ProcessAcceptReducer() begin
  entity :=
    [ amount   |-> entity.amount,
      revision |-> entity.revision + 1,
      accepted |-> entity.accepted,
      rejected |-> 
        entity.rejected \ {AcceptEvent(evt)}];
end macro;

macro ProcessRejectReducer() begin
  entity :=
    [ amount   |-> entity.amount,
      revision |-> entity.revision + 1,
      accepted |-> entity.accepted,
      rejected |-> 
        entity.rejected \ {RejectEvent(evt)}];
end macro;

(* Macros event handler *)
macro ProcessPrepareHandler() begin
  if AcceptEvent(evt) \in entity.accepted then
    events := events \o
      <<AcceptEvent(evt), CommandAcceptedEvent(evt)>>
  elsif RejectEvent(evt) \in entity.rejected then
    events := events \o
      <<RejectEvent(evt), CommandRejectedEvent(evt)>>
  end if;
end macro;

macro ProcessCommandAcceptedHandler() begin
  commands[evt.data.commandId].state := "accepted";
end macro;

macro ProcessCommandRejectedHandler() begin
  commands[evt.data.commandId].state := "rejected";
end macro;

process commandEmitter \in {"emtA", "emtB"}
variable cID = -1;
begin
EmitterLoop:
  while \E id \in DOMAIN commands: commands[id].state = "not sent" do
    cID := CHOOSE id \in DOMAIN commands: commands[id].state = "not sent";
    (***********************************************************************)
    (* Commands represent real users, so it should be impossible for the   *)
    (* exact same command to be emitted twice.  This workaround of         *)
    (* "reserving" it models exactly that.  If we are concerned about a    *)
    (* user clicking twice on the submit button or similar issues, that is *)
    (* a cross cutting concern that can be adressed separatedly.           *)
    (***********************************************************************)
    commands[cID].state := "reserved";
      SendCommand:
        events :=
          Append(
            events,
            [ data |->
              [ commandId |-> cID,
                amount    |-> commands[cID].amount,
                event     |-> null ],
              type |-> "prepare" ]);
  end while;
end process;

(***************************************************************************)
(* ASSUMPTION: The entity processes every event in order.                  *)
(*                                                                         *)
(* The entity reducer processes the events in order, so is modelled like   *)
(* an atomic, single threaded process.                                     *)
(***************************************************************************)
process entityReducer = "ecnsm"
variable evt = null;
begin
EntityLoop:
  while ~AllCommandsAreConsumed do
    if entity.revision < Len(events) then
      evt := events[entity.revision + 1];
      if evt.type = "prepare" then
        ProcessPrepareReducer();
      elsif evt.type = "accept" then
        ProcessAcceptReducer();
      elsif evt.type = "reject" then
        ProcessRejectReducer();
      else
        entity.revision := entity.revision + 1;
      end if;
    end if;
  end while;
end process;

(***************************************************************************)
(* For the sake of simplicity, all handlers are modelled as a single one   *)
(* and forking the execution with conditionals on the type.                *)
(***************************************************************************)

process eventHandler \in {"ehA", "ehB", "ehB"}
variable evt = null, evtIndex = 0;
begin
HandlerLoop:
  while ~AllCommandsAreConsumed do
    (***********************************************************************)
    (* This executes only if there are events to process.                  *)
    (***********************************************************************)
    if \E ei \in DOMAIN events: \A pe \in handledEvents: pe /= ei then
      (*********************************************************************)
      (* This will test every possible order in processing the events.     *)
      (*********************************************************************)
      with ei \in DOMAIN events \ handledEvents do
        (*******************************************************************)
        (* Requesting the entity in an event handler forces the reduction  *)
        (* of the entity, this await models that, the greater than or      *)
        (* equal in the condition models the instance of thee handler      *)
        (* receiving the event after subsequent events have been reduced   *)
        (* by the entity.                                                  *)
        (*******************************************************************)
        await entity.revision >= ei;
        evtIndex := ei;
        evt := events[evtIndex];
      end with;
      (*********************************************************************)
      (* ASSUMPTION: The handlers will not try to process an event twice   *)
      (* in parallel, this double check models precisely that.             *)
      (*********************************************************************)
      if ~(evtIndex \in handledEvents) then
        if evt.type = "prepare" then
          ProcessPrepareHandler();
        elsif evt.type = "command-accepted" then
          ProcessCommandAcceptedHandler();
        elsif evt.type = "command-rejected" then
          ProcessCommandRejectedHandler();
        end if;
        handledEvents := handledEvents \cup {evtIndex}
      end if;
    end if;
  end while;
end process;

end algorithm;*)
=============================================================================
```

