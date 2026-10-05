export type SetupId = 'product-team' | 'promote' | 'migration-team' | 'modernization-team'
export type SquadKey = 'productSquad' | 'migrationSquad' | 'modernizationSquad'

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
  goal: string
  concept: string
  inputs: string[]
  setup?: LifecycleStep[]
  flow?: FlowItem[]
  behaviors?: string[]
  answers?: { question: string; answer: string }[]
  reviewKey?: ReviewKey
  steps: LessonStep[]
  evidence: string[]
  checks: string[]
  recovery: string
}

export const squadVersion = '0.17.0'
export const apmCliVersion = 'v0.29.0'
export const apmCliReleaseUrl = `https://github.com/microsoft/apm/releases/tag/${apmCliVersion}`
export const autopilotMode = 'mode="autopilot"'
export const guideUrl = 'https://peter-n91.github.io/hve-squad-hands-on-workshop/'
export const docsUrl = 'https://peter-n91.github.io/hve-squad/'

export const suggestedSquads: Record<SquadKey, string> = {
  productSquad: 'product',
  migrationSquad: 'azure-migration',
  modernizationSquad: 'dotnet-modernization',
}

export const modeRule = {
  title: 'Three kinds of message — and only one uses autopilot',
  body: 'Setup messages (init and promote) never include mode="autopilot": you confirm each proposal yourself. Work requests always include it, so the squad runs research → plan → build → review on its own and stops only for approvals that matter. Questions and answers (readiness, intake, your business answers, status) have no mode at all. The guide adds the right form to every copied block; you never type it yourself.',
}

export const modelGuidance = {
  title: 'Pick a strong model before you start — and keep it',
  body: 'HVE Squad sends long, structured instructions to every specialist. Use Claude Sonnet 5 or a stronger model for the whole workshop. Do not use Auto or a small, fast model: they tend to summarize the instructions instead of following them, which shows up as skipped logging, empty decision records, unexpected dispatches and very different token usage between participants. Record the model you used in your evidence log so results can be compared fairly.',
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
}

export const prerequisites: Prerequisite[] = [
  { what: 'GitHub account with Copilot', why: 'Runs every agent in the workshop.', part: 'All parts', check: 'Sign in to your Copilot client', windows: 'Ask your GitHub admin for a Copilot Business or Enterprise seat', mac: 'Same as Windows', scope: 'everyone' },
  { what: 'One Copilot client', why: 'Where you talk to the squad. Pick one and stay with it.', part: 'All parts', check: 'App opens / copilot --version / VS Code Copilot Chat', windows: 'App: github.com/features/copilot · CLI: winget install GitHub.Copilot (needs PowerShell 7: winget install Microsoft.PowerShell) · VS Code: code.visualstudio.com', mac: 'App: github.com/features/copilot · CLI: brew install --cask copilot-cli · VS Code: code.visualstudio.com', scope: 'everyone' },
  { what: 'Git', why: 'Your workshop folder is a Git repository so every change is visible and reversible.', part: 'All parts', check: 'git --version', windows: 'winget install --id Git.Git -e', mac: 'xcode-select --install', scope: 'everyone' },
  { what: `HVE Squad ${squadVersion}`, why: 'The squad coordinators and their specialists.', part: 'All parts', check: 'Step 3 below', windows: 'Installed in step 3, per client', mac: 'Installed in step 3, per client', scope: 'everyone' },
  { what: `APM CLI ${apmCliVersion} (exactly)`, why: 'Installs the /squad prompts into the folder. VS Code only.', part: 'VS Code users only', check: 'apm --version → 0.29.0', windows: "$env:VERSION = 'v0.29.0'; irm https://aka.ms/apm-windows | iex", mac: 'curl -sSL https://aka.ms/apm-unix | sh -s -- @v0.29.0', scope: 'client' },
  { what: 'Azure CLI with Bicep', why: 'Lets you check the infrastructure code locally. No Azure sign-in, no subscription.', part: 'Part 04 (recommended)', check: 'az bicep version', windows: 'winget install --id Microsoft.AzureCLI -e, then az bicep install', mac: 'brew install azure-cli, then az bicep install', scope: 'later' },
  { what: '.NET 10 SDK', why: 'Builds and tests the modernized application.', part: 'Part 05', check: 'dotnet --list-sdks shows 10.x', windows: 'winget install --id Microsoft.DotNet.SDK.10 -e', mac: 'brew install --cask dotnet-sdk', scope: 'later' },
  { what: 'Azure DevOps project access', why: 'Only to publish the backlog. Skipping it changes nothing later.', part: 'Part 03 (optional)', check: 'You can open the project in a browser', windows: 'Facilitator provides organization, project and your prefix', mac: 'Same as Windows', scope: 'later' },
]

export const notNeeded = ['An Azure subscription', 'Visual Studio', 'Python, PDF readers or OCR', 'Node.js', 'Docker or Kubernetes', 'A Power Platform environment']

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
  text: 'Read knowledge-docs/business-case.md, knowledge-docs/current-state.md and knowledge-docs/engineering-standards.md in this repository. Answer in plain language:\n1. What does Northwind want, in two sentences?\n2. Which three Must requirements matter most to customers? Give their BR- identifiers.\n3. What is the hard deadline, and which identifier states it?\n4. Which .NET version does Order Desk use today, according to current-state.md and the projects in src/?\nDo not create or change any files.',
}

export const agenda = [
  { lesson: 'prepare', title: 'Get ready', minutes: 0, note: 'Before the session · about 30 min' },
  { lesson: 'orient', title: 'Meet Northwind & the method', minutes: 15 },
  { lesson: 'product', title: 'Shape the product', minutes: 60 },
  { lesson: 'ado', title: 'Publish to Azure DevOps', minutes: 20, optional: true },
  { lesson: 'migration', title: 'Plan the Azure migration', minutes: 60 },
  { lesson: '', title: 'Break', minutes: 10 },
  { lesson: 'modernize', title: 'Modernize to .NET 10', minutes: 60 },
  { lesson: 'together', title: 'Bring it together', minutes: 20 },
  { lesson: 'reflect', title: 'Reflect & next steps', minutes: 25 },
]

export const lessons: Lesson[] = [
  {
    id: 'prepare', number: '00', title: 'Get ready', eyebrow: 'Before the session', minutes: 0,
    goal: 'Arrive with a working folder, one Copilot client, HVE Squad installed and a strong model selected — so the session is spent learning, not installing.',
    concept: 'Everything you need is listed once, in the table below, with the part that needs it. You only need the "everyone" rows to start. The rest can wait until the part that uses them.',
    inputs: ['About 30 minutes', 'Permission to install software on your machine', 'Your GitHub account with Copilot'],
    steps: [
      { title: 'Get the starter solution', body: 'Use the button above. In Edge or Chrome you choose a folder on your computer and the guide writes a northwind-workshop folder into it. In other browsers you get a zip file: extract it wherever you like. Nothing is uploaded; the files come from this website.' },
      { title: 'Run the readiness check', body: 'Open a terminal inside the northwind-workshop folder and run the command for your system. It lists what is installed, flags what is missing for each part, and turns the folder into a Git repository with a first commit tagged "starter". It installs nothing and is safe to run again.', prompt: readyScript },
      { title: 'Install HVE Squad in your client', body: 'Follow the panel below for the client selected at the top of the page. Install once, in the client you will actually use. Then confirm that Squad Coordinator and Squad Federation Coordinator both appear in the agent list (App, CLI) or that /squad and /squad-federation appear as prompts (VS Code).' },
      { title: 'Choose your model', body: 'Select Claude Sonnet 5 or a stronger model in your client now, and keep it for the whole workshop. Not Auto. Write the model name in your evidence log.' },
      { title: 'Check that Copilot can read the case', body: 'Open the northwind-workshop folder in your client. With no squad agent selected, ask the question below. Compare the answer with the documents: the deadline is 30 June 2027 (C-01) and Order Desk runs on .NET Framework 4.8 (CS-01). If the answer is wrong or vague, tell the facilitator before the session.', prompt: readinessQuestion },
    ],
    evidence: ['A northwind-workshop folder that is a Git repository with the tag "starter"', 'The readiness check output', 'The model name and client you will use'],
    checks: [
      'My northwind-workshop folder exists and the readiness check shows Git OK.',
      `HVE Squad ${squadVersion} is installed in my client and both coordinators are visible.`,
      'I selected Claude Sonnet 5 or a stronger model, not Auto.',
      'Copilot read the case and correctly gave the deadline (C-01) and the current .NET version (CS-01).',
    ],
    recovery: 'Tell the facilitator what is blocked before the session. A missing tool for Parts 03–05 does not stop you from starting: those parts say exactly what they need.',
  },
  {
    id: 'orient', number: '01', title: 'Meet Northwind & the method', eyebrow: 'Start with the outcome', minutes: 15,
    goal: 'Understand the customer, the three teams you will build and the difference between setting up a team and asking it for work.',
    concept: 'One repository, three teams, one customer. You start with a single product team. After its work is reviewed, you promote it into a federation and add an Azure migration team, then a .NET modernization team. Each team keeps its own decisions and history, and every team reads the same knowledge-docs.',
    inputs: ['Your northwind-workshop folder open in your client', 'knowledge-docs/business-case.md'],
    steps: [
      { title: 'Read the case in five minutes', body: 'Northwind Traders, a food distributor in Lyon, wants a Customer Portal so customers can reorder, track orders and download invoices (BR-01 to BR-12). Its Order Desk application runs on .NET Framework 4.8 in a data centre whose lease ends on 30 June 2027 (C-01). Every fact has an identifier. That is deliberate: you will use those identifiers to catch invented or missing requirements.' },
      { title: 'Follow the chain', body: 'Product init → intake questions → your answers → product work → (optional) publish to Azure DevOps → promote → migration init → migration work → modernization init → modernization work → status across teams. Setup and work are always separate messages.' },
      { title: 'Know the three kinds of message', body: 'Setup (init, promote): no autopilot, you confirm. Work: autopilot, the squad runs the whole pipeline and stops for approvals. Questions: read-only, no mode. The guide labels every block and adds the right form for your client.' },
      { title: 'Keep an honest evidence log', body: 'Download the evidence log from Resources. Record what the squad did without being asked, what needed your answer, and what was missing. The checkboxes in this guide are only your own record; they do not inspect your project.' },
    ],
    evidence: ['The evidence log, started, with your client and model'],
    checks: ['I can name the three teams and what each produces.', 'I know which messages use autopilot and which do not.'],
    recovery: 'If your client opened a different folder, switch to northwind-workshop before continuing. The squads only see the folder that is open.',
  },
  {
    id: 'product', number: '02', title: 'Shape the product', eyebrow: 'From business case to backlog', minutes: 60,
    goal: 'Turn the business case into reviewed requirements, an experiment and a prioritized backlog — with every statement traceable to its source.',
    concept: 'You set up one planning team, let it find the gaps first, answer them as the customer would, and only then ask for the documents. Answering before drafting is what keeps invented requirements out.',
    inputs: ['knowledge-docs (business case, current state, engineering standards)', 'The business answers on this page — you play Northwind'],
    setup: [{
      id: 'product-team',
      title: '1. Set up the planning team',
      description: 'Select Squad Coordinator (App, CLI) or use /squad (VS Code). Send the message. The coordinator will offer a single squad or a federation: choose a single squad. Review the proposed team and confirm.',
      request: {
        title: 'Set up a team for the planning work', kind: 'setup', entry: 'squad', lifecycle: 'init',
        text: "init\n\nUse the documents in knowledge-docs at the root of this repository as context: business-case.md, current-state.md and engineering-standards.md. We need to understand Northwind's need for a Customer Portal, define business and product requirements, test the riskiest assumption and prioritize a backlog before any development starts. Set up a single team for this planning work. Stop once the team is ready; I will send the work request next.",
      },
      expected: [
        'The coordinator proposes the product profile from the purpose of the work, without you naming it.',
        'You confirm, and the team state appears under .copilot-tracking/squad/.',
        'No requirement document, backlog or experiment is produced yet.',
      ],
      checkpoint: 'The planning team is set up and no documents were produced yet.',
    }],
    flow: [
      {
        heading: '2. Ask for the gaps first',
        hint: 'Still with Squad Coordinator. This is a read-only question: the squad reviews the case and tells you what is unclear before writing anything.',
        prompt: {
          title: 'What is unclear or contradictory?', kind: 'question', entry: 'squad', requiresSetup: ['product-team'],
          text: 'Before we write any requirements, review knowledge-docs at the root of this repository and list:\n1. Open questions we must answer.\n2. Contradictions or conflicts between the documents.\n3. Anything important that is missing.\nCite the identifiers involved and say which stakeholder should answer each point. Do not draft any documents yet.',
        },
      },
      {
        heading: '3. Answer as Northwind',
        hint: 'Compare the squad\'s list with the business answers below, then send the answers. If the squad asked something not covered here, add your own answer or ask it to record the point as OPEN with an owner.',
        prompt: {
          title: "Northwind's answers", kind: 'question', entry: 'squad', requiresSetup: ['product-team'],
          text: "Here are Northwind's answers. Record each one as a decision with its source, then wait for my next request.\n- OQ-01: Customer users sign in with Microsoft Entra External ID. Northwind staff keep their Entra ID accounts (NFR-04).\n- OQ-02: The first release is in French and English. Dutch follows in the second release.\n- OQ-03: Only about 120 large customers have a customer administrator. For all other customers, Order Desk staff manage portal users.\n- BR-04 and CS-10: For the first release an order status may be up to 1 hour old. Shipment updates from StockPilot must therefore arrive at least every hour instead of nightly.\n- BR-07: Invoices older than 24 months do not need to be available in the portal.\nAnything else not answered here stays OPEN with the owner you proposed.",
        },
      },
      {
        heading: '4. Ask for the product documents',
        hint: 'Now the work request. It includes mode="autopilot": the squad plans, writes and reviews the documents itself, and shows you the result.',
        prompt: {
          title: 'Prepare the product documents', kind: 'work', entry: 'squad', requiresSetup: ['product-team'],
          text: "Using knowledge-docs at the root of this repository and the answers I gave, turn Northwind's business case into documents my team can review and build from:\n1. A business requirements document.\n2. A product requirements document for the first release of the Customer Portal.\n3. A Minimum Viable Experiment that tests the riskiest assumption before we commit to building.\n4. A prioritized backlog of epics, features and user stories with acceptance criteria, and a proposed first release.\nFollow engineering-standards.md for the writing style, the file locations and traceability: cite the source identifier for every requirement and story, label assumptions and open questions, and include the traceability table. I want documents to review, not an implementation.",
        },
      },
    ],
    answers: [
      { question: 'OQ-01 · How do customers sign in?', answer: 'Microsoft Entra External ID. Staff keep Entra ID.' },
      { question: 'OQ-02 · Dutch in the first release?', answer: 'No. French and English first; Dutch in release 2.' },
      { question: 'OQ-03 · Who has customer administrators?', answer: 'About 120 large customers. Order Desk staff manage users for the rest.' },
      { question: 'BR-04 vs CS-10 · How fresh must the status be?', answer: 'Up to 1 hour old. StockPilot updates must become at least hourly.' },
      { question: 'BR-07 · How far back do invoices go?', answer: '24 months.' },
    ],
    behaviors: [
      'The intake question surfaces the conflict between BR-04 ("always up to date") and CS-10 (nightly StockPilot batch) without being told where to look.',
      'The squad records your answers as decisions rather than only acknowledging them in chat.',
      'If the work needs a role the team does not have, the squad proposes adding it and asks for consent.',
      'If a council is convened, it is sized to the work and recorded in the decision log with the roles that took part.',
    ],
    reviewKey: {
      title: 'How to review the documents in 15 minutes',
      intro: 'You do not need to read everything. These five checks catch the problems that matter most: invented requirements, missing requirements and stories nobody can build from.',
      items: [
        { label: 'Coverage', detail: 'Open the traceability table. Every BR-01 to BR-12 and NFR-01 to NFR-08 must appear, either covered by a story or listed as not covered with a reason.' },
        { label: 'Invention', detail: 'Pick three stories. For each, open the identifier it cites. Does the source really say that? Anything else must be labelled ASSUMPTION.' },
        { label: 'Answers used', detail: 'Search for OQ-01 and BR-07. Entra External ID and the 24-month limit should appear exactly as you answered.' },
        { label: 'Readability', detail: 'Give one story to someone who has not read the case. Could they build it from the story and its Given/When/Then criteria alone (ES-05)?' },
        { label: 'First release', detail: 'Is the proposed first release inside the Must requirements, and does it explain anything it leaves out?' },
      ],
    },
    steps: [
      { title: 'Check coverage and invention', body: 'Use the review key above. Record how many requirements were covered, how many invented statements you found and whether they were labelled as assumptions.' },
      { title: 'Challenge the experiment', body: 'A Minimum Viable Experiment tests an assumption before you build; it is not an MVP. Which assumption did the squad pick (for example, that customers will actually reorder online — SM-01)? What is the cheapest test, the measure and the decision threshold? An experiment that has not been run has no results.' },
      { title: 'Correct, do not rewrite', body: 'If something is wrong, tell the squad what is wrong and why, citing the identifier, and let it fix the document. That correction is part of your evidence.' },
      { title: 'Agree the first release', body: 'Agree which stories form the first release and note anything deferred. The migration and modernization teams will build on this agreement.' },
    ],
    evidence: ['docs/product with BRD, PRD, experiment, backlog and traceability table', 'Your coverage and invention counts', 'At least one correction you asked for'],
    checks: [
      'The traceability table lists every BR- and NFR- identifier.',
      'I checked three stories against their sources and recorded what I found.',
      'My answers to the open questions appear in the documents.',
      'I agreed a first release and can explain what is out of it.',
    ],
    recovery: 'If the documents are not finished after 45 minutes, ask the squad to finish the backlog and traceability table first: the later teams depend on them. Never copy documents from another participant to catch up — note the gap instead.',
  },
  {
    id: 'ado', number: '03', title: 'Publish to Azure DevOps', eyebrow: 'Optional · team visibility', minutes: 20, optional: true,
    goal: 'Put the reviewed first-release backlog and documents in Azure DevOps, with your approval before anything is created.',
    concept: 'This part is optional. Nothing later depends on it: the migration and modernization teams read the backlog from docs/product. Do it if your facilitator prepared an Azure DevOps project; skip it otherwise.',
    inputs: ['Your reviewed backlog in docs/product', 'Organization, project and your participant prefix from the facilitator', 'The Azure DevOps MCP server configured in your client (below)'],
    flow: [{
      heading: 'Publish the agreed backlog',
      hint: 'Fill in Session setup first (top right): the guide adds your project details to the request. Stay with Squad Coordinator — the product team is still a single squad at this point.',
      prompt: {
        title: 'Make the backlog available to the team', kind: 'work', entry: 'squad', requiresSetup: ['product-team'], requiresChecks: ['product-3'], publication: true,
        text: 'We are happy with the reviewed plan. Publish the agreed first-release backlog to our Azure DevOps project as epics, features and user stories with their acceptance criteria, keeping the source identifiers in each description (ES-29). Store the business requirements, product requirements and experiment design at the agreed documentation location and link them to the relevant work items. Tag every work item nw-workshop and start every title with my participant prefix (ES-28). Show me the exact changes and wait for my approval before creating anything.',
      },
    }],
    behaviors: [
      'The squad checks the project, its process and your access before proposing changes.',
      'It shows the exact items, hierarchy and destination and waits for your approval.',
      'After approval it reports real work-item identifiers and records any partial failure honestly.',
    ],
    steps: [
      { title: 'Connect the official Azure DevOps MCP server', body: 'Use Microsoft\'s hosted (remote) server: no Node.js, no token, you sign in with your work account. Add it to your client as shown in the panel below, then ask Copilot "List my Azure DevOps projects" to confirm it works.' },
      { title: 'Review before you approve', body: 'Check the number of items, the hierarchy, the titles with your prefix and the documentation destination. Approve only what you reviewed. A changed batch needs a new approval.' },
      { title: 'Inspect the result in the browser', body: 'Open two created work items. Do they show the acceptance criteria and the source identifiers? Are the documents linked?' },
    ],
    evidence: ['Work-item identifiers and links', 'The approval you gave', 'Any limitation you hit'],
    checks: ['I reviewed the exact changes before approving them.', 'I opened created work items and checked their content and links.'],
    recovery: 'Known limitation: in some clients, MCP servers are visible to the coordinator but not to the specialists it dispatches. If the squad reports it cannot reach Azure DevOps, let it publish from the coordinator, or skip this part and record the limitation. Never work around it with a personal access token in a file or prompt.',
  },
  {
    id: 'migration', number: '04', title: 'Plan the Azure migration', eyebrow: 'Second team · federation', minutes: 60,
    goal: 'Keep the product team, add an Azure migration team, and get an evidence-based plan to move Order Desk to Azure — without deploying anything.',
    concept: 'Promotion turns your single squad into the first member of a federation, keeping all its work. Then you add a second team with its own roster. The migration team reads the code and scripts, not just the documents: the blockers are in the files.',
    inputs: ['The reviewed product documents in docs/product', 'knowledge-docs/current-state.md and the code in src/ and database/', 'Azure CLI with Bicep (recommended, for checking the infrastructure code)'],
    setup: [
      {
        id: 'promote',
        title: '1. Promote the product team',
        description: 'Switch to Squad Federation Coordinator (App, CLI) or use /squad-federation (VS Code). Send the message, read what will move and confirm.',
        request: {
          title: 'Keep the product team, make room for more', kind: 'setup', entry: 'squad-federation', lifecycle: 'promote', requiresSetup: ['product-team'], requiresChecks: ['product-3'],
          text: 'promote\n\nWe want to keep this planning team and everything it produced while making room for two more teams on the same repository. Prepare that transition and name the existing team "{productSquad}". Show me what will change before you move anything. Stop once the existing team is preserved; do not add another team or start new work.',
        },
        expected: [
          'The existing team becomes the first member of a federation named as you asked; its decisions and history are moved, not recreated.',
          'docs/ and knowledge-docs stay where they are.',
          'No new team is added yet.',
        ],
        checkpoint: 'Promotion is complete and the product team\'s work is preserved.',
      },
      {
        id: 'migration-team',
        title: '2. Add the migration team',
        description: 'Stay with the federation coordinator. Send the message, review the proposed team and confirm. If the squad registers a different name, update it in Session setup.',
        request: {
          title: 'Add a team for the Azure migration', kind: 'setup', entry: 'squad-federation', lifecycle: 'init', requiresSetup: ['promote'],
          text: 'init\n\nAdd a new team named "{migrationSquad}" to this federation. Its job: plan moving Order Desk and its database from Northwind\'s Lyon data centre to Azure — target architecture, infrastructure as code, cost and the migration plan. Use as context knowledge-docs (especially current-state.md, the constraints in business-case.md and the Azure standards in engineering-standards.md), the code in src/, the scripts in database/ and the reviewed product documents in docs/product. Keep the "{productSquad}" team\'s work and responsibilities separate. Set up this team only; I will send the work request next.',
        },
        expected: [
          'An Azure-oriented profile is proposed from the purpose of the work, without you naming it.',
          'The new team is registered next to the product team with separate responsibilities.',
          'No architecture or code is produced yet.',
        ],
        checkpoint: 'The migration team is set up inside the federation.',
      },
    ],
    flow: [{
      heading: '3. Ask for the migration plan',
      hint: 'The guide adds squad="…" so the request goes to the migration team, plus mode="autopilot". Expect this to take 20 to 35 minutes; review the product of each stage as it appears.',
      prompt: {
        title: 'Plan the move to Azure', kind: 'work', entry: 'squad-federation', requiresSetup: ['migration-team'], squadTarget: 'migrationSquad',
        text: 'Plan the move of Order Desk and its database to Azure before the data-centre lease ends (C-01), ready to host the Customer Portal first release described in docs/product. Use knowledge-docs, the code in src/ and the scripts in database/. I need:\n1. An assessment of everything that blocks running Order Desk on Azure platform services, with evidence (file and line) from the code and scripts.\n2. A target architecture: high-level and low-level design with decision records, including how Order Desk keeps exchanging data with StockPilot, which stays on premises (C-03), at least every hour.\n3. Bicep for a test and a production environment under infra/, following engineering-standards.md, validated locally with az bicep build but not deployed.\n4. A monthly cost estimate for both environments compared with the budget in C-04.\n5. A phased migration plan with data migration, cut-over and rollback steps that meets NFR-06.\n6. A numbered list of the application changes the .NET team must make so Order Desk runs on the chosen platform.\nFollow engineering-standards.md. Do not deploy, sign in to Azure or create any resource.',
      },
    }],
    behaviors: [
      'Research reads src/ and database/ and cites files, not only the documents.',
      'Because the request crosses architecture, cost and security, a council is convened before implementation and its verdict is recorded.',
      'Choices between options (for example Azure SQL Database versus SQL Managed Instance) are written as decision records with the rejected option and why.',
      'The review stage checks the Bicep against the standards and reports findings instead of declaring success.',
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
        { label: 'Status freshness', detail: 'Nightly batch versus the 1-hour answer you gave for BR-04.' },
        { label: 'No build pipeline', detail: 'Publishing from Visual Studio and copying files by hand (CS-19).' },
        { label: 'Data residency and recovery', detail: 'EU only (NFR-03, ES-20) and RPO 1 h / RTO 4 h (NFR-06), with no DR test ever (CS-23).' },
      ],
    },
    steps: [
      { title: 'Score the assessment', body: 'Use the review key. Record how many blockers were found unprompted and whether each cites a file. Ask the squad about any that are missing, and note that you had to.' },
      { title: 'Read the decisions, not just the diagrams', body: 'Open docs/architecture. For the database and the StockPilot exchange, is there a decision record that names the options, the choice and the reason? Does the design stay within C-04 and C-06 (no Kubernetes)?' },
      { title: 'Validate the infrastructure code yourself', body: 'Run the command below in your terminal. Every Bicep file should build without errors. Check one file for the naming (ES-23), tags (ES-24) and private endpoints (ES-25).', prompt: {
        title: 'Build every Bicep file locally', kind: 'shell',
        text: 'Get-ChildItem infra -Recurse -Filter *.bicep | ForEach-Object { az bicep build --file $_.FullName --stdout | Out-Null; "{0}  {1}" -f ($(if ($LASTEXITCODE -eq 0) { "OK  " } else { "FAIL" })), $_.FullName }',
        bash: 'find infra -name "*.bicep" | while read -r f; do az bicep build --file "$f" --stdout >/dev/null && echo "OK    $f" || echo "FAIL  $f"; done',
      } },
      { title: 'Check the hand-over', body: 'Open the numbered list of application changes. It is the contract with the next team: each change should name the file or component, the reason and the target approach.' },
    ],
    evidence: ['docs/architecture, docs/migration and infra/', 'Your blocker score and the Bicep validation output', 'The numbered application-change list'],
    checks: [
      'I scored the assessment against the review key.',
      'I found decision records for the database and the StockPilot exchange.',
      'Every Bicep file builds locally, or I recorded which one fails and why.',
      'The application-change list exists and names files and target approaches.',
      'Nothing was deployed and no Azure resource was created.',
    ],
    recovery: 'If the run is still going after 40 minutes, let it finish the assessment and the change list first: Part 05 needs them. Diagrams in Azure icons need Python and Graphviz; Mermaid diagrams are fine for this workshop.',
  },
  {
    id: 'modernize', number: '05', title: 'Modernize to .NET 10', eyebrow: 'Third team · in-place upgrade', minutes: 60,
    goal: 'Add a .NET modernization team and upgrade Order Desk in place from .NET Framework 4.8 to .NET 10 — with every pricing test still passing.',
    concept: 'The third team works from the migration team\'s change list. Success is measurable: the solution builds and its tests pass with the .NET CLI on any operating system, the pricing assertions are unchanged, and the solution still has three projects.',
    inputs: ['The application-change list and architecture from the migration team', 'The solution in src/ (28 tests today, Windows and Visual Studio only)', '.NET 10 SDK'],
    setup: [{
      id: 'modernization-team',
      title: '1. Add the modernization team',
      description: 'Stay with the federation coordinator. Send the message, review the proposed team and confirm. Update the name in Session setup if the squad registers a different one.',
      request: {
        title: 'Add a team for the .NET modernization', kind: 'setup', entry: 'squad-federation', lifecycle: 'init', requiresSetup: ['migration-team'], requiresChecks: ['migration-3'],
        text: 'init\n\nAdd a new team named "{modernizationSquad}" to this federation. Its job: modernize the Order Desk application in src/ from .NET Framework 4.8 to .NET 10 so it can run on the Azure platform chosen by the "{migrationSquad}" team. Use as context knowledge-docs (especially engineering-standards.md), the solution in src/, and the architecture and application-change list produced by the "{migrationSquad}" team. Keep the other teams\' work and responsibilities separate. Set up this team only; I will send the work request next.',
      },
      expected: [
        'A modernization-oriented profile is proposed without you naming it.',
        'The team is registered as the third member of the federation.',
        'No code is changed yet.',
      ],
      checkpoint: 'The modernization team is set up inside the federation.',
    }],
    flow: [{
      heading: '2. Ask for the upgrade',
      hint: 'The guide targets the modernization team and adds mode="autopilot". The squad may stop at a risk gate and ask you to approve with conditions — read the conditions before you answer.',
      prompt: {
        title: 'Modernize Order Desk in place', kind: 'work', entry: 'squad-federation', requiresSetup: ['modernization-team'], squadTarget: 'modernizationSquad',
        text: 'Modernize Order Desk in place from .NET Framework 4.8 to .NET 10, following engineering-standards.md:\n1. Keep one solution with the existing Core, Web and Tests projects (ES-13), converted to SDK-style projects targeting net10.0.\n2. Move the web application from ASP.NET MVC 5 to ASP.NET Core MVC with the same pages and behaviour.\n3. Apply the application changes listed by the "{migrationSquad}" team — configuration, logging, data access, session state, invoice storage, authentication and e-mail — using the approaches its design selected.\n4. Keep the pricing behaviour and every existing test assertion (CS-20, ES-18). Tests may move to a current test framework; their expected values must not change.\n5. Finish when dotnet build and dotnet test succeed for src/Northwind.OrderDesk.sln on any operating system. If time is short, finish Core and Tests first, then the Web project.\n6. Record what changed, why and how it was verified in docs/modernization.\nDo not deploy.',
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
      { title: 'Trace the hand-over', body: 'Open docs/modernization. For three items from the migration team\'s change list, find what was done, or why it is still open.' },
    ],
    evidence: ['dotnet build and dotnet test output', 'The git diff of the tests against "starter"', 'docs/modernization and the closed or open change items'],
    checks: [
      'dotnet build and dotnet test succeed, with at least 28 passing tests.',
      'No expected value in the pricing tests changed.',
      'The solution still has the Core, Web and Tests projects, and no unexplained extra project.',
      'I traced three migration change items to what the modernization team did.',
    ],
    recovery: 'If the Web project is not finished, that is acceptable: Core and Tests on .NET 10 with green tests is a valid first slice. Record what remains. Do not accept a summary that says "done" when dotnet test fails.',
  },
  {
    id: 'together', number: '06', title: 'Bring it together', eyebrow: 'Three teams, one picture', minutes: 20,
    goal: 'From a fresh conversation, get a consistent picture across the three teams and the next actions — without telling the squad where its files are.',
    concept: 'A federation is only useful if you can come back to it later. Open a new conversation, ask a status question across teams, and check whether the answer is grounded in the files.',
    inputs: ['The same northwind-workshop folder', 'Your evidence log'],
    flow: [{
      heading: 'Ask for the status across teams',
      hint: 'Open a new conversation and select Squad Federation Coordinator, or use /squad-federation. This is a read-only question: no squad target and no mode.',
      prompt: {
        title: 'Where are we, across all teams?', kind: 'question', entry: 'squad-federation', requiresSetup: ['modernization-team'],
        text: 'Let\'s take stock across all teams. For each team — "{productSquad}", "{migrationSquad}" and "{modernizationSquad}" — tell me what it produced, what was reviewed and what is still open. Then check consistency between the teams: is every Must requirement (BR-) covered by the backlog and supported by the target architecture, and is every application change requested by "{migrationSquad}" either done by "{modernizationSquad}" or listed as remaining? Cite the files you used. Do not change anything; end with the three most useful next actions.',
      },
    }],
    behaviors: [
      'The coordinator finds the existing federation and each team\'s history without being given paths.',
      'The answer cites real files and distinguishes done, reviewed and open.',
      'Inconsistencies between teams are reported, not smoothed over.',
    ],
    steps: [
      { title: 'Verify one claim per team', body: 'Pick one statement about each team and open the file it cites. Is it true?' },
      { title: 'Optional: a governance report', body: 'VS Code: run /squad-governance-report. App and CLI: ask the federation coordinator to "generate the squad governance report for the whole federation under docs/". It summarizes gates, council verdicts, dispatches and estimated cost — useful evidence for the discussion.' },
      { title: 'Ask your own next question', body: 'Ask something real in your own words, for example how the portal would call Order Desk. Observe which team the coordinator routes it to and why.' },
    ],
    evidence: ['The cross-team status answer', 'One verified claim per team', 'Optionally, the governance report'],
    checks: ['The coordinator resumed without being given internal paths.', 'I verified one claim per team against the files.', 'I recorded the next actions.'],
    recovery: 'If previous work seems missing, check that the client opened the same folder. Never initialize a new federation over the existing one.',
  },
  {
    id: 'reflect', number: '07', title: 'Reflect & next steps', eyebrow: 'Protected discussion', minutes: 25,
    goal: 'Separate what the squads did on their own from what needed you, and decide where you would use this in real delivery.',
    concept: 'Judge by evidence, not by confident summaries. An unfinished Web project with honest status is a better result than a "done" that fails its tests.',
    inputs: ['Your evidence log', 'Your counts: requirement coverage, invented statements, blockers found, tests passing'],
    steps: [
      { title: 'Compare numbers (10 min)', body: 'Share your coverage, invention count, blocker score and test result with the group. Where results differ, compare the model, the client and whether you answered the intake questions.' },
      { title: 'Name where a human was essential (5 min)', body: 'Which answer, correction or approval changed the outcome? That is where accountability stays with you.' },
      { title: 'Decide what your practice would standardize (10 min)', body: 'Engineering standards, identifiers in source documents, intake before drafting, review keys? Pick one thing to adopt and one real project to try it on.' },
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
  ['Which agent do I select?', 'Parts 02–03: Squad Coordinator (VS Code: /squad). Parts 04–06: Squad Federation Coordinator (VS Code: /squad-federation). Part 00 readiness question: no squad agent. In VS Code, pick the prompt "Hands a request to…", not the skill with the same name.'],
  ['The coordinators are missing from the agent list', 'Check the client you actually use: the App and the CLI can have different plugin homes. Both hve-squad and hve-squad-hve-core must be installed. Do not also install the official hve-core plugin.'],
  ['"No squad state detected"', 'Normal before Part 02. The coordinator will propose a team when you send the first setup message.'],
  ['The squad convened a council that is not in the team or not logged', 'Record it in your evidence log: what triggered it, which roles took part, and whether decisions.md has an entry. Then ask the coordinator where the council is recorded. If it is not, report it as a GitHub issue with that evidence.'],
  ['My token usage is very different from a colleague\'s', 'Compare models first: Auto and small models behave very differently from Sonnet-class models. Then compare whether the intake questions were answered. Some variation is normal for non-deterministic systems.'],
  ['The documents contain requirements that are not in the case', 'Point the squad to the statement and the identifier it cites and ask it to either show the source or relabel it ASSUMPTION (ES-03). Count it in your evidence log.'],
  ['The stories are hard to read', 'Ask the squad to rewrite the specific story following ES-05, so that a developer who has not read the case can build it. Keep the before and after as evidence.'],
  ['Azure DevOps works in chat but not for the specialists', 'A known limitation in some clients: MCP servers configured for the session are not always visible to dispatched specialists. Let the coordinator publish, or skip Part 03. Use the official remote server only; behaviour differs with custom servers.'],
  ['The squad wants to create many projects', 'Refer it to ES-13: one solution, existing Core, Web and Tests projects. Any extra project needs a decision record.'],
  ['dotnet test fails before Part 05', 'Expected. The legacy tests use MSTest v1 from a Visual Studio installation (CS-18). Making them run with the .NET CLI is the modernization team\'s job.'],
  ['Bicep fails to build', 'Run az bicep install (or az bicep upgrade). If it still fails, give the squad the exact error and record that the review missed it.'],
  ['APM says "No harness detected" or installs fail', `Use APM CLI ${apmCliVersion} exactly and add --target copilot. Authenticate GitHub first (gh auth login) to avoid slow anonymous rate limits.`],
  ['I am on macOS', 'Use bash tools/ready.sh and the bash variant shown under each terminal command. Everything else is identical.'],
  ['Time is running out', 'Finish the item the next team needs (backlog, change list, Core and Tests), record the rest as open, and protect the discussion time.'],
]

export const sources = [
  { name: `HVE Squad v${squadVersion} documentation`, url: docsUrl },
  { name: 'Getting started: install per client', url: `${docsUrl}getting-started.html` },
  { name: 'Usage: profiles, federation, promotion and autopilot', url: `${docsUrl}usage.html` },
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
  { name: 'Microsoft HVE Core', url: 'https://github.com/microsoft/hve-core' },
]
