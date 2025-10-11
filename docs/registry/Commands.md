# Command Registry (Draft)

| Command | Identifier | Inputs | Outputs |
|---------|------------|--------|---------|
| Select | `command.select` | `{ "targets": string[] }` | `Trace` describing selection highlight updates |
| Normalize | `command.normalize` | `{ "scope": string }` | `Trace` confirming normalized range |
| FlipSign | `command.flip-sign` | `{ "valueId": string }` | `Trace` summarising the flipped sign |

These entries capture surface metadata only. Behaviour is implemented by engine adapters and policy modules that comply with the TIL protocol.
