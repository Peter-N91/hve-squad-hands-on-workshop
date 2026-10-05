# Northwind Traders — Engineering and documentation standards

> Fictitious standards for the HVE Squad hands-on workshop. They show how a delivery practice
> can hand its own conventions to a squad. Edit them to match your practice.

These standards apply to every team working in this repository: product, cloud and
application teams. Identifiers (for example `ES-07`) let reviews cite them.

## 1. Writing for people

| ID | Standard |
|---|---|
| ES-01 | Write for a business reader first. Use short sentences and plain words. Explain any acronym the first time it is used. |
| ES-02 | Every requirement, story, design decision and plan item cites its source, for example `(source: BR-05, CS-10)`. |
| ES-03 | Anything that is not stated in `knowledge-docs` is marked **ASSUMPTION:** and listed in an assumptions table with an owner who can confirm it. Never present an assumption as a requirement. |
| ES-04 | Unanswered questions are marked **OPEN:** and listed with the person who can answer them (see stakeholders in `business-case.md`). |
| ES-05 | User stories use the form *As a … I want … so that …* followed by acceptance criteria in *Given / When / Then* form. A developer who has not read the business case must be able to build the story from its text alone. |
| ES-06 | Produce a traceability table that maps every `BR-` and `NFR-` identifier to the stories that cover it, and lists any identifier that is not covered. |

## 2. Where things go

| ID | Content | Location |
|---|---|---|
| ES-07 | Product documents (business requirements, product requirements, experiment design, backlog, traceability) | `docs/product/` |
| ES-08 | Architecture (high-level and low-level design, decision records, diagrams) | `docs/architecture/` |
| ES-09 | Migration plan, cost estimate, runbooks | `docs/migration/` |
| ES-10 | Infrastructure as code | `infra/` |
| ES-11 | Modernization notes (what changed, why, how it was tested) | `docs/modernization/` |
| ES-12 | Application source code | `src/` — keep the existing solution `src/Northwind.OrderDesk.sln`. |

## 3. .NET

| ID | Standard |
|---|---|
| ES-13 | Keep **one** solution and the existing project boundaries: `Core`, `Web` and `Tests`. Do not create a separate project for each class, feature or plugin. Add a project only when a decision record explains why. |
| ES-14 | Use SDK-style project files and target the current .NET long-term support release (**.NET 10**, `net10.0`). |
| ES-15 | Read configuration through `Microsoft.Extensions.Configuration` and the options pattern. No direct `ConfigurationManager` calls in modernized code. |
| ES-16 | Log through `Microsoft.Extensions.Logging` (`ILogger<T>`). Do not write to the Windows Event Log. |
| ES-17 | No secrets in code or configuration files (see `NFR-05`). Use managed identities in Azure and user secrets or environment variables locally. |
| ES-18 | All tests run with `dotnet test src/Northwind.OrderDesk.sln` on Windows, macOS and Linux. Existing test behaviour, especially pricing (`CS-20`), must be preserved: a test may be adapted to a new framework but its assertions must not be weakened. |
| ES-19 | Modernize in place. Keep namespaces, domain types and behaviour unless a decision record explains a change. |

## 4. Azure

| ID | Standard |
|---|---|
| ES-20 | Primary region **France Central**. Any secondary region must also be in the European Union (`NFR-03`). |
| ES-21 | Prefer platform services (PaaS) that a small .NET team can operate (`C-06`). Do not introduce Kubernetes. |
| ES-22 | Infrastructure as code in **Bicep**, using **Azure Verified Modules** where a module exists. One `main.bicep` per environment entry point, parameters in `.bicepparam` files. |
| ES-23 | Naming: `<resource-abbreviation>-nw-<workload>-<environment>-<region>`, for example `app-nw-orderdesk-prd-frc`. Environments: `tst`, `prd`. |
| ES-24 | Every resource carries the tags `workload`, `environment`, `owner` and `costCenter`. |
| ES-25 | Data services (database, storage, Key Vault) are reached through private endpoints. Applications use managed identities, never passwords. |
| ES-26 | Diagnostics from every resource go to one Log Analytics workspace per environment; applications use Application Insights. |
| ES-27 | Nothing is deployed from this workshop. IaC must be validated locally (for example with `az bicep build`) and reviewed, not applied. |

## 5. Azure DevOps (optional)

| ID | Standard |
|---|---|
| ES-28 | Work items created during the workshop carry the tag `nw-workshop` and the participant prefix agreed with the facilitator. |
| ES-29 | Every work item links back to its source identifiers (`BR-`, `NFR-`) in its description. |
