# Northwind workshop project

This repository is the Northwind Traders workshop project.

- The source of truth is `knowledge-docs/`. Read `business-case.md`, `current-state.md` and
  `engineering-standards.md` before producing documents, designs, plans or code.
- Follow `knowledge-docs/engineering-standards.md` for writing style, traceability, file
  locations, track tags and releases, .NET structure, Azure and Power Platform conventions.
- Cite source identifiers (`BR-`, `NFR-`, `C-`, `SM-`, `CS-`, `ES-`, `BA-`). Label anything else
  **ASSUMPTION:** and do not present it as a requirement.
- Each delivery track builds from its own numbered releases in `docs/product/releases/` and
  never waits for another track; record cross-track dependencies as **OPEN:** items. Keep the
  track and release tags on every item, in every tool the backlog is published to (ES-39).
- Do not deploy to Azure, change a Power Platform environment or write to Azure DevOps without
  an explicit human approval.
