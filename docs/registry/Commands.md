# Command Registry (Draft)

## Select
- **Identifier:** `til.commands.select`
- **Summary:** Choose one item from a presented list of options.
- **Inputs:** `options[]` (array of labelled values), optional `defaultOption`.
- **Outputs:** `selectionId` referencing the chosen option.

## Normalize
- **Identifier:** `til.commands.normalize`
- **Summary:** Standardise a numeric or textual value according to policy-specific rules.
- **Inputs:** `value` (string or number), optional `scale` metadata.
- **Outputs:** `normalizedValue` (string), optional `confidence` (0-1).

## FlipSign
- **Identifier:** `til.commands.flipSign`
- **Summary:** Invert the sign of a numeric payload without altering magnitude.
- **Inputs:** `value` (number).
- **Outputs:** `value` (number) representing the negated input.
