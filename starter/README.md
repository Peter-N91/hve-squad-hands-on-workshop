# Northwind Traders — HVE Squad hands-on workshop project

This folder is **your** workshop project. You will open it in GitHub Copilot (App, CLI or
VS Code) and work with HVE Squad on it. The companion guide is at
<https://peter-n91.github.io/hve-squad-hands-on-workshop/>.

Northwind Traders is a fictitious B2B food distributor. Everything in this folder is
synthetic and safe to share.

## What is inside

| Path | What it is | Used in |
|---|---|---|
| `knowledge-docs/business-case.md` | The customer's business case: problems, requirements (`BR-`), non-functional requirements (`NFR-`), constraints (`C-`), success measures (`SM-`). | All parts |
| `knowledge-docs/current-state.md` | How Order Desk runs today: servers, integrations, known technical facts (`CS-`). | Parts 04 and 05 |
| `knowledge-docs/engineering-standards.md` | How this team writes documents, structures code and builds on Azure (`ES-`). | All parts |
| `src/Northwind.OrderDesk.sln` | Order Desk, the legacy ASP.NET MVC 5 application on .NET Framework 4.8 (Core, Web, Tests). | Parts 04 and 05 |
| `database/` | SQL Server schema, sample data and the nightly StockPilot exchange procedures. | Part 04 |
| `tools/ready.ps1`, `tools/ready.sh` | Checks your machine and prepares Git for this folder. | Part 00 |

Folders such as `docs/`, `infra/` and `.copilot-tracking/` do not exist yet. The squads create
them during the workshop.

## First steps

1. Open a terminal **in this folder**.
2. Run the readiness check:
   - Windows: `powershell -ExecutionPolicy Bypass -File tools\ready.ps1`
   - macOS or Linux: `bash tools/ready.sh`
3. Fix anything marked **MISSING** that the guide says you need for the parts you will do.
4. Open this folder in your Copilot client and continue with Part 01 of the guide.

## Ground rules

- Nothing in this workshop deploys to Azure or changes a real Azure DevOps project unless you
  explicitly approve it.
- The legacy solution builds and tests only on Windows with Visual Studio installed. That is
  one of the problems the modernization squad solves. You do not need Visual Studio.
