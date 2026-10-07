import { hveSquadRelease } from './hve-squad-release.ts'

/**
 * A delivery track is one business area delivered by one federation team, from numbered releases
 * (r1, r2…) the product team tags. Tracks are independent: a participant builds all tracks, one
 * track or a selection, and the parts of tracks they did not choose are hidden. To add a track, add it here, give it a lesson
 * with the same `track`, an agenda row, a squad name and a SetupId.
 */
export type TrackId = 'azure' | 'dotnet' | 'powerPlatform'
export type SetupId = 'product-team' | 'promote' | 'migration-team' | 'modernization-team' | 'power-platform-team'
export type SquadKey = 'productSquad' | 'migrationSquad' | 'modernizationSquad' | 'powerPlatformSquad'
export type Scope = 'full' | 'focused'
export type TrackMode = 'all' | 'one' | 'selected'

export type Track = {
  id: TrackId
  label: string
  /** Used in the backlog tag, the release file and the Git tag. */
  slug: string
  area: string
  areaName: string
  summary: string
  produces: string
  lessonId: string
  setupId: SetupId
  squadKey: SquadKey
}

export const tracks: Track[] = [
  {
    id: 'azure', label: 'Azure', slug: 'azure', area: 'BA-01', areaName: 'Platform and data-centre exit',
    summary: 'Plans the move of Order Desk to Azure: blockers found in the code, target architecture, Bicep, cost and a migration plan.',
    produces: 'Blockers · HLD/LLD · Bicep · cost', lessonId: 'migration', setupId: 'migration-team', squadKey: 'migrationSquad',
  },
  {
    id: 'dotnet', label: '.NET', slug: 'dotnet', area: 'BA-02', areaName: 'Ordering and customer self-service',
    summary: 'Upgrades Order Desk in place from .NET Framework 4.8 to .NET 10 — the enabler the Customer Portal depends on — with the pricing tests unchanged.',
    produces: '4.8 → .NET 10 · tests stay green', lessonId: 'modernize', setupId: 'modernization-team', squadKey: 'modernizationSquad',
  },
  {
    id: 'powerPlatform', label: 'Power Platform', slug: 'power-platform', area: 'BA-03', areaName: 'Delivery claims and credit notes',
    summary: 'Designs the delivery-claims solution: Dataverse model, app, approval flow, Order Desk and Finance integration, environments and licences.',
    produces: 'Dataverse · app · approvals · connector', lessonId: 'powerplatform', setupId: 'power-platform-team', squadKey: 'powerPlatformSquad',
  },
]
export const trackIds = tracks.map(track => track.id)
export const trackTag = (track: Track) => `track-${track.slug}`
/** A track can have several releases, numbered in delivery order. The name is also the backlog item's release tag. */
export const releaseName = (track: Track, n: number | string = 1) => `${track.slug}-r${n}`
export const releaseTag = (track: Track, n: number | string = 1) => `product/${releaseName(track, n)}`
export const releaseFile = (track: Track, n: number | string = 1) => `docs/product/releases/${releaseName(track, n)}.md`

export const trackNote = 'Tracks are independent. Each track team builds only from its own releases and never waits for another; dependencies between tracks are recorded as open items. In a group session, each table can take a different track. A track you do not choose is hidden from this guide, and part numbers stay the same for everyone.'

export const trackModeOptions: { value: TrackMode; label: string; summary: string }[] = [
  { value: 'all', label: 'All tracks', summary: 'Build every track: Azure, .NET and Power Platform.' },
  { value: 'one', label: 'One track', summary: 'Build a single track. The other tracks are hidden.' },
  { value: 'selected', label: 'Selected tracks', summary: 'Tick the tracks you build. The others are hidden.' },
]

export const scopeOptions: { value: Scope; label: string; summary: string; detail: string }[] = [
  { value: 'full', label: 'Whole case', summary: 'Documents and a backlog for every business area; releases only for the chosen tracks.', detail: 'The product team covers the whole business case and tags every backlog item with its track, including areas no team takes today, so a track can be added later without rewriting the documents. Only the tracks you chose get releases.' },
  { value: 'focused', label: 'Chosen areas only', summary: 'Documents and a backlog only for the business areas of your tracks.', detail: 'The product team writes the BRD, PRD, experiments and backlog only for the business areas of the tracks you chose, and lists the other areas as out of scope. Shorter, and focused on what your teams will build.' },
]

/**
 * Text in prompts and lessons can adapt to the participant's choices:
 *   {productSquad} {migrationSquad} {modernizationSquad} {powerPlatformSquad}  registered team names
 *   {trackList} {areaList} {teamList} {releaseNames} {releaseTags} {releaseList}  the chosen tracks
 *   [[condition:text]]  keeps text only when the condition holds. A condition is a track id,
 *   "full" or "focused" (the product scope); "a|b" means either, "a+b" means both.
 */
export type Answer = { question: string; answer: string; tracks: TrackId[] }

/**
 * setup    — init or promote; never autopilot
 * work     — a business outcome; always mode="autopilot"
 * question — a read-only question to a coordinator; no autopilot
 * plain    — asked to the default Copilot agent, not the squad
 * shell    — a terminal command
 */
export type PromptKind = 'setup' | 'work' | 'question' | 'plain' | 'shell'

export type Prompt = {
  title: string
  kind: PromptKind
  text: string
  bash?: string
  entry?: 'squad' | 'squad-federation'
  lifecycle?: 'init' | 'promote'
  /** Setup steps of tracks the participant did not choose are ignored. */
  requiresSetup?: SetupId[]
  requiresChecks?: string[]
  squadTarget?: SquadKey
  publication?: boolean
}

export type LifecycleStep = {
  id: SetupId
  title: string
  description: string
  request: Prompt
  expected: string[]
  checkpoint: string
}

export type FlowItem = { heading: string; hint: string; prompt: Prompt }
export type LessonStep = { title: string; body: string; prompt?: Prompt }
export type ReviewKey = { title: string; intro: string; items: { label: string; detail: string }[] }

export type Lesson = {
  id: string
  number: string
  title: string
  eyebrow: string
  minutes: number
  optional?: boolean
  track?: TrackId
  goal: string
  concept: string
  inputs: string[]
  setup?: LifecycleStep[]
  flow?: FlowItem[]
  behaviors?: string[]
  answers?: Answer[]
  reviewKey?: ReviewKey
  steps: LessonStep[]
  evidence: string[]
  checks: string[]
  recovery: string
}

export const squadVersion: string = hveSquadRelease.version
export const squadReleaseUrl: string = hveSquadRelease.url
export const apmCliVersion = 'v0.29.0'
export const apmCliReleaseUrl = `https://github.com/microsoft/apm/releases/tag/${apmCliVersion}`
/** diagrams 0.25.0 moved its Azure nodes to Microsoft's Azure icons V18; 0.25.1 fixed the packaged icons. */
export const diagramsVersion = '0.25.1'
export const diagramsRequirement = `diagrams>=${diagramsVersion}`
export const autopilotMode = 'mode="autopilot"'
export const guideUrl = 'https://peter-n91.github.io/hve-squad-hands-on-workshop/'
export const docsUrl = 'https://peter-n91.github.io/hve-squad/'

export const suggestedSquads: Record<SquadKey, string> = {
  productSquad: 'product',
  migrationSquad: 'azure-migration',
  modernizationSquad: 'dotnet-modernization',
  powerPlatformSquad: 'power-platform',
}

export const modeRule = {
  title: 'Three kinds of message — and only one uses autopilot',
  body: 'Setup messages (init and promote) never include mode="autopilot": you confirm each proposal yourself. Work requests always include it, together with the model routing you choose, so the squad runs research → plan → build → review on its own and stops only for approvals that matter. Questions (readiness, status) have no mode at all. The guide adds the right form to every copied block; you never type it yourself.',
}

export type Routing = 'off' | 'ranked' | 'manual'
export const routingOptions: { value: Routing; label: string; summary: string; detail: string }[] = [
  { value: 'off', label: 'Off', summary: 'Every role uses your session model.', detail: 'No model is chosen per role: each specialist runs on its own default or on the model you selected in your client. The simplest and most predictable option, and the package default.' },
  { value: 'ranked', label: 'Ranked', summary: 'The squad picks the best-fitting model for each role.', detail: 'Each role is matched to the model that best fits its kind of work (research, planning, implementation, review…) among the models your client offers, at the lowest cost for that fit. The picks appear in a Model column in team.md.' },
  { value: 'manual', label: 'Manual', summary: 'You choose each role\'s model once, with suggestions.', detail: 'Before the first dispatch the squad asks you: accept all suggestions, pick one model per kind of work, or pick per role. Only models your client can run are offered. Your picks are saved in team.md.' },
]
export const routingNote = 'The choice is saved in each team\'s team.md and stays in effect until you change it. The guide repeats it on every work request so it is always explicit. Routing never changes the session model you selected: that model runs the coordinator.'

export const modelGuidance = {
  title: 'Pick a strong session model before you start — and keep it',
  body: 'Your session model runs the coordinator, which reads the roster, plans the stages and dispatches every role; model routing never changes it. Start on a fixed, balanced model at least as capable as Claude Sonnet 5.5 (for example claude-sonnet-5.5 or gpt-6-sol) and keep it for the whole workshop. Do not use Auto or a small, fast model: they tend to summarize the instructions instead of following them, which shows up as skipped logging, empty decision records, unexpected dispatches and very different token usage between participants. Record the session model and your routing choice in your evidence log.',
}

export const observationNote = 'These are behaviors to watch for, not instructions to paste. Record what actually happens in your evidence log. If something is missing, note it rather than adding it to the request: that is how we learn what the squad does on its own.'

export type Prerequisite = {
  what: string
  why: string
  part: string
  check: string
  windows: string
  mac: string
  scope: 'everyone' | 'client' | 'later'
  track?: TrackId
}

export const prerequisites: Prerequisite[] = [
  { what: 'GitHub account with Copilot', why: 'Runs every agent in the workshop.', part: 'All parts', check: 'Sign in to your Copilot client', windows: 'Ask your GitHub admin for a Copilot Business or Enterprise seat', mac: 'Same as Windows', scope: 'everyone' },
  { what: 'One Copilot client', why: 'Where you talk to the squad. Pick one and stay with it.', part: 'All parts', check: 'App opens / copilot --version / VS Code Copilot Chat', windows: 'App: github.com/features/copilot · CLI: winget install GitHub.Copilot · VS Code: code.visualstudio.com', mac: 'App: github.com/features/copilot · CLI: brew install --cask copilot-cli · VS Code: code.visualstudio.com', scope: 'everyone' },
  { what: 'Git', why: 'Your workshop folder is a Git repository so every change is visible and reversible, and the product releases are Git tags.', part: 'All parts', check: 'git --version', windows: 'winget install --id Git.Git -e', mac: 'xcode-select --install', scope: 'everyone' },
  { what: 'PowerShell 7+ (pwsh)', why: 'The squad\'s Scribe writes the cost ledger and checks it with PowerShell 7 scripts, and model routing uses one too. Windows PowerShell 5.1 is not enough. Without it the squad falls back to slower, less reliable hand-written ledgers.', part: 'All parts', check: 'pwsh --version', windows: 'winget install --id Microsoft.PowerShell -e', mac: 'brew install --cask powershell', scope: 'everyone' },
  { what: `HVE Squad ${squadVersion}`, why: 'The squad coordinators and their specialists. The guide always targets the latest HVE Squad release.', part: 'All parts', check: 'Step 3 below', windows: 'Installed in step 3, per client', mac: 'Installed in step 3, per client', scope: 'everyone' },
  { what: `APM CLI ${apmCliVersion} (exactly)`, why: 'Installs the /squad prompts into the folder (VS Code), and the Power Platform pack\'s two specialists (any client).', part: 'VS Code users · Power Platform track', check: 'apm --version → 0.29.0', windows: "$env:VERSION = 'v0.29.0'; irm https://aka.ms/apm-windows | iex", mac: 'curl -sSL https://aka.ms/apm-unix | sh -s -- @v0.29.0', scope: 'client' },
  { what: 'Azure CLI with Bicep', why: 'Lets you check the infrastructure code locally. No Azure sign-in, no subscription.', part: 'Azure track · Part 05 (recommended)', check: 'az bicep version', windows: 'winget install --id Microsoft.AzureCLI -e, then az bicep install', mac: 'brew install azure-cli, then az bicep install', scope: 'later', track: 'azure' },
  { what: `uv and the Python diagrams library ${diagramsVersion}+`, why: 'The Azure team draws the HLD and LLD with the Python diagrams library and the latest Azure icons (Azure icons V18). uv runs it without a Python setup and fetches the library on first use.', part: 'Azure track · Part 05 (required)', check: `uv run --with "${diagramsRequirement}" python -c "import diagrams.azure.compute"`, windows: 'winget install --id astral-sh.uv -e', mac: 'brew install uv', scope: 'later', track: 'azure' },
  { what: 'Graphviz', why: 'The rendering engine behind the diagrams library. A system program, not a Python package.', part: 'Azure track · Part 05 (required)', check: 'dot -V', windows: `winget install --id Graphviz.Graphviz -e (elevated). winget does not add it to PATH: run [Environment]::SetEnvironmentVariable('Path', [Environment]::GetEnvironmentVariable('Path', 'User') + ';C:\\Program Files\\Graphviz\\bin', 'User'), then restart the terminal and your Copilot client`, mac: 'brew install graphviz', scope: 'later', track: 'azure' },
  { what: '.NET 10 SDK', why: 'Builds and tests the modernized application.', part: '.NET track · Part 06', check: 'dotnet --list-sdks shows 10.x', windows: 'winget install --id Microsoft.DotNet.SDK.10 -e', mac: 'brew install --cask dotnet-sdk', scope: 'later', track: 'dotnet' },
  { what: 'Azure DevOps project access', why: 'Only to publish the backlog. Skipping it changes nothing later.', part: 'Part 03 (optional)', check: 'You can open the project in a browser', windows: 'Facilitator provides organization, project and your prefix', mac: 'Same as Windows', scope: 'later' },
]

export const notNeeded = ['An Azure subscription', 'A Power Platform environment or licence', 'Visual Studio', 'A Python installation (uv brings its own for the Azure diagrams)', 'PDF readers or OCR', 'Node.js', 'Docker or Kubernetes']
export const pwshNote = 'Restart your Copilot client after installing PowerShell 7, or after adding Graphviz to PATH, so it finds pwsh and dot. On macOS and Linux you keep using your usual shell; pwsh only needs to be installed. Rows for tracks you did not choose are hidden.'

export const installation: Record<'cli' | 'cliUpdate' | 'apm', Prompt> = {
  cli: {
    title: 'Install the HVE Squad plugin pair (Copilot CLI)', kind: 'shell',
    text: 'copilot plugin marketplace add Peter-N91/hve-squad-plugin\ncopilot plugin install hve-squad@hve-squad-plugin\ncopilot plugin install hve-squad-hve-core@hve-squad-plugin\ncopilot plugin list',
  },
  cliUpdate: {
    title: `Already installed? Update both entries to ${squadVersion}`, kind: 'shell',
    text: 'copilot plugin update hve-squad@hve-squad-plugin\ncopilot plugin uninstall hve-squad-hve-core@hve-squad-plugin\ncopilot plugin install hve-squad-hve-core@hve-squad-plugin\ncopilot plugin list',
  },
  apm: {
    title: `Install HVE Squad v${squadVersion} into the workshop folder (VS Code)`, kind: 'shell',
    text: `apm --version\napm install "Peter-N91/hve-squad#v${squadVersion}" --target copilot`,
  },
}

export const readyScript: Prompt = {
  title: 'Check your machine and prepare Git', kind: 'shell',
  text: 'powershell -ExecutionPolicy Bypass -File tools\\ready.ps1',
  bash: 'bash tools/ready.sh',
}

export const readinessQuestion: Prompt = {
  title: 'Ask Copilot to read the case (no squad yet)', kind: 'plain',
  text: 'Read knowledge-docs/business-case.md, knowledge-docs/current-state.md and knowledge-docs/engineering-standards.md in this repository. Answer in plain language:\n1. What does Northwind want, in two sentences?\n2. Which business areas (BA-) does the case define, and which delivery track owns each one?\n3. What is the hard deadline, and which identifier states it?\n4. Which .NET version does Order Desk use today, according to current-state.md and the projects in src/?\nDo not create or change any files.',
}

const releaseShell: Prompt = {
  title: 'List the release tags', kind: 'shell',
  text: 'git tag -l "product/*"\ngit log --oneline --decorate -3',
}

export const agenda: { lesson: string; title: string; minutes: number; note?: string; optional?: boolean }[] = [
  { lesson: 'prepare', title: 'Get ready', minutes: 0, note: 'Before the session · about 30 min' },
  { lesson: 'orient', title: 'Meet Northwind & the method', minutes: 15 },
  { lesson: 'product', title: 'Shape the product', minutes: 60 },
  { lesson: 'ado', title: 'Publish to Azure DevOps', minutes: 20, optional: true },
  { lesson: 'federation', title: 'Open the federation', minutes: 10 },
  { lesson: '', title: 'Break', minutes: 10 },
  { lesson: 'migration', title: 'Azure: plan the migration', minutes: 60 },
  { lesson: 'modernize', title: '.NET: modernize to .NET 10', minutes: 60 },
  { lesson: 'powerplatform', title: 'Power Platform: design the claims solution', minutes: 60 },
  { lesson: 'together', title: 'Bring it together', minutes: 20 },
  { lesson: 'reflect', title: 'Reflect & next steps', minutes: 25 },
]

export const lessons: Lesson[] = [
  {
    id: 'prepare', number: '00', title: 'Get ready', eyebrow: 'Before the session', minutes: 0,
    goal: 'Arrive with a working folder, one Copilot client, HVE Squad installed and a strong model selected — so the session is spent learning, not installing.',
    concept: 'Everything you need is listed once, in the table below, with the part that needs it. You only need the "everyone" rows to start. The rest belong to a track and can wait until the part that uses them.',
    inputs: ['About 30 minutes', 'Permission to install software on your machine', 'Your GitHub account with Copilot'],
    steps: [
      { title: 'Get the starter solution', body: 'Use the button above. In Edge or Chrome you choose a folder on your computer and the guide writes a northwind-workshop folder into it. In other browsers you get a zip file: extract it wherever you like. Nothing is uploaded; the files come from this website.' },
      { title: 'Run the readiness check', body: 'Open a terminal inside the northwind-workshop folder and run the command for your system. It lists what is installed, flags what is missing for each part and track, and turns the folder into a Git repository with a first commit tagged "starter". It installs nothing and is safe to run again.', prompt: readyScript },
      { title: 'Install HVE Squad in your client', body: 'Follow the panel below for the client selected at the top of the page. Install once, in the client you will actually use. Then confirm that Squad Coordinator and Squad Federation Coordinator both appear in the agent list (App, CLI) or that /squad and /squad-federation appear as prompts (VS Code).' },
      { title: 'Choose your model and routing', body: 'Select a balanced model at least as capable as Claude Sonnet 5.5 in your client now, and keep it for the whole workshop. Not Auto. Then choose the model routing at the top of this page (Off, Ranked or Manual) — the guide adds it to every work request. Write both in your evidence log.' },
      { title: 'Check that Copilot can read the case', body: 'Open the northwind-workshop folder in your client. With no squad agent selected, ask the question below. Compare the answer with the documents: three business areas BA-01 to BA-03 owned by the Azure, .NET and Power Platform tracks, the deadline 30 June 2027 (C-01) and .NET Framework 4.8 (CS-01). If the answer is wrong or vague, tell the facilitator before the session.', prompt: readinessQuestion },
    ],
    evidence: ['A northwind-workshop folder that is a Git repository with the tag "starter"', 'The readiness check output', 'The model name and client you will use'],
    checks: [
      'My northwind-workshop folder exists and the readiness check shows Git OK.',
      `HVE Squad ${squadVersion} is installed in my client and both coordinators are visible.`,
      'I selected a model at least as capable as Claude Sonnet 5.5 (not Auto) and chose a model routing.',
      'Copilot read the case and correctly gave the business areas, the deadline (C-01) and the current .NET version (CS-01).',
    ],
    recovery: 'Tell the facilitator what is blocked before the session. A missing tool for a track or for Part 03 does not stop you from starting: those parts say exactly what they need.',
  },
  {
    id: 'orient', number: '01', title: 'Meet Northwind & the method', eyebrow: 'Start with the outcome', minutes: 15,
    goal: 'Understand the customer and its delivery tracks, and learn the difference between setting up a team and asking it for work.',
    concept: 'One repository, one customer, one product team — and one team per delivery track you choose: Azure, .NET, Power Platform. The product team writes the documents and a backlog tagged by track and by release, with numbered releases for each track. At the start of Part 02 you choose what to build — all tracks, one track or a selection — and the tracks you do not choose stay hidden. After promotion to a federation, each track team builds only from its own releases, so the tracks are independent and can be done in any order. More tracks will be added over time.',
    inputs: ['Your northwind-workshop folder open in your client', 'knowledge-docs/business-case.md, section 4 (business areas and delivery tracks)'],
    steps: [
      { title: 'Know the tracks before you choose', body: 'Section 4 of business-case.md lists the business areas and the track that delivers each one. You choose at the start of Part 02 — all tracks, one track or selected tracks — together with how much of the case the product documents cover. The tracks you do not choose are hidden from this guide; you can add one later.' },
      { title: 'Read the case in five minutes', body: 'Northwind Traders, a food distributor in Lyon, has three business areas. BA-01: leave its data centre before the lease ends on 30 June 2027 (C-01). BA-02: a Customer Portal (BR-01 to BR-12) served by Order Desk, a .NET Framework 4.8 application. BA-03: a delivery-claims process that replaces a shared spreadsheet (BR-14 to BR-19). Every fact has an identifier. That is deliberate: you will use those identifiers to catch invented or missing requirements.' },
      { title: 'Follow the chain', body: 'Product init → product work (the intake validator checks the case first, then documents and the tagged releases of each track) → (optional) publish to Azure DevOps → promote → for each track you chose: track init → track work → status across teams. Setup and work are always separate messages.' },
      { title: 'Know the three kinds of message', body: 'Setup (init, promote): no autopilot, you confirm. Work: autopilot plus your model routing, the squad runs the whole pipeline and stops for approvals. Questions: read-only, no mode. The guide labels every block and adds the right form for your client.' },
      { title: 'Keep an honest evidence log', body: 'Download the evidence log from Resources. Record what the squad did without being asked, what needed your answer, and what was missing. The checkboxes in this guide are only your own record; they do not inspect your project.' },
    ],
    evidence: ['The evidence log, started, with your client and model'],
    checks: ['I can name the product team, the three tracks and what each produces.', 'I know which messages use autopilot and which do not.'],
    recovery: 'If your client opened a different folder, switch to northwind-workshop before continuing. The squads only see the folder that is open.',
  },
  {
    id: 'product', number: '02', title: 'Shape the product', eyebrow: 'From business case to tagged releases', minutes: 60,
    goal: 'Choose what you build, then turn the business case into reviewed requirements, experiments and a backlog tagged by track and by release — with numbered releases for each chosen track and every statement traceable to its source.',
    concept: 'First choose what you build in the panel below: all tracks, one track or selected tracks, and how much of the case the documents cover. The tracks you do not choose are hidden from the rest of this guide. Then you set up one planning team and send a single work request. The team\'s intake validator checks the case for gaps and contradictions on its own before anything is drafted, and asks you when it needs a business decision. The request names your tracks and your scope[[full: (the whole case)]][[focused: ({areaList} only)]]. Every backlog item gets the tag of the track that delivers it and, once planned, the tag of its release. A track can have several releases (r1, r2…), each marked with a Git tag, so wherever the backlog is later published — Azure DevOps, GitHub or Jira — you can tell which items belong to which release. Your job is to answer as the customer, check that nothing was quietly invented, and approve the releases.',
    inputs: ['knowledge-docs (business case, current state, engineering standards — ES-30, ES-31 and ES-39 define tags and releases)', 'Your choice of tracks and scope, in the panel below', 'The business answers on this page — you play Northwind when the squad asks'],
    setup: [{
      id: 'product-team',
      title: '1. Set up the planning team',
      description: 'Select Squad Coordinator (App, CLI) or use /squad (VS Code). Send the message. The coordinator will offer a single squad or a federation: choose a single squad. Review the proposed team and confirm.',
      request: {
        title: 'Set up a team for the planning work', kind: 'setup', entry: 'squad', lifecycle: 'init',
        text: "init\n\nUse the documents in knowledge-docs at the root of this repository as context: business-case.md, current-state.md and engineering-standards.md. We need to understand Northwind's needs[[full: across the whole business case]][[focused: in the business areas {areaList}]], define business and product requirements, test the riskiest assumptions and prepare a backlog with tagged releases for each delivery track ({trackList}) before any development starts. Set up a single team for this planning work. Stop once the team is ready; I will send the work request next.",
      },
      expected: [
        'The coordinator proposes the product profile from the purpose of the work, without you naming it.',
        'You confirm, and the team state appears under .copilot-tracking/squad/.',
        'No requirement document, backlog, release or experiment is produced yet.',
      ],
      checkpoint: 'The planning team is set up and no documents were produced yet.',
    }],
    flow: [
      {
        heading: '2. Ask for the product documents and the releases',
        hint: 'Still with Squad Coordinator. One work request with mode="autopilot", built from your tracks and scope: the squad assesses the case itself — its intake validator looks for gaps and contradictions before anything is drafted — then plans, writes and reviews the documents and proposes the releases of each track. If it asks you something, answer as Northwind using the panel below. It should ask for your approval before it commits and tags the releases.',
        prompt: {
          title: 'Prepare the product documents and the releases of each track', kind: 'work', entry: 'squad', requiresSetup: ['product-team'],
          text: "Using knowledge-docs at the root of this repository, turn Northwind's business case into documents my teams can review and build from. We deliver through these tracks, each run by its own team that builds only from its own releases: {trackList}.[[full: Cover the whole business case, every business area (BA-) included, so another track can be added later.]][[focused: Cover only the business areas of those tracks — {areaList} — and list the other areas as out of scope.]]\n1. A business requirements document.\n2. A product requirements document covering the planned releases.\n3. A Minimum Viable Experiment for each business area in scope, testing its riskiest assumption before we commit to building.\n4. A prioritized backlog of epics, features and user stories with acceptance criteria, including the enabler work a track needs before its features. Tag every item with the track that delivers it (ES-30).\n5. The releases of each track, in docs/product/releases (ES-31). A track can have several releases, numbered r1, r2… in delivery order: propose how many each track needs from the backlog priorities. Every item planned in a release carries that release's tag as well as its track tag, so the releases stay identifiable wherever the backlog is published — Azure DevOps, GitHub or Jira (ES-39):{releaseList}\nFollow engineering-standards.md for the writing style, the file locations and traceability: cite the source identifier for every requirement and story, label assumptions and open questions, and include the traceability table. Record dependencies between tracks as OPEN items; no release waits for another. When I approve the releases, commit the product documents and create the Git tag of each approved release. I want documents to review, not an implementation.",
        },
      },
    ],
    answers: [
      { question: 'OQ-01 · How do customers sign in?', answer: 'Microsoft Entra External ID. Staff keep Entra ID.', tracks: ['dotnet'] },
      { question: 'OQ-02 · Dutch in the first release?', answer: 'No. French and English first; Dutch in release 2.', tracks: ['dotnet'] },
      { question: 'OQ-03 · Who has customer administrators?', answer: 'About 120 large customers. Order Desk staff manage users for the rest.', tracks: ['dotnet'] },
      { question: 'BR-04 vs CS-10 · How fresh must the status be?', answer: 'Up to 1 hour old. StockPilot updates must become at least hourly.', tracks: ['dotnet', 'azure'] },
      { question: 'BR-07 · How far back do invoices go?', answer: '24 months.', tracks: ['dotnet'] },
      { question: 'OQ-04 · Who approves claims of EUR 500 or less?', answer: 'The Order Desk team lead on duty. Finance approves above EUR 500.', tracks: ['powerPlatform'] },
      { question: 'OQ-05 · Move the existing claims?', answer: 'No. The spreadsheet stays read-only for two years; only new claims go into the new solution.', tracks: ['powerPlatform'] },
    ],
    behaviors: [
      'Before drafting, the intake validator assesses the case on its own and raises gaps and contradictions without being told where to look.[[full|azure|dotnet: Example: BR-04 ("always up to date") against CS-10 (nightly StockPilot batch).]][[full|powerPlatform: Example: claims need Order Desk order lines, but Order Desk has no API (CS-27).]]',
      'Each gap is either put to you as a question or recorded as an ASSUMPTION or OPEN item with an owner; nothing is silently invented.',
      'Your answers are recorded as decisions, not only acknowledged in chat.',
      'Every backlog item carries exactly one track tag, and a story that needs two tracks is split (ES-30).',
      'Releases are numbered in delivery order, every item planned in a release carries that release\'s tag, and each release lists its dependencies on other tracks as OPEN items instead of waiting for them (ES-31).',
      'It asks for your approval before it commits the documents and creates the release tags.',
      'If a council is convened, it is sized to the work and recorded in the decision log with the roles that took part.',
    ],
    reviewKey: {
      title: 'How to review the documents in 15 minutes',
      intro: 'You do not need to read everything. These five checks catch the problems that matter most: invented requirements, missing requirements, mixed-up tracks and stories nobody can build from.',
      items: [
        { label: 'Coverage', detail: 'Open the traceability table. [[full:Every BR-01 to BR-19 and NFR-01 to NFR-09 must appear, either covered by a story or listed as not covered with a reason.]][[focused:Every BR- and NFR- identifier of {areaList} (see section 4 of business-case.md) must appear, covered by a story or listed as not covered with a reason, and the other areas must be listed as out of scope.]]' },
        { label: 'Invention', detail: 'Pick three stories. For each, open the identifier it cites. Does the source really say that? Anything else must be labelled ASSUMPTION.' },
        { label: 'Intake', detail: 'Find the open questions in scope[[full|dotnet: — OQ-01 to OQ-03 for BA-02]][[full|powerPlatform: — OQ-04 and OQ-05 for BA-03]][[full|azure|dotnet: — and the BR-04 / CS-10 conflict]]. Each should be resolved by your answer or listed as ASSUMPTION or OPEN with an owner — never quietly decided.' },
        { label: 'Tags and releases', detail: 'Every backlog item carries exactly one track tag (ES-30), and every item planned in a release carries exactly one release tag, such as {releaseNames} (ES-31). Each release file in docs/product/releases names its stories, the identifiers it covers, what it leaves out and its dependencies on other tracks as OPEN items (ES-31). Could its team start without waiting for another track?' },
        { label: 'Readability', detail: 'Give one story to someone who has not read the case. Could they build it from the story and its Given/When/Then criteria alone (ES-05)?' },
      ],
    },
    steps: [
      { title: 'Watch the intake', body: 'Note what the intake validator found on its own, which questions it asked you and which points it recorded as assumptions. Answer only what it asks, using the business answers panel. Did it catch the contradictions in your scope?' },
      { title: 'Check coverage and invention', body: 'Use the review key above. Record how many requirements were covered, how many invented statements you found and whether they were labelled as assumptions.' },
      { title: 'Challenge the experiments', body: 'A Minimum Viable Experiment tests an assumption before you build; it is not an MVP. For each area in scope, which assumption did the squad pick[[full|dotnet: (for example, that customers will actually reorder online — SM-01)]][[full|powerPlatform: (for example, that staff can record a claim in under 2 minutes — BR-14)]]? What is the cheapest test, the measure and the decision threshold? An experiment that has not been run has no results.' },
      { title: 'Correct, do not rewrite', body: 'If something is wrong, tell the squad what is wrong and why, citing the identifier, and let it fix the document. That correction is part of your evidence.' },
      { title: 'Approve the releases and check the tags', body: 'Read each release file: could its team build it without waiting for another track? Approve the releases, then check that the squad committed the documents and created one Git tag per approved release, for example {releaseTags}. If it did not, create them yourself (see Resources) and record that you had to.', prompt: releaseShell },
    ],
    evidence: ['What you build (all, one or selected tracks) and the product scope, in your evidence log', 'docs/product with the BRD, PRD, experiments, backlog and traceability table', 'docs/product/releases with the numbered releases of each chosen track, and one product/* Git tag per release', 'What the intake found on its own, and what it asked you', 'Your coverage and invention counts', 'At least one correction you asked for'],
    checks: [
      'The traceability table lists every BR- and NFR- identifier in scope.',
      'I checked three stories against their sources and recorded what I found.',
      'Every open question in scope is answered or labelled ASSUMPTION or OPEN[[full|azure|dotnet:, and so is the BR-04 / CS-10 conflict]].',
      'I approved the releases of each chosen track, and git tag -l "product/*" lists one tag per release.',
    ],
    recovery: 'If the documents are not finished after 45 minutes, ask the squad to finish the backlog, the release files and the traceability table first: the track teams build from the releases. Never copy documents from another participant to catch up — note the gap instead.',
  },
  {
    id: 'ado', number: '03', title: 'Publish to Azure DevOps', eyebrow: 'Optional · team visibility', minutes: 20, optional: true,
    goal: 'Put the approved releases and documents in Azure DevOps, tagged by track and by release, with your approval before anything is created.',
    concept: 'This part is optional. Nothing later depends on it: each track team reads its release from docs/product/releases. Do it if your facilitator prepared an Azure DevOps project; skip it otherwise. The track and release tags are what make the releases identifiable after publishing; the same tags become labels and milestones in GitHub, or labels and fix versions in Jira (ES-39).',
    inputs: ['Your approved releases in docs/product/releases', 'Organization, project and your participant prefix from the facilitator', 'The Azure DevOps MCP server configured in your client (below)'],
    flow: [{
      heading: 'Publish the approved releases',
      hint: 'Fill in Session setup first (top right): the guide adds your project details to the request. Stay with Squad Coordinator — the product team is still a single squad at this point.',
      prompt: {
        title: 'Make the releases available to the teams', kind: 'work', entry: 'squad', requiresSetup: ['product-team'], requiresChecks: ['product-3'], publication: true,
        text: 'We are happy with the reviewed plan. Publish the approved releases to our Azure DevOps project as epics, features and user stories with their acceptance criteria, keeping the source identifiers in each description (ES-29). Store the business requirements, product requirements and experiment designs at the agreed documentation location and link them to the relevant work items. Tag every work item nw-workshop, its track tag (ES-30) and, if it is planned in a release, its release tag such as azure-r1 (ES-31, ES-39), and start every title with my participant prefix (ES-28). Show me the exact changes and wait for my approval before creating anything.',
      },
    }],
    behaviors: [
      'The squad checks the project, its process and your access before proposing changes.',
      'It shows the exact items, hierarchy, tags and destination and waits for your approval.',
      'After approval it reports real work-item identifiers and records any partial failure honestly.',
    ],
    steps: [
      { title: 'Connect the official Azure DevOps MCP server', body: 'Use Microsoft\'s hosted (remote) server: no Node.js, no token, you sign in with your work account. Add it to your client as shown in the panel below, then ask Copilot "List my Azure DevOps projects" to confirm it works.' },
      { title: 'Review before you approve', body: 'Check the number of items, the hierarchy, the titles with your prefix, the track and release tags and the documentation destination. Approve only what you reviewed. A changed batch needs a new approval.' },
      { title: 'Inspect the result in the browser', body: 'Open two created work items. Do they show the acceptance criteria, the source identifiers and the track tag? Are the documents linked? Filter the backlog by one release tag, for example azure-r1: does it list exactly the items of that release file?' },
    ],
    evidence: ['Work-item identifiers and links', 'The approval you gave', 'Any limitation you hit'],
    checks: ['I reviewed the exact changes before approving them.', 'I opened created work items and checked their content, track and release tags and links.'],
    recovery: 'Known limitation: in some clients, MCP servers are visible to the coordinator but not to the specialists it dispatches. If the squad reports it cannot reach Azure DevOps, let it publish from the coordinator, or skip this part and record the limitation. Never work around it with a personal access token in a file or prompt.',
  },
  {
    id: 'federation', number: '04', title: 'Open the federation', eyebrow: 'Single squad → federation', minutes: 10,
    goal: 'Keep the product team and everything it produced, and make room for one team per delivery track you chose.',
    concept: 'Promotion turns your single squad into the first member of a federation, keeping its decisions and history. Each track team you add next is a separate member with its own roster, decisions and history, and builds only from its own releases — so the track parts that follow can be done in any order, and any of them can be skipped.',
    inputs: ['Your approved releases in docs/product/releases and their product/* Git tags'],
    setup: [{
      id: 'promote',
      title: '1. Promote the product team',
      description: 'Switch to Squad Federation Coordinator (App, CLI) or use /squad-federation (VS Code). Send the message, read what will move and confirm.',
      request: {
        title: 'Keep the product team, make room for the track teams', kind: 'setup', entry: 'squad-federation', lifecycle: 'promote', requiresSetup: ['product-team'], requiresChecks: ['product-3'],
        text: 'promote\n\nWe want to keep this planning team and everything it produced while making room for one team per delivery track ({trackList}) on the same repository. Prepare that transition and name the existing team "{productSquad}". Show me what will change before you move anything. Stop once the existing team is preserved; do not add another team or start new work.',
      },
      expected: [
        'The existing team becomes the first member of a federation named as you asked; its decisions and history are moved, not recreated.',
        'docs/, knowledge-docs and the product/* tags stay where they are.',
        'No new team is added yet.',
      ],
      checkpoint: 'Promotion is complete and the product team\'s work is preserved.',
    }],
    steps: [
      { title: 'Check what moved', body: 'Open .copilot-tracking/squad/. The product team now sits under members/ with its decisions and history, and federation.md lists it with its profile. docs/ and knowledge-docs did not move.' },
      { title: 'Check the releases did not change', body: 'Promotion moves squad state, never your deliverables. The release tags must still point at the commits you approved.', prompt: { title: 'Check the release tags and the documents', kind: 'shell', text: 'git tag -l "product/*"\ngit status --short docs' } },
    ],
    evidence: ['The promotion summary', 'federation.md listing the product team'],
    checks: ['The product team is the first member of the federation, with its decisions and history moved, not recreated.', 'docs/product and the product/* tags are unchanged.'],
    recovery: 'If the coordinator offers to add a team or start work, decline: promotion only preserves the existing team. If promotion stops half-way, never initialize a new federation over it; ask the federation coordinator for the status and record what happened.',
  },
  {
    id: 'migration', number: '05', track: 'azure', title: 'Plan the Azure migration', eyebrow: 'Azure track · BA-01', minutes: 60,
    goal: 'Add an Azure team that builds from the Azure release and produces an evidence-based plan to move Order Desk to Azure — without deploying anything.',
    concept: 'The Azure team builds only from its own releases and does not wait for any other track. It reads the code and scripts, not just the documents: the blockers are in the files. Its application-change list is useful to whoever modernizes Order Desk[[dotnet:, and the .NET team can align with it if it exists — it never waits for it]].',
    inputs: ['The first Azure release: docs/product/releases/azure-r1.md (Git tag product/azure-r1). Later releases (r2, r3…) are built the same way', 'knowledge-docs/current-state.md and the code in src/ and database/', 'Azure CLI with Bicep (recommended, for checking the infrastructure code)', `uv and Graphviz, so the diagrams render with the latest Azure icons (Python diagrams library ${diagramsVersion} or later)`],
    setup: [
      {
        id: 'migration-team',
        title: '1. Add the Azure team',
        description: 'Use the federation coordinator. Send the message, review the proposed team and confirm. If the squad registers a different name, update it in Session setup.',
        request: {
          title: 'Add a team for the Azure migration', kind: 'setup', entry: 'squad-federation', lifecycle: 'init', requiresSetup: ['promote'],
          text: 'init\n\nAdd a new team named "{migrationSquad}" to this federation. Its job: plan moving Order Desk and its database from Northwind\'s Lyon data centre to Azure — target architecture, infrastructure as code, cost and the migration plan — from the Azure releases the product team tagged product/azure-r1, product/azure-r2 and so on, starting with product/azure-r1. Use as context knowledge-docs (especially current-state.md, business area BA-01 and the constraints in business-case.md, and the Azure standards in engineering-standards.md), the code in src/, the scripts in database/ and docs/product. Keep the "{productSquad}" team\'s work and responsibilities separate. Set up this team only; I will send the work request next.',
        },
        expected: [
          'An Azure-oriented profile is proposed from the purpose of the work, without you naming it.',
          'The new team is registered next to the product team with separate responsibilities.',
          'No architecture or code is produced yet.',
        ],
        checkpoint: 'The Azure team is set up inside the federation.',
      },
    ],
    flow: [{
      heading: '2. Ask for the migration plan',
      hint: 'The guide adds squad="…" so the request goes to the Azure team, plus mode="autopilot" and your model routing. Expect this to take 20 to 35 minutes; review the product of each stage as it appears.',
      prompt: {
        title: 'Plan the move to Azure', kind: 'work', entry: 'squad-federation', requiresSetup: ['migration-team'], squadTarget: 'migrationSquad',
        text: `Plan the move of Order Desk and its database to Azure before the data-centre lease ends (C-01), for the release tagged product/azure-r1 (docs/product/releases/azure-r1.md). Use knowledge-docs, the code in src/ and the scripts in database/. I need:\n1. An assessment of everything that blocks running Order Desk on Azure platform services, with evidence (file and line) from the code and scripts.\n2. A target architecture: high-level and low-level design with decision records, including how Order Desk keeps exchanging data with StockPilot, which stays on premises (C-03), often enough to meet BR-04.\n3. Architecture diagrams for the high-level and the low-level design, drawn with the python-diagrams skill: Python generator scripts that use the diagrams library (${diagramsRequirement}, which carries the latest Azure icons) and only its diagrams.azure nodes for Azure services, rendered with Graphviz to PNG and SVG files committed in docs/architecture next to their scripts (ES-38). Run them with uv run --with "${diagramsRequirement}". Do not replace them with Mermaid; if uv, the library or Graphviz is missing, stop and tell me what to install.\n4. Bicep for a test and a production environment under infra/, following engineering-standards.md, validated locally with az bicep build but not deployed.\n5. A monthly cost estimate for both environments compared with the budget in C-04.\n6. A phased migration plan with data migration, cut-over and rollback steps that meets NFR-06 and BR-13.\n7. A numbered list of the application changes Order Desk needs to run on the chosen platform, for whichever team modernizes it.\nFollow engineering-standards.md. Record dependencies on other tracks as OPEN items; do not wait for them. Do not deploy, sign in to Azure or create any resource.`,
      },
    }],
    behaviors: [
      'Research reads src/ and database/ and cites files, not only the documents.',
      'Because the request crosses architecture, cost and security, a council is convened before implementation and its verdict is recorded.',
      'Choices between options (for example Azure SQL Database versus SQL Managed Instance) are written as decision records with the rejected option and why.',
      'The review stage checks the Bicep against the standards and reports findings instead of declaring success.',
      'The architect uses the python-diagrams skill: a generator script per diagram and paired PNG and SVG files, with every Azure service drawn as a diagrams.azure node, not a generic box.',
    ],
    reviewKey: {
      title: 'Blockers hidden in the starter — how many did the squad find?',
      intro: 'These are real problems in the starter files. Tick off the ones the assessment found on its own, with evidence. Do not give the list to the squad: the point is to see what it discovers.',
      items: [
        { label: 'Windows authentication', detail: 'Staff sign in with Windows Integrated Authentication against on-premises AD (CS-04, Web.config).' },
        { label: 'Database login', detail: 'Connection string uses Integrated Security to NWSQL01 (CS-13) — needs a managed identity (ES-25).' },
        { label: 'Invoice file share', detail: 'Invoices are read from a UNC path (CS-08, CS-14, InvoiceStore.cs).' },
        { label: 'Event Log', detail: 'Errors go to the Windows Event Log (CS-15, EventLogErrorLogger.cs).' },
        { label: 'In-process session', detail: 'Draft orders live in InProc session state (CS-16, OrdersController.cs), which breaks with more than one instance.' },
        { label: 'Unauthenticated SMTP', detail: 'Mail goes through an internal relay on port 25 (CS-12, Web.config).' },
        { label: 'xp_cmdshell and bcp', detail: 'The StockPilot export shells out with xp_cmdshell (database/003-stockpilot-exchange.sql) — not available in Azure SQL Database or Managed Instance.' },
        { label: 'BULK INSERT from a local disk', detail: 'The shipment import reads D:\\Exchange (same file).' },
        { label: 'SQL Server Agent job', detail: 'The nightly exchange is scheduled by SQL Agent (same file header), which Azure SQL Database does not have.' },
        { label: 'Status freshness', detail: 'The nightly batch (CS-10) cannot meet BR-04, nor the 1-hour limit if you gave that answer in Part 02.' },
        { label: 'No build pipeline', detail: 'Publishing from Visual Studio and copying files by hand (CS-19).' },
        { label: 'Data residency and recovery', detail: 'EU only (NFR-03, ES-20) and RPO 1 h / RTO 4 h (NFR-06), with no DR test ever (CS-23).' },
      ],
    },
    steps: [
      { title: 'Score the assessment', body: 'Use the review key. Record how many blockers were found unprompted and whether each cites a file. Ask the squad about any that are missing, and note that you had to.' },
      { title: 'Render the diagrams yourself', body: `Run the command below. Every generator script in docs/architecture should render again on your machine, with the latest Azure icons (diagrams ${diagramsVersion} or later). Open the PNG or SVG: does each Azure service show its official icon, and does the LLD show the private endpoints (ES-25) and the StockPilot link?`, prompt: {
        title: 'Re-render every architecture diagram', kind: 'shell',
        text: `Get-ChildItem docs/architecture -Recurse -Filter *.py | Where-Object Name -ne 'diagram_io.py' | ForEach-Object { Push-Location $_.DirectoryName; uv run --quiet --with "${diagramsRequirement}" python $_.Name; $code = $LASTEXITCODE; Pop-Location; "{0}  {1}" -f ($(if ($code -eq 0) { "OK  " } else { "FAIL" })), $_.FullName }`,
        bash: `find docs/architecture -name "*.py" ! -name diagram_io.py | while read -r f; do (cd "$(dirname "$f")" && uv run --quiet --with "${diagramsRequirement}" python "$(basename "$f")") && echo "OK    $f" || echo "FAIL  $f"; done`,
      } },
      { title: 'Read the decisions, not just the diagrams', body: 'Open docs/architecture. For the database and the StockPilot exchange, is there a decision record that names the options, the choice and the reason? Does the design stay within C-04 and C-06 (no Kubernetes)?' },
      { title: 'Validate the infrastructure code yourself', body: 'Run the command below in your terminal. Every Bicep file should build without errors. Check one file for the naming (ES-23), tags (ES-24) and private endpoints (ES-25).', prompt: {
        title: 'Build every Bicep file locally', kind: 'shell',
        text: 'Get-ChildItem infra -Recurse -Filter *.bicep | ForEach-Object { az bicep build --file $_.FullName --stdout | Out-Null; "{0}  {1}" -f ($(if ($LASTEXITCODE -eq 0) { "OK  " } else { "FAIL" })), $_.FullName }',
        bash: 'find infra -name "*.bicep" | while read -r f; do az bicep build --file "$f" --stdout >/dev/null && echo "OK    $f" || echo "FAIL  $f"; done',
      } },
      { title: 'Check the hand-over', body: 'Open the numbered list of application changes. Each change should name the file or component, the reason and the target approach, so that a team that was not in the room can act on it.[[dotnet: The .NET team can use it, but must not have to wait for it.]]' },
    ],
    evidence: ['docs/architecture with the diagram scripts and their PNG and SVG files, docs/migration and infra/', 'Your blocker score, the diagram rendering output and the Bicep validation output', 'The numbered application-change list'],
    checks: [
      'I scored the assessment against the review key.',
      'I found decision records for the database and the StockPilot exchange.',
      'Every Bicep file builds locally, or I recorded which one fails and why.',
      'The application-change list exists and names files and target approaches.',
      'Nothing was deployed and no Azure resource was created.',
      'The HLD and LLD diagrams re-render on my machine as PNG and SVG with the latest Azure icons.',
    ],
    recovery: 'If the run is still going after 40 minutes, let it finish the assessment and the change list first. If the diagrams do not render, check dot -V and uv --version, then see "The architecture diagrams do not render" in Resources. Do not accept Mermaid instead: record the problem and ask the squad to re-run the generators once the tools work.',
  },
  {
    id: 'modernize', number: '06', track: 'dotnet', title: 'Modernize to .NET 10', eyebrow: '.NET track · BA-02', minutes: 60,
    goal: 'Add a .NET team that delivers the enabler of the .NET release: upgrade Order Desk in place from .NET Framework 4.8 to .NET 10 — with every pricing test still passing.',
    concept: 'The .NET team builds only from its own releases and does not wait for any other track. It finds the blockers itself[[azure:; if the Azure team has already produced its application-change list, it follows the approaches chosen there]]. Success is measurable: the solution builds and its tests pass with the .NET CLI on any operating system, the pricing assertions are unchanged, and the solution still has three projects.',
    inputs: ['The first .NET release: docs/product/releases/dotnet-r1.md (Git tag product/dotnet-r1). Later releases (r2, r3…) are built the same way', 'The solution in src/ (28 tests today, Windows and Visual Studio only)', '.NET 10 SDK', '[[azure:Optional: the Azure team\'s architecture and application-change list, if they exist]]'],
    setup: [{
      id: 'modernization-team',
      title: '1. Add the .NET team',
      description: 'Use the federation coordinator. Send the message, review the proposed team and confirm. Update the name in Session setup if the squad registers a different one.',
      request: {
        title: 'Add a team for the .NET modernization', kind: 'setup', entry: 'squad-federation', lifecycle: 'init', requiresSetup: ['promote'],
        text: 'init\n\nAdd a new team named "{modernizationSquad}" to this federation. Its job: modernize the Order Desk application in src/ from .NET Framework 4.8 to .NET 10, as the enabler of the .NET releases the product team tagged product/dotnet-r1, product/dotnet-r2 and so on, starting with product/dotnet-r1, so it can serve the Customer Portal and run on Azure platform services. Use as context knowledge-docs (especially engineering-standards.md), the solution in src/ and docs/product[[azure:, and, if they exist, the architecture and application-change list of the "{migrationSquad}" team]]. Keep the other teams\' work and responsibilities separate. Set up this team only; I will send the work request next.',
      },
      expected: [
        'A modernization-oriented profile is proposed without you naming it.',
        'The team is registered as a new member of the federation.',
        'No code is changed yet.',
      ],
      checkpoint: 'The .NET team is set up inside the federation.',
    }],
    flow: [{
      heading: '2. Ask for the upgrade',
      hint: 'The guide targets the .NET team and adds mode="autopilot" and your model routing. With Manual routing this new team asks for its own models first. The squad may stop at a risk gate and ask you to approve with conditions — read the conditions before you answer.',
      prompt: {
        title: 'Modernize Order Desk in place', kind: 'work', entry: 'squad-federation', requiresSetup: ['modernization-team'], squadTarget: 'modernizationSquad',
        text: 'Modernize Order Desk in place from .NET Framework 4.8 to .NET 10, as the enabler of the release tagged product/dotnet-r1 (docs/product/releases/dotnet-r1.md), following engineering-standards.md:\n1. Keep one solution with the existing Core, Web and Tests projects (ES-13), converted to SDK-style projects targeting net10.0.\n2. Move the web application from ASP.NET MVC 5 to ASP.NET Core MVC with the same pages and behaviour.\n3. Make it ready for Azure platform services (ES-21): identify what blocks it — configuration, logging, data access, session state, invoice storage, authentication and e-mail — and choose approaches that follow engineering-standards.md, recorded as decision records.[[azure: If the "{migrationSquad}" team has already listed application changes, use the approaches its design selected; do not wait for it.]]\n4. Keep the pricing behaviour and every existing test assertion (CS-20, ES-18). Tests may move to a current test framework; their expected values must not change.\n5. Finish when dotnet build and dotnet test succeed for src/Northwind.OrderDesk.sln on any operating system. If time is short, finish Core and Tests first, then the Web project.\n6. Record what changed, why, how it was verified and which release stories it enables in docs/modernization.\nRecord dependencies on other tracks as OPEN items. Do not deploy.',
      },
    }],
    behaviors: [
      'Research identifies the blockers itself: non-SDK projects, packages.config, MSTest v1 from the Visual Studio installation, System.Web, ConfigurationManager.',
      'Security review raises dependency and secret-handling conditions; a risk gate asks you rather than deciding alone.',
      'The review loop reports findings, fixes them and re-reviews before claiming the work is done.',
      'The squad respects ES-13: no new project per class or feature without a decision record.',
    ],
    steps: [
      { title: 'Prove it builds and the tests pass', body: 'Run both commands yourself. Expect at least 28 tests, all passing — the same number as the legacy suite, or more.', prompt: {
        title: 'Build and test with the .NET CLI', kind: 'shell',
        text: 'dotnet build src/Northwind.OrderDesk.sln\ndotnet test src/Northwind.OrderDesk.sln',
      } },
      { title: 'Prove the pricing did not change', body: 'Compare the tests with the starter. Framework attributes and using lines may change; the numbers inside Assert calls must not. Any changed expected value is a finding to raise with the squad.', prompt: {
        title: 'Compare the tests with the starter', kind: 'shell',
        text: 'git diff starter --stat -- src/Northwind.OrderDesk.Tests\ngit diff starter -- src/Northwind.OrderDesk.Tests/PricingServiceTests.cs',
      } },
      { title: 'Check the structure', body: 'The solution should still list three projects. Anything more needs a decision record (ES-13).', prompt: {
        title: 'List the projects in the solution', kind: 'shell',
        text: 'dotnet sln src/Northwind.OrderDesk.sln list',
      } },
      { title: 'Trace the release', body: 'Open docs/modernization. For three items — stories of the .NET release[[azure: or changes from the Azure team\'s list]] — find what was done, or why it is still open.' },
    ],
    evidence: ['dotnet build and dotnet test output', 'The git diff of the tests against "starter"', 'docs/modernization and the release items it closes or leaves open'],
    checks: [
      'dotnet build and dotnet test succeed, with at least 28 passing tests.',
      'No expected value in the pricing tests changed.',
      'The solution still has the Core, Web and Tests projects, and no unexplained extra project.',
      'I traced three release items to what the .NET team did.',
    ],
    recovery: 'If the Web project is not finished, that is acceptable: Core and Tests on .NET 10 with green tests is a valid first slice. Record what remains. Do not accept a summary that says "done" when dotnet test fails.',
  },
  {
    id: 'powerplatform', number: '07', track: 'powerPlatform', title: 'Design the claims solution on Power Platform', eyebrow: 'Power Platform track · BA-03', minutes: 60,
    goal: 'Add a Power Platform team that turns its release into a claims solution a maker team could build — Dataverse model, app, approval flow, integration, environments and licences — without touching a real environment.',
    concept: 'The Power Platform team builds only from its own releases and does not wait for any other track. Power Platform expertise arrives as a pack on top of the team\'s profile: the squad proposes the power-platform pack because the request names the platform, and asks you to install its two specialists. The hard problems here are licences, on-premises data and approvals, not code.',
    inputs: ['The first Power Platform release: docs/product/releases/power-platform-r1.md (Git tag product/power-platform-r1). Later releases (r2, r3…) are built the same way', 'knowledge-docs: BA-03, C-07 and C-08 in business-case.md, CS-24 to CS-28 in current-state.md, ES-32 to ES-37 in engineering-standards.md', `APM CLI ${apmCliVersion}, to install the pack's two specialists when the squad asks`],
    setup: [{
      id: 'power-platform-team',
      title: '1. Add the Power Platform team',
      description: 'Use the federation coordinator. It should propose a profile together with the power-platform pack, and show the install commands of the pack\'s two specialists. Run them in a terminal inside the northwind-workshop folder (add --target copilot if APM reports "No harness detected"), reload your client if needed, then confirm. If you cannot install them, go on without those roles and record it.',
      request: {
        title: 'Add a team for the delivery-claims solution', kind: 'setup', entry: 'squad-federation', lifecycle: 'init', requiresSetup: ['promote'],
        text: 'init\n\nAdd a new team named "{powerPlatformSquad}" to this federation. Its job: design the delivery-claims solution of business area BA-03 on Power Platform — Power Apps, Power Automate and Dataverse — from the Power Platform releases the product team tagged product/power-platform-r1, product/power-platform-r2 and so on, starting with product/power-platform-r1. Use as context knowledge-docs (especially BA-03 in business-case.md, the claims facts in current-state.md and the Power Platform standards in engineering-standards.md) and docs/product. Keep the other teams\' work and responsibilities separate. Set up this team only; I will send the work request next.',
      },
      expected: [
        'A profile is proposed together with the power-platform pack, because the request names the platform.',
        'The pack\'s specialists are offered with their exact install commands, origin and licence — not seeded before they are installed.',
        'The team is registered in the federation with its profile and pack, for example "default +power-platform".',
        'No design is produced yet.',
      ],
      checkpoint: 'The Power Platform team is set up inside the federation, and I recorded whether the pack\'s specialists were installed.',
    }],
    flow: [{
      heading: '2. Ask for the claims solution design',
      hint: 'The guide targets the Power Platform team with squad="…" and adds mode="autopilot" and your model routing. Nothing touches a tenant: the squad designs, writes a connector definition and reviews.',
      prompt: {
        title: 'Design the delivery-claims solution', kind: 'work', entry: 'squad-federation', requiresSetup: ['power-platform-team'], squadTarget: 'powerPlatformSquad',
        text: 'Design the delivery-claims solution on Power Platform for the release tagged product/power-platform-r1 (docs/product/releases/power-platform-r1.md). Use knowledge-docs and docs/product. I need:\n1. A solution design with decision records: which components (canvas or model-driven app, Power Automate flows, Dataverse) serve each story of the release, and why.\n2. The Dataverse data model: tables, columns, relationships, choices and security roles.\n3. The approval flow, with the thresholds and the separation of duties the requirements set.\n4. How the solution reads order lines from Order Desk and hands credit-note requests to the finance system, today and after Order Desk moves to Azure, including a custom connector definition (OpenAPI 2.0) for the Order Desk API it needs, under powerplatform/.\n5. The environment, data loss prevention and application lifecycle plan: environments, managed solution, connection references and environment variables.\n6. A licence and monthly run-cost estimate compared with C-08, with the price sources you used.\n7. A traceability table from every story of the release to the design.\nFollow engineering-standards.md. Record dependencies on other tracks as OPEN items; do not wait for them. Do not create, import or change anything in a real Power Platform environment or tenant.',
      },
    }],
    behaviors: [
      'The coordinator offers the power-platform pack without being told, and the pack\'s specialists take part once installed.',
      'Research reads current-state.md and finds that Order Desk has no API and sits on the Lyon network, instead of assuming a ready-made connector.',
      'Licence and cost choices are written as decision records with the rejected options, not as a single sentence.',
      'The review stage checks the design against ES-34 to ES-37 and reports findings instead of declaring success.',
    ],
    reviewKey: {
      title: 'Traps hidden in the case — how many did the team find?',
      intro: 'These problems are in the knowledge-docs, not in code. Tick off the ones the design addresses on its own, citing the identifier. Do not give the list to the squad.',
      items: [
        { label: 'Licences', detail: 'Dataverse, custom connectors and the SQL Server connector are premium: the Microsoft 365 E3 licences (C-07) do not cover them. Premium licences for about 52 users must fit C-08, or the design must justify an alternative.' },
        { label: 'No Order Desk API', detail: 'Order Desk has no API and its database is reachable only from Lyon (CS-27, CS-09). ES-36 forbids a direct database connection: the design needs an API — an OPEN dependency on another track — or an on-premises data gateway as an interim step.' },
        { label: 'Finance hand-off', detail: 'The finance system has no API and imports a CSV file from a file share before 18:00 (CS-25). The flow needs a way to write there, and credit notes stay in the finance system (out of scope in business-case.md).' },
        { label: 'Separation of duties', detail: 'Claims above EUR 500 go to Finance and nobody approves their own claim (BR-15). OQ-04 decides the approver below EUR 500.' },
        { label: 'Default environment', detail: 'Only the default environment exists, with 23 personal apps and no DLP policy (CS-26). The plan needs dedicated environments in Europe and a DLP policy (ES-35, NFR-03).' },
        { label: 'Solution and lifecycle', detail: 'One solution NorthwindClaims with the nw prefix, managed in test and production, with connection references and environment variables (ES-34, ES-36).' },
        { label: 'Audit', detail: 'Claim decisions are kept 7 years (NFR-09): auditing and retention must be designed, not assumed.' },
        { label: 'Photos', detail: 'Up to 5 photos per claim (BR-14) and about 85 claims a week (P-06): the storage choice has a capacity cost.' },
        { label: 'Claims history', detail: 'About 9,400 rows in the spreadsheet (CS-24): moving them or not depends on OQ-05 — answered or OPEN, never assumed.' },
        { label: 'Antwerp supervisors', detail: 'The warehouse supervisors (CS-28) use the solution too (BR-17): they count in the licences and need their own security role.' },
      ],
    },
    steps: [
      { title: 'Score the design', body: 'Use the review key. Record how many traps were addressed unprompted and whether each cites its identifier. Ask about any that are missing, and note that you had to.' },
      { title: 'Validate the connector definition yourself', body: 'Every JSON file under powerplatform/ must parse, and the connector definition must declare OpenAPI (swagger) 2.0. The command runs in PowerShell 7, which you already have on every system.', prompt: {
        title: 'Parse every JSON file under powerplatform/', kind: 'shell',
        text: 'Get-ChildItem powerplatform -Recurse -Filter *.json | ForEach-Object { $file = $_; try { $json = Get-Content -Raw $file.FullName | ConvertFrom-Json; $kind = if ($json.swagger) { "OpenAPI $($json.swagger)" } else { "JSON" }; "OK    $kind  $($file.FullName)" } catch { "FAIL  $($file.FullName)" } }',
        bash: 'pwsh -NoProfile -Command \'Get-ChildItem powerplatform -Recurse -Filter *.json | ForEach-Object { $file = $_; try { $json = Get-Content -Raw $file.FullName | ConvertFrom-Json; $kind = if ($json.swagger) { "OpenAPI $($json.swagger)" } else { "JSON" }; "OK    $kind  $($file.FullName)" } catch { "FAIL  $($file.FullName)" } }\'',
      } },
      { title: 'Read the licence decision', body: 'Open the cost estimate. Does it count every user group (Order Desk, Finance, Antwerp), name the licence each needs, cite its price sources and compare the total with C-08? A price without a source is an ASSUMPTION.' },
      { title: 'Check the cross-track dependencies', body: 'The Order Desk API is not this team\'s to build. Is it recorded as an OPEN dependency with an owner[[dotnet: (for example the .NET team)]][[azure: and the network reach from Power Platform as a question for the Azure team]], rather than assumed to exist?' },
    ],
    evidence: ['docs/power-platform and powerplatform/', 'Your trap score and the JSON validation output', 'Whether the pack\'s specialists were installed, and which roles ran'],
    checks: [
      'I scored the design against the review key.',
      'The licence and cost estimate covers every user group and is compared with C-08.',
      'Every JSON file under powerplatform/ parses and the connector declares OpenAPI 2.0, or I recorded why not.',
      'The Order Desk API is recorded as an OPEN cross-track dependency, not assumed.',
      'Nothing was created or imported in a real Power Platform environment.',
    ],
    recovery: 'If the pack\'s specialists cannot be installed, continue without them and compare the result with a colleague who has them: that difference is useful evidence. If the run is still going after 40 minutes, let it finish the data model, the approval flow and the licence estimate first.',
  },
  {
    id: 'together', number: '08', title: 'Bring it together', eyebrow: 'Every team, one picture', minutes: 20,
    goal: 'From a fresh conversation, get a consistent picture across the product team and your track teams, and the next actions — without telling the squad where its files are.',
    concept: 'A federation is only useful if you can come back to it later. Open a new conversation, ask a status question across teams, and check whether the answer is grounded in the files. The tracks stay independent; this is where their open dependencies become visible.',
    inputs: ['The same northwind-workshop folder', 'Your evidence log'],
    flow: [{
      heading: 'Ask for the status across teams',
      hint: 'Open a new conversation and select Squad Federation Coordinator, or use /squad-federation. This is a read-only question: no squad target and no mode. The guide lists the teams of the tracks you chose.',
      prompt: {
        title: 'Where are we, across all teams?', kind: 'question', entry: 'squad-federation', requiresSetup: ['promote', 'migration-team', 'modernization-team', 'power-platform-team'],
        text: 'Let\'s take stock across all teams. For each team — {teamList} — tell me what it produced, what was reviewed and what is still open. Then check consistency: is every story of each track release in docs/product/releases covered by that track\'s work or listed as remaining, and is every dependency between tracks recorded as an OPEN item rather than assumed?[[azure+dotnet: Is every application change listed by "{migrationSquad}" either done by "{modernizationSquad}" or listed as remaining?]] Cite the files you used. Do not change anything; end with the three most useful next actions.',
      },
    }],
    behaviors: [
      'The coordinator finds the existing federation and each team\'s history without being given paths.',
      'The answer cites real files and distinguishes done, reviewed and open.',
      'Inconsistencies and open dependencies between tracks are reported, not smoothed over.',
    ],
    steps: [
      { title: 'Verify one claim per team', body: 'Pick one statement about each team and open the file it cites. Is it true?' },
      { title: 'Optional: a governance report', body: 'VS Code: run /squad-governance-report. App and CLI: ask the federation coordinator to "generate the squad governance report for the whole federation under docs/". It summarizes gates, council verdicts, dispatches and estimated cost — useful evidence for the discussion.' },
      { title: 'Ask your own next question', body: 'Ask something real in your own words, for example how the portal or the claims app would call Order Desk. Observe which team the coordinator routes it to and why.' },
    ],
    evidence: ['The cross-team status answer', 'One verified claim per team', 'Optionally, the governance report'],
    checks: ['The coordinator resumed without being given internal paths.', 'I verified one claim per team against the files.', 'I recorded the next actions.'],
    recovery: 'If previous work seems missing, check that the client opened the same folder. Never initialize a new federation over the existing one.',
  },
  {
    id: 'reflect', number: '09', title: 'Reflect & next steps', eyebrow: 'Protected discussion', minutes: 25,
    goal: 'Separate what the squads did on their own from what needed you, and decide where you would use this in real delivery.',
    concept: 'Judge by evidence, not by confident summaries. An unfinished Web project with honest status is a better result than a "done" that fails its tests; a licence estimate that says ASSUMPTION is better than one that hides it.',
    inputs: ['Your evidence log', 'Your counts: requirement coverage, invented statements, and the score of each track you ran'],
    steps: [
      { title: 'Compare numbers (10 min)', body: 'Share your coverage, invention count and the score of each track you ran (blockers found, tests passing, traps found) with the group. Where results differ, compare the tracks and scope chosen, the session model, the model routing, the client and what the intake validator asked.' },
      { title: 'Name where a human was essential (5 min)', body: 'Which answer, correction or approval changed the outcome? Approving the releases is one of them. That is where accountability stays with you.' },
      { title: 'Decide what your practice would standardize (10 min)', body: 'Engineering standards, identifiers in source documents, intake before drafting, track tags and releases, review keys? Pick one thing to adopt and one real project to try it on.' },
    ],
    evidence: ['Your completed evidence log', 'One adoption decision and one candidate project'],
    checks: ['I can show one human decision that improved the result.', 'I chose one practice to adopt and one project to try it on.'],
    recovery: 'Blockers are valid discussion material. Bring them with what triggered them, the model and the client.',
  },
]

export const lifecycleSteps = lessons.flatMap(lesson =>
  (lesson.setup ?? []).map(step => ({ ...step, lessonId: lesson.id })),
)

export const troubleshooting: [string, string][] = [
  ['The starter button only downloads a zip', 'Your browser cannot write to folders (Firefox and Safari). Extract the zip wherever you want the workshop folder; it contains a single northwind-workshop folder.'],
  ['The folder already exists', 'The guide never overwrites. Choose another location, or rename the existing folder first.'],
  ['Which tracks should I choose?', 'The tracks your practice delivers. Azure and .NET work on the legacy code; Power Platform is about licences, data and approvals. They are independent, so one track is enough for a first run. In a group, split the tracks across tables.'],
  ['I want to add a track later', 'In Part 02, choose Selected tracks and tick it. With the "Whole case" scope, its backlog items are already tagged: ask the product team (federation coordinator, squad="product" or your registered name) for that track\'s releases and their Git tags. With "Chosen areas only", ask the product team to extend the documents and backlog to that business area first. Then follow the track\'s part.'],
  ['The squad did not create the release tags', 'Commit the approved documents (git add docs/product, then git commit -m "Product releases") and create one tag per approved release, for example git tag product/azure-r1, then product/azure-r2 for the next one. Record that you had to.'],
  ['How do I build a track\'s next release?', 'Each track part builds the first release (r1). For the next one, send the same work request to the same team again, replacing r1 with r2 in the release tag and file name. The team keeps its history, so it builds on what it did for r1.'],
  ['How do the release tags map to GitHub or Jira?', 'ES-39 in engineering-standards.md: in Azure DevOps the track and release tags are work-item tags; in GitHub they are issue labels, and each release is also a milestone; in Jira they are labels, and each release is also a fix version. The Git tag product/<track>-r<n> always marks the approved documents of that release.'],
  ['git commit asks who I am', 'Set an identity for this folder only: git config user.name "Your Name" and git config user.email you@example.com. Then commit again.'],
  ['Which agent do I select?', 'Parts 02–03: Squad Coordinator (VS Code: /squad). Parts 04–08: Squad Federation Coordinator (VS Code: /squad-federation). Part 00 readiness question: no squad agent. In VS Code, pick the prompt "Hands a request to…", not the skill with the same name.'],
  ['The coordinators are missing from the agent list', 'Check the client you actually use: the App and the CLI can have different plugin homes. Both hve-squad and hve-squad-hve-core must be installed. Do not also install the official hve-core plugin.'],
  ['"No squad state detected"', 'Normal before Part 02. The coordinator will propose a team when you send the first setup message.'],
  ['The Power Platform specialists are not installed', `The power-platform pack's two roles rest on agents from github/awesome-copilot that you install with the commands the coordinator shows (APM CLI ${apmCliVersion}; add --target copilot if APM says "No harness detected"). Until they are installed the coordinator does not seed them. You can go on without them; record it.`],
  ['The squad convened a council that is not in the team or not logged', 'Record it in your evidence log: what triggered it, which roles took part, and whether decisions.md has an entry. Then ask the coordinator where the council is recorded. If it is not, report it as a GitHub issue with that evidence.'],
  ['My token usage is very different from a colleague\'s', 'Compare the tracks and scope first, then the session model (Auto and small models behave very differently from Sonnet-class models), then the model routing: ranked and manual send each role to a different model. Then compare what the intake validator asked. Some variation is normal for non-deterministic systems.'],
  ['Which model routing should I choose?', 'Off if you want the simplest, most comparable run: every role uses your session model. Ranked if you want the squad to match each role to the best-fitting model your client offers. Manual if you want to choose yourself; the squad asks once before the first dispatch. All three work for this workshop.'],
  ['Manual routing keeps asking for models', 'It asks once per team, before that team\'s first dispatch, and saves your picks in team.md. Each new track team (Azure, .NET, Power Platform) asks for its own roster. If VS Code rejects a pick, you are asked again with the models it actually offers.'],
  ['The documents contain requirements that are not in the case', 'Point the squad to the statement and the identifier it cites and ask it to either show the source or relabel it ASSUMPTION (ES-03). Count it in your evidence log.'],
  ['The stories are hard to read', 'Ask the squad to rewrite the specific story following ES-05, so that a developer who has not read the case can build it. Keep the before and after as evidence.'],
  ['Azure DevOps works in chat but not for the specialists', 'A known limitation in some clients: MCP servers configured for the session are not always visible to dispatched specialists. Let the coordinator publish, or skip Part 03. Use the official remote server only; behaviour differs with custom servers.'],
  ['The squad wants to create many projects', 'Refer it to ES-13: one solution, existing Core, Web and Tests projects. Any extra project needs a decision record.'],
  ['dotnet test fails before Part 06', 'Expected. The legacy tests use MSTest v1 from a Visual Studio installation (CS-18). Making them run with the .NET CLI is the .NET team\'s job.'],
  ['The architecture diagrams do not render', `Check the two tools first: dot -V (Graphviz) and uv --version. On Windows, winget installs Graphviz without adding it to PATH, and a $env:PATH change in a terminal does not reach your Copilot client. Add it once for your user: [Environment]::SetEnvironmentVariable('Path', [Environment]::GetEnvironmentVariable('Path', 'User') + ';C:\\Program Files\\Graphviz\\bin', 'User'), then restart the terminal and the Copilot client. If python prints "Python was not found", that is the Microsoft Store stub: use uv, which brings its own Python. If uv cannot download the library behind a corporate proxy, set UV_NATIVE_TLS=1 or ask the facilitator for a package mirror. Ask for ${diagramsRequirement}: older releases lack the latest Azure icons.`],
  ['Bicep fails to build', 'Run az bicep install (or az bicep upgrade). If it still fails, give the squad the exact error and record that the review missed it.'],
  ['APM says "No harness detected" or installs fail', `Use APM CLI ${apmCliVersion} exactly and add --target copilot. Authenticate GitHub first (gh auth login) to avoid slow anonymous rate limits.`],
  ['I am on macOS', 'Use bash tools/ready.sh and the bash variant shown under each terminal command. Everything else is identical.'],
  ['Time is running out', 'Finish what each track needs first (releases and tags, the change list, Core and Tests, the data model and licence estimate), record the rest as open, and protect the discussion time.'],
]

export const sources = [
  { name: `HVE Squad v${squadVersion} documentation`, url: docsUrl },
  { name: `HVE Squad v${squadVersion} release notes`, url: squadReleaseUrl },
  { name: 'Getting started: install per client', url: `${docsUrl}getting-started.html` },
  { name: 'Usage: profiles, packs, federation, promotion and autopilot', url: `${docsUrl}usage.html` },
  { name: 'Usage: model selection per role (routing=)', url: `${docsUrl}usage.html#model-selection-per-role-routing` },
  { name: 'Demo: Product squad', url: `${docsUrl}demo-3.html` },
  { name: 'Demo: Migration autopilot', url: `${docsUrl}demo-2.html` },
  { name: 'Demo: Modernize .NET', url: `${docsUrl}demo-4.html` },
  { name: 'HVE Squad plugin: CLI installation', url: 'https://peter-n91.github.io/hve-squad-plugin/install-cli.html' },
  { name: 'HVE Squad plugin: App installation', url: 'https://peter-n91.github.io/hve-squad-plugin/install-desktop.html' },
  { name: `APM CLI ${apmCliVersion}`, url: apmCliReleaseUrl },
  { name: 'Remote Azure DevOps MCP server', url: 'https://learn.microsoft.com/azure/devops/mcp-server/remote-mcp-server' },
  { name: 'GitHub Copilot CLI: installation', url: 'https://docs.github.com/copilot/how-tos/copilot-cli/set-up-copilot-cli/install-copilot-cli' },
  { name: 'Upgrade from ASP.NET MVC to ASP.NET Core', url: 'https://learn.microsoft.com/aspnet/core/migration/mvc' },
  { name: 'Azure Verified Modules', url: 'https://aka.ms/avm' },
  { name: 'Python diagrams library: Azure nodes', url: 'https://diagrams.mingrammer.com/docs/nodes/azure' },
  { name: `diagrams v${diagramsVersion} release notes (Azure icons V18)`, url: `https://github.com/mingrammer/diagrams/releases/tag/v${diagramsVersion}` },
  { name: 'Azure architecture icons', url: 'https://learn.microsoft.com/azure/architecture/icons/' },
  { name: 'HVE Squad troubleshooting: Azure-icon diagrams', url: `https://peter-n91.github.io/hve-squad/troubleshooting.html` },
  { name: 'Power Platform application lifecycle management', url: 'https://learn.microsoft.com/power-platform/alm/' },
  { name: 'Power Platform data loss prevention policies', url: 'https://learn.microsoft.com/power-platform/admin/wp-data-loss-prevention' },
  { name: 'Power Platform custom connectors', url: 'https://learn.microsoft.com/connectors/custom-connectors/' },
  { name: 'Power Platform licensing', url: 'https://learn.microsoft.com/power-platform/admin/pricing-billing-skus' },
  { name: 'Microsoft HVE Core', url: 'https://github.com/microsoft/hve-core' },
]
