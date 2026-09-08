---
name: design-docs
description: Generate a standard set of project design documents — requirements, flowchart, database (ER) design, sequence diagram, and class diagram — using Markdown and Mermaid. Works on any project, new or existing. Use when the user wants to write, generate, or update design docs, requirements, a flowchart, an ER/database diagram, a sequence diagram, or a class diagram, or asks to "document the design" of a project. Can produce the full set or a single document.
---

# Design Docs

Produce a consistent set of design documents that look the same across every project.

## Output

Write to `design-docs/` at the project root (create it if missing; reuse an existing one if the project already keeps design docs elsewhere). Filenames are fixed and lowercase:

```
design-docs/
├── requirements.md
├── flowchart.md
├── database-design.md
├── sequence-diagram.md
└── class-diagram.md
```

The four diagram files use Mermaid fenced code blocks (```mermaid). `requirements.md` is prose.

## Workflow

1. **Find the source of truth.**
   - Code exists → **read all of it before writing**, don't sample. The code is authoritative; document what is actually there, not what you'd design. Cover the whole codebase:
     - Map the repo first: `git ls-files` (or list the tree), skipping vendored dirs (`node_modules`, build output, lockfiles, binary assets).
     - Read every source file that defines behavior or structure — entry points, routes/handlers, data models/types/schemas, DB migrations, hooks/services, config. Don't stop at the first file that looks representative.
     - Prefer reading actual code over existing design docs; treat any docs already in the repo as unverified until checked against the code (they may be stale). When code and a doc disagree, the code wins — note the discrepancy in "Open Questions".
     - For a large repo, fan out the reading with parallel reads or an `Explore`/`general-purpose` agent so coverage stays complete, then write from the gathered facts.
   - No code yet → ask the user about the core entities, user flows, and constraints before writing.
2. **Pick scope.** If the user named a specific document, produce only that one. Otherwise produce all five.
3. **Generate** each requested file from the template in [REFERENCE.md](REFERENCE.md). Keep section headings exactly as the template defines them — that consistency is the point.
4. **Cross-reference.** Use the same entity/actor/component names across all five files so the documents line up (e.g. a table in `database-design.md` matches a class in `class-diagram.md`).
5. **Sanity-check Mermaid.** Re-read each diagram for syntax before finishing; a broken block won't render.

## Accuracy — every claim traces to code

These are the failure modes that make a doc worse than none. Each item below is something you must be able to point at a specific line for; if you can't, cut it.

- **No invented fields.** Every column, property, method, parameter, and enum value must exist in the code you read (migration, type, schema, or handler). Do not carry names over from an existing doc, a diagram you've seen, or memory — those are exactly what go stale.
- **No invented relationships.** Only draw an edge (association, call, "uses", "provides X to") if the source file actually imports or calls the target. A plausible-sounding dependency that isn't in the code is a lie. When unsure, leave the edge out.
- **Copy schemas, don't guess them.** For every request/response, API contract, or function signature, read the handler's validation and its return/`json(...)` — transcribe the real field names and shapes. Never infer a payload from the endpoint name or a sibling route.
- **Catch renames and removals.** A field that was renamed or deleted (check git log / current migration / current type, not an older doc) must use the current name. If an old doc shows `energy` but the schema says `daily_spend_microbaht`, the doc is stale — follow the code.
- **No invented specifics.** Don't state latency numbers, "streaming", "unlimited", quotas, cache TTLs, or limits unless they appear as constants/behavior in the code. Use the real constant (e.g. a 20-message cap, a µ฿ budget) or say nothing.
- **Verification pass before finishing.** Re-read each diagram/table against the code one more time; for anything you can't trace to a line, delete it or move the uncertainty to "Open Questions". A smaller doc that's fully true beats a complete one that's partly fiction.

## Notes

- Keep diagrams readable. If a diagram would exceed ~25 nodes, split by domain or show only the primary flow and note what was omitted.
- When updating, regenerate only the files affected by the change; leave the rest untouched.

See [REFERENCE.md](REFERENCE.md) for the full template of each document.
