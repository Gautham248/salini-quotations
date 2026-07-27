# - Values runtime input validation at all system boundaries (not just compile-time TypeScript types). Confidence: 0.9
- Values runtime input validation at all system boundaries (not just compile-time TypeScript types). Confidence: 0.9
- Expects invalid/empty data to be rejected at the point of entry rather than silently accepted or deferred. Confidence: 0.85
- Expects comprehensive test coverage for all features — "proper test cases" are a baseline requirement, not optional. Confidence: 0.85
- Prefers defensive input handling: bounds clamping, NaN/Infinity guards, and empty-string rejection as standard practice. Confidence: 0.8
- Prefers scoped, intentional commits — only files directly relevant to the current change are staged; pre-existing dirty files in the working tree are left alone. Confidence: 0.75
- Prefers the Conventional Commits format (`feat:`, `fix:`, etc.) for commit messages with a structured body explaining what changed and why. Confidence: 0.7
- Commits and pushes directly to the `main` branch — no feature-branch or PR workflow expected for this project. Confidence: 0.85
- Treats TypeScript type-checking (`tsc --noEmit`) as a required gate alongside the test suite — type errors are blockers, not warnings. Confidence: 0.8
- When reviewing uncommitted changes, systematically diffs the working tree, reads changed source files, runs the existing test suite as a baseline, then proactively adds tests for any uncovered features. Confidence: 0.75
