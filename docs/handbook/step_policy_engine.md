# Step Policy Engine (SPE)

The SPE coordinates intentional teaching steps. Policies describe which TSA atoms are available for a learner profile. Execution iterates through a `StepPlan`, routing each step through `@motor/tsa` without invoking the evaluation engine.

The beginner, standard, and advanced profiles live in `packages/tsa-policy/src/profiles`. Bundles group common atoms so that profiles can share building blocks.
