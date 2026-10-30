
# APEX F1 - AGENT WORKFLOW RULES

## 1. Core Principles

- Accuracy and code stability are more important than speed.
- Execute tasks directly. Avoid unnecessary explanations.
- Do not expand the requested scope.
- Preserve existing functionality and architecture.
- Never claim success without verification.

## 2. Before Editing

1. Read the relevant source files.
2. Inspect existing functions, dependencies and CSS selectors.
3. Read each relevant file only once unless new information is required.
4. Identify exactly which files need modification.
5. Make a short implementation plan before editing.

Do not repeatedly inspect the same code without a specific reason.

## 3. Editing Rules

- Modify only files required by the task.
- Preserve existing API calls, data structures and function interfaces.
- Do not rewrite entire files when a targeted change is sufficient.
- Do not duplicate functions, CSS selectors or event listeners.
- Do not change unrelated modules.
- Preserve existing naming conventions and architecture.

## 4. Loop Prevention

- Never repeat an identical tool call without a clear reason.
- Maximum 2 retries per failed operation.
- Do not repeatedly read, analyze or rewrite unchanged code.
- Do not repeat a completed modification.
- If an operation fails twice, stop and report the blocker.
- If requirements are unclear, ask one specific question instead of guessing.

## 5. APEX F1 Development Rules

### JavaScript
- Preserve ES Module structure.
- Preserve existing API integrations.
- Avoid changing unrelated functions.
- Check imports, function names and DOM element IDs.
- Avoid introducing duplicate event handlers.

### CSS
- Read existing CSS variables before adding new styles.
- Reuse existing design tokens.
- Scope styles to the relevant page.
- Avoid duplicate selectors and conflicting media queries.
- Preserve responsive layouts.
- Do not modify unrelated components.

### Assets
- Verify actual image formats, not just extensions.
- Check asset paths and filenames.
- Support SVG, PNG and WebP where appropriate.
- Never assume a missing asset exists.

## 6. Validation

After editing:

1. Check syntax.
2. Check the modified function or selector.
3. Verify the requested behavior.
4. Inspect the final changes (diff).
5. Confirm unrelated functionality remains untouched.

Do not repeat validation unless a failure or new change requires it.

## 7. Stop Conditions

Stop immediately when:
- The requested task is completed and verified.
- The same error occurs twice.
- Required files or tools are unavailable.
- Further changes would exceed the requested scope.

Do not continue making speculative changes.

## 8. Final Report

Always provide a short report:

- Files modified
- Functions or selectors changed
- Validation performed
- Test results
- Remaining issues

Clearly distinguish verified results from assumptions.

## 9. Important Rule

ONE TASK = ONE IMPLEMENTATION CYCLE.

Read → Plan → Edit → Validate → Report.

Do not restart the workflow without a new requirement.
