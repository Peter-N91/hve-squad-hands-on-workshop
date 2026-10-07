# HVE Squad hands-on workshop

An interactive, self-contained workshop guide for [HVE Squad](https://peter-n91.github.io/hve-squad/),
always built for the latest stable HVE Squad release. Participants work in one repository for a
fictitious customer, **Northwind Traders**, whose business case is split into three business
areas, each owned by a **delivery track**:

1. a **product** squad turns the business case into a BRD, a PRD, Minimum Viable Experiments and a
   backlog where every item carries a track tag and, once planned, a release tag. Each chosen track
   gets **numbered releases** (`r1`, `r2`…), each marked with a Git tag (`product/<track>-r<n>`), so
   the releases stay identifiable when the backlog is published to Azure DevOps, GitHub or Jira.
   At the start of this part participants choose what to build — all tracks, one track or selected
   tracks — and whether the product covers the whole case or only the business areas of those tracks;
2. optionally, the releases are published to **Azure DevOps**;
3. the squad is promoted to a federation;
4. one team per chosen track builds from its own release, independently of the others:
   - **Azure** (BA-01) plans the migration of Order Desk to Azure, with HLD and LLD diagrams drawn
     with the Python `diagrams` library (0.25.1+, latest Azure icons) and Graphviz;
   - **.NET** (BA-02) upgrades Order Desk from .NET Framework 4.8 to .NET 10;
   - **Power Platform** (BA-03) designs a delivery-claims solution with the `power-platform` pack.

A track the participant does not choose is hidden from the guide. Part numbers stay stable, so a
facilitator can split tracks across tables in a group session.

Published at <https://peter-n91.github.io/hve-squad-hands-on-workshop/>.

## Repository layout

| Path | Contents |
|---|---|
| `src/content.ts` | The delivery tracks, and every lesson, request, review key, prerequisite and troubleshooting entry. Edit this to change the workshop. |
| `src/state.ts` | Browser progress, Session setup (tracks, scope, team names), setup-chain locking and the pure request renderer for Copilot App, CLI and VS Code. |
| `src/hve-squad-release.ts` | Generated: the latest stable HVE Squad release the guide targets. |
| `scripts/hve-squad-release.mjs` | Asks GitHub for the latest stable `Peter-N91/hve-squad` release and regenerates `src/hve-squad-release.ts`. Runs before `dev`, `build` and the starter; keeps the committed value when offline or with `HVE_SQUAD_RELEASE_OFFLINE=1`. |
| `src/starter.ts` | The one-button starter: writes the folder through the File System Access API, or falls back to a zip download. |
| `src/App.tsx`, `src/index.css` | The guide UI, using the HVE Squad documentation identity (tokens, gradient, Manrope / Source Sans 3 / JetBrains Mono). |
| `starter/` | The participant solution: knowledge-docs, the legacy Order Desk solution (28 MSTest v1 tests), database scripts and readiness scripts. |
| `scripts/build-starter.mjs` | Packages `starter/` into `public/starter/manifest.json` and `northwind-workshop.zip` (no dependencies), replacing `{{HVE_SQUAD_VERSION}}` and `{{HVE_SQUAD_MINOR}}` with the targeted release. Runs before `dev` and `build`. |
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

## Add a delivery track

1. Add the business area (`BA-`) and its requirements to `starter/knowledge-docs/business-case.md`,
   its facts to `current-state.md`, and its tag and standards to `engineering-standards.md` (ES-30).
2. Add the track to `tracks` in `src/content.ts`, with a `SquadKey`, a `SetupId` and a lesson whose
   `track` names it. Its setup step must require only `promote`, so the track stays independent.
3. Add its agenda row and its suggested team name, add its id to the Part 08 status question's
   `requiresSetup`, and run `npm test`: the tests check every combination of tracks and scope.

Lesson and prompt text can adapt to the participant's choices with `{trackList}`, `{areaList}`,
`{teamList}`, `{releaseTags}`, `{releaseList}` and `[[condition:text]]` (see `src/content.ts`).

## HVE Squad version

The guide never hard-codes the HVE Squad version. `npm run release` writes the latest stable
release to `src/hve-squad-release.ts` (set `GITHUB_TOKEN` or `GH_TOKEN` to avoid anonymous rate
limits), and the install commands, prerequisites, links and the starter's readiness check all
read it. Commit the regenerated file when it changes. The publish workflow also runs daily and on a
`hve-squad-release` repository dispatch, so the published guide follows new releases.

## Change the starter

Edit files under `starter/`. Keep the identifiers (`BA-`, `BR-`, `NFR-`, `C-`, `SM-`, `CS-`, `ES-`, `OQ-`, `P-`)
stable: the guide's review keys and tests depend on them. The legacy solution must keep building
with Visual Studio MSBuild and its tests must pass with `vstest.console.exe`; the guide promises
28 tests. Run `npm test` after any change.

## Publish

`Publish workshop guide` (`.github/workflows/pages.yml`) runs on demand, daily, and when
hve-squad sends a `hve-squad-release` repository dispatch. In the repository settings, choose
**GitHub Actions** as the Pages source. CI validates every push.

## Privacy

No analytics, no remote fonts, no server. Progress and Session setup stay in the participant's
browser. The starter is generated from this repository and contains only synthetic data.

## License

MIT. The HVE Squad logo is MIT licensed; the fonts are under the SIL Open Font License. See
`public/THIRD-PARTY-NOTICES.txt`.
