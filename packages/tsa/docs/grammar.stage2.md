# Stage2 Grammar & Policy (TSA)

This doc fixes the canonical Stage2 parsing rules implemented today.

## Tokens
- `number`: decimal or integer literal (e.g., `2`, `15`, `2.5`, `0.125`), parsed into a rational `n/d` with reduction.
- `add`: `+`
- `sub`: `-` (binary subtraction)
- `mul`: `*` (also accepts the `×` glyph)
- `div`: `/` (also accepts the `÷` glyph)
- `lpar`: `(`
- `rpar`: `)`

Whitespace (spaces, tabs, newlines) may appear between tokens and is ignored.

## Expression Grammar (EBNF)
```
Expression    ::= Additive
Additive      ::= Multiplicative { ("+" | "-") Multiplicative }
Multiplicative::= Primary { ("*" | "/") Primary }
Primary       ::= number | "(" Expression ")"
```

The parser is LL(1) over the token stream produced by the lexical rules below. Input must be fully consumed; trailing characters trigger `Stage2ParseError`.

## Sign Handling Rules
- `-` is lexed as binary subtraction unless it is at the start of the token stream or immediately follows `(`. In those unary contexts it produces either a negative literal or an implicit multiplication by `-1`.
- Negative numeric literals must have their digits immediately after the sign. Examples: `-3`, `-0.25`, `-.5`. Whitespace between the sign and digits is not allowed.
- The idiom `-(...)` (with optional whitespace before the `(`) is rewritten as `(-1) * (...)`. Nested parentheses therefore work without introducing double signs.
- Any other consecutive signs (e.g., `3--2`, `2*-3`, `10/-5`, `--3`) are rejected. To negate a parenthesised expression, spell it as `-(...)`; to multiply by a negative literal, use parentheses: `*( -3 )`.

## Decimal & Rational Policy
- Literals support either whole numbers or decimals with a single fractional part. There must be at least one digit overall, and when a decimal point is present it must be followed by at least one digit (`5.` and `-.` are invalid).
- Values are stored as reduced rationals `n/d`. For example, `2.5` becomes `5/2`, `.125` becomes `1/8`, and `-4` stays `-4/1`.
- Leading zeros are preserved only for parsing (`0004` → `4`). Trailing zeros after the decimal are allowed but removed during reduction (`1.50` → `3/2`).

## Whitespace Policy
- ASCII space (` `), tab (`\t`), and newline (`\n`) may appear between any two tokens, including around parentheses.
- Whitespace is ignored when looking for a unary `-(...)` sequence: `-(3)`, `- (3)`, and ` - ( 3 + 5 ) ` are equivalent.
- Whitespace inside numbers is never allowed (`1 2`, `- 3`, `0. 5` are invalid).

These rules document the behaviour of `tokenizeStage2` and `parseStage2Expression` as of Stage2 and serve as the compatibility contract for TSA consumers.
