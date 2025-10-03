# Math Engine Architecture (Stage-2 focus)

- Supported forms: rationals, +, -, ×, ÷ with parentheses.
- Rule policy: structural transforms have priority; literal folding only when both operands are Literal.
- Deterministic pre-order enumeration for rules.

### Known rules (examples)
- `divFractionsToReciprocal`
- `addFractionsToCommonDenominator`
- `subFractionsToCommonDenominator`
- `multiplyLiterals`, `divideLiterals`, `addLiterals`, `subtractLiterals`

### Paths
- Paths are arrays of child indexes from root (e.g., `left=0`, `right=1`). Stable per AST.
