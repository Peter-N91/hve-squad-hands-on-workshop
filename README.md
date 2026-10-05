# HVE Squad hands-on workshop

An interactive, self-contained workshop guide for [HVE Squad](https://peter-n91.github.io/hve-squad/).
Participants build three cooperating squads in one repository for a fictitious customer,
**Northwind Traders**:

1. a **product** squad turns a business case into a traceable backlog;
2. optionally, the backlog is published to **Azure DevOps**;
3. the squad is promoted to a federation and an **Azure migration** squad plans the move;
4. a **.NET modernization** squad upgrades the legacy application from .NET Framework 4.8 to .NET 10.

Published at <https://peter-n91.github.io/hve-squad-hands-on-workshop/>.

## Repository layout

| Path | Contents |
|---|---|
| `src/content.ts` | Every lesson, request, review key, prerequisite and troubleshooting entry. Edit this to change the workshop. |
| `src/state.ts` | Browser progress, Session setup, setup-chain locking and the pure request renderer for Copilot App, CLI and VS Code. |
| `src/starter.ts` | The one-button starter: writes the folder through the File System Access API, or falls back to a zip download. |
| `src/App.tsx`, `src/index.css` | The guide UI, using the HVE Squad documentation identity (tokens, gradient, Manrope / Source Sans 3 / JetBrains Mono). |
| `starter/` | The participant solution: knowledge-docs, the legacy Order Desk solution (28 MSTest v1 tests), database scripts and readiness scripts. |
| `scripts/build-starter.mjs` | Packages `starter/` into `public/starter/manifest.json` and `northwind-workshop.zip` (no dependencies). Runs before `dev` and `build`. |
| `tests/workshop.test.mjs` | Content, renderer, progress and starter integrity tests, including cross-checks that every identifier and file the guide cites exists in the starter. |

## Develop

Node 24+.

```powershell
npm ci
npm run dev -- --host 127.0.0.1
npm run lint
npm test
npm run build
npm run preview -- --host 127.0.0.1
```

## Change the starter

Edit files under `starter/`. Keep the identifiers (`BR-`, `NFR-`, `C-`, `SM-`, `CS-`, `ES-`, `OQ-`)
stable: the guide's review keys and tests depend on them. The legacy solution must keep building
with Visual Studio MSBuild and its tests must pass with `vstest.console.exe`; the guide promises
28 tests. Run `npm test` after any change.

## Publish

`Publish workshop guide` (`.github/workflows/pages.yml`) is manual. In the repository settings,
choose **GitHub Actions** as the Pages source, then run the workflow. CI validates every push.

## Privacy

No analytics, no remote fonts, no server. Progress and Session setup stay in the participant's
browser. The starter is generated from this repository and contains only synthetic data.

## License

MIT. The HVE Squad logo is MIT licensed; the fonts are under the SIL Open Font License. See
`public/THIRD-PARTY-NOTICES.txt`.
