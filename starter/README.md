# Northwind Traders — HVE Squad hands-on workshop project

This folder is **your** workshop project. You will open it in GitHub Copilot (App, CLI or
VS Code) and work with HVE Squad on it. The companion guide is at
<https://peter-n91.github.io/hve-squad-hands-on-workshop/>.

Northwind Traders is a fictitious B2B food distributor. Everything in this folder is
synthetic and safe to share.

## What is inside

| Path | What it is | Used in |
|---|---|---|
| `knowledge-docs/business-case.md` | The customer's business case: problems, requirements (`BR-`), non-functional requirements (`NFR-`), constraints (`C-`), success measures (`SM-`) and the business areas (`BA-`) each delivery track owns. | All parts |
| `knowledge-docs/current-state.md` | How Order Desk runs today and how delivery claims are handled: servers, integrations, known technical facts (`CS-`). | Product and every track |
| `knowledge-docs/engineering-standards.md` | How this team writes documents, tags and releases the backlog, structures code and builds on Azure and Power Platform (`ES-`). | All parts |
| `src/Northwind.OrderDesk.sln` | Order Desk, the legacy ASP.NET MVC 5 application on .NET Framework 4.8 (Core, Web, Tests). | Azure and .NET tracks |
| `database/` | SQL Server schema, sample data and the nightly StockPilot exchange procedures. | Azure track |
| `tools/ready.ps1`, `tools/ready.sh` | Checks your machine and prepares Git for this folder. | Part 00 |

Folders such as `docs/`, `infra/`, `powerplatform/` and `.copilot-tracking/` do not exist yet.
The squads create them during the workshop.

## Delivery tracks

The product team writes one tagged release per delivery track you choose in the guide:
**Azure** (business area BA-01), **.NET** (BA-02) and **Power Platform** (BA-03). Each track's
team builds from its own release (`docs/product/releases/`, Git tag `product/<track>-r1`) and
never waits for another track, so you can take one, two or all three.

## First steps

1. Open a terminal **in this folder**.
2. Run the readiness check:
   - Windows: `powershell -ExecutionPolicy Bypass -File tools\ready.ps1`
   - macOS or Linux: `bash tools/ready.sh`
3. Fix anything marked **MISSING** that the guide says you need for the parts you will do.
4. Open this folder in your Copilot client and continue with Part 01 of the guide.

## Ground rules

- Nothing in this workshop deploys to Azure, changes a Power Platform environment or changes a
  real Azure DevOps project unless you explicitly approve it.
- The legacy solution builds and tests only on Windows with Visual Studio installed. That is
  one of the problems the .NET modernization team solves. You do not need Visual Studio.
