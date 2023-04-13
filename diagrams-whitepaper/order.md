```mermaid
stateDiagram-v2
  state "Awaiting Payment" as ap
  state "Process Order" as pc
  state "Request New Payment" as rnp
  state "Order Cancelled" as oc
  ap --> pc: Enough funds
  ap --> rnp: Not enough funds\nIs first try
  rnp --> ap: Request sent to user
  ap --> oc: Not enough funds\nNot first try