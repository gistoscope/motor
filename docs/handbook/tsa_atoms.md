# TSA Atoms

TSA (Teaching Step Actions) atoms are pure transformation functions on the AST. They never evaluate expressions. Each action takes an expression and a path, returning a `StepResult` when a change is made.

The canonical implementations ship from `packages/tsa/src/actions`. They focus on fraction manipulation for the initial sandbox milestone.
