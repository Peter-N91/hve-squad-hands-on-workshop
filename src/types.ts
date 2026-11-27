import { hveSquadRelease } from './hve-squad-release.ts'

export const locales = ['en', 'fr'] as const
export type Locale = typeof locales[number]
export const localeLabels: Record<Locale, string> = { en: 'English', fr: 'Français' }

export type TrackId = 'azure' | 'dotnet' | 'powerPlatform'
export type SetupId = 'product-team' | 'promote' | 'migration-team' | 'modernization-team' | 'power-platform-team'
export type SquadKey = 'productSquad' | 'migrationSquad' | 'modernizationSquad' | 'powerPlatformSquad'
export type Scope = 'full' | 'focused'
export type TrackMode = 'all' | 'one' | 'selected'
export type Routing = 'off' | 'ranked' | 'economy' | 'manual'
export type Depth = 'standard' | 'quick'
export type Client = 'cli' | 'app' | 'vscode'
export type PublicationField = 'organization' | 'project' | 'participant' | 'documentTarget' | 'process' | 'area' | 'iteration'

export type EntryAgent =
  | 'squad'
  | 'squad-federation'
  | 'squad-coach'
  | 'squad-doctor'
  | 'squad-document'
  | 'squad-governance-report'
  | 'squad-external-agent-builder'
  | 'squad-connector-builder'

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

export type Answer = { question: string; answer: string; tracks: TrackId[] }

/**
 * setup    — init or promote; never autopilot
 * work     — a business outcome; always mode="autopilot" with routing and depth
 * question — a read-only or interactive request to a squad/builder/doctor agent; no autopilot
 * plain    — asked to the default Copilot agent, not the squad
 * shell    — a terminal command
 */
export type PromptKind = 'setup' | 'work' | 'question' | 'plain' | 'shell'

export type Prompt = {
  promptId?: string
  title: string
  kind: PromptKind
  text: string
  bash?: string
  entry?: EntryAgent
  lifecycle?: 'init' | 'promote'
  /** Setup steps of tracks the participant did not choose are ignored. */
  requiresSetup?: SetupId[]
  requiresChecks?: string[]
  squadTarget?: SquadKey
  publication?: boolean
  /** Glossary term ids listed under the block as links to the docs. Setup and work requests get a default list. */
  terms?: string[]
}

/** What the coordinator is likely to ask while it sets a team up, and what to answer in this workshop. */
export type SetupQuestion = { ask: string; answer: string; terms?: string[] }

export type LifecycleStep = {
  id: SetupId
  title: string
  description: string
  request: Prompt
  questions?: SetupQuestion[]
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
  quickMinutes?: number
  timing: string
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

export type Term = { id: string; label: string; meaning: string; url: string }

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

export type AgendaItem = { lesson: string; title: string; minutes: number; note?: string; optional?: boolean }
export type OptionItem<T extends string> = { value: T; label: string; summary: string; detail: string }
export type InstallationKeys = 'cli' | 'cliUpdate' | 'cliSwitchRepo' | 'cliMigrate' | 'apm'
export type StudioNote = { eyebrow: string; title: string; body: string }

export type UiCopy = {
  pageTitle: string
  metaDescription: string
  brandSubtitle: string
  skipToContent: string
  sessionSetupBtn: string
  docsBtn: string
  languageLabel: string
  switchThemeTo: (target: 'light' | 'dark') => string
  themeDark: string
  themeLight: string
  mobilePartsBtn: string
  closeBtn: string
  sessionSetupHeading: string
  sessionSetupIntro: string
  teamNamesHeading: string
  teamNamesIntro: string
  adoHeading: string
  sidebarHeading: string
  overviewNav: string
  resourcesNav: string
  optionalBadge: string
  beforeSessionLabel: string
  selfPacedLabel: string
  minutesSuffix: string
  progressHeading: string
  coreCheckpointsAria: string
  progressSummary: (core: number, coreTotal: number, optional: number, optionalTotal: number) => string
  exportProgressBtn: string
  clientTablistAria: string
  recommendedBadge: string
  showNavBtn: string
  focusViewBtn: string
  printGuideBtn: string
  clientNotePrefix: string
  clientNoteBody: { beforePart: string; partLink: string; afterPart: string }
  resetOptionsBtn: string
  pageNotFoundTitle: string
  pageNotFoundBody: string
  backToOverview: string
  prevNextAria: string
  footerLeft: string
  footerRight: { builtFor: string; latestRelease: string; tracksLabel: string; checkpointsLabel: string }
  resetDialogTitle: string
  resetDialogBody: string
  keepDataBtn: string
  confirmResetBtn: string
  resetDoneStatus: string
  copiedStatus: string
  clipboardUnavailableStatus: string
  starterFolderDone: (count: number, location: string) => string
  starterZipDone: string
  starterExists: (location: string) => string
  starterCancelled: string
  starterFailed: (err: string) => string
  starterPanelDefaultHeading: string
  starterPanelBody: (canWrite: boolean) => string
  preferZipPrefix: string
  downloadZipLink: string
  writingFilesBtn: string
  chooseFolderBtn: string
  downloadStarterBtn: string
  routingLabel: string
  routingAria: (ctx: string) => string
  economyConsentHint: string
  depthLabel: string
  depthAria: (ctx: string) => string
  whatYouBuildAria: (ctx: string) => string
  whatYouBuildEyebrow: string
  whatYouBuildCompactHeading: string
  whatYouBuildHeading: string
  tracksLabel: string
  tracksToBuildAria: (ctx: string) => string
  deliveryTracksAria: (ctx: string) => string
  trackLockedAllTitle: string
  trackLockedLastTitle: string
  partPrefix: string
  productScopeLabel: string
  productScopeAria: (ctx: string) => string
  termColumn: string
  inOneSentenceColumn: string
  opensDocsSuffix: string
  readMoreLabel: string
  doesLabel: string
  doesNotLabel: string
  coordinatorQuestionsAria: string
  coordinatorQuestionsHeading: string
  coordinatorQuestionsIntro: string
  copyPowerShellBtn: string
  copyBtn: string
  copyBashBtn: string
  termsInMessageLabel: string
  windowsPowerShellLabel: string
  macLinuxBashLabel: string
  copyUnlocksWhen: string
  goToStep: (title: string) => string
  goToCheckpoint: string
  openSessionSetupBtn: string
  installStepEyebrow: (client: string) => string
  installHeading: (version: string) => string
  installReleaseNotePrefix: string
  installReleaseNotesLink: (version: string) => string
  cliInstallBody: (id: string, version: string) => string
  cliUpdateSummary: (version: string) => string
  cliUpdateBody: string
  cliSwitchRepoSummary: string
  cliSwitchRepoBody: (oldMarket: string, newMarket: string) => string
  cliMigrateSummary: string
  cliMigrateBody: string
  appInstallSteps: (marketplace: string, oldMarket: string, version: string) => string[]
  appInstallNote: { beforeLink: string; linkText: string; afterLink: string }
  vscodeInstallBody: (marketplace: string, oldMarket: string, version: string) => string
  vscodeInstallNote: string
  vscodeApmSummary: string
  vscodeApmBody: (apmVer: string) => string
  vscodeApmFooter: string
  adoMcpEyebrow: (client: string) => string
  adoMcpHeading: string
  adoMcpVscodeBody: string
  adoMcpCliBody: string
  adoMcpAppBody: string
  adoMcpFooter: { beforeLink: string; linkText: string }
  optionalBannerStrong: string
  optionalBannerBody: string
  theIdeaLabel: string
  timingBreakdownLabel: string
  prereqSectionHeading: string
  prereqBadge: string
  prereqColumns: { what: string; why: string; when: string; check: string; windows: string; mac: string }
  notNeededIntro: { before: string; strong: string; after: string }
  starterStep1Heading: string
  routingPanelEyebrow: string
  routingPanelHeading: string
  depthPanelEyebrow: string
  depthPanelHeading: string
  haveTheseReadyHeading: string
  setupSectionCaption: string
  whatShouldHappenHeading: string
  businessAnswersEyebrow: string
  businessAnswersHeading: string
  businessAnswersIntro: string
  observeEyebrow: string
  observeHeading: string
  reviewKeyEyebrow: string
  reviewAndVerifyCaption: string
  stepsCaption: string
  evidenceEyebrow: string
  evidenceHeading: string
  checkpointEyebrow: string
  checkpointHeading: string
  checkpointBrowserNote: string
  recoveryHeading: string
  overviewHeroEyebrow: string
  overviewHeroLatest: string
  overviewHeroTitleBefore: string
  overviewHeroTitleEm: string
  overviewHeroLead: string
  overviewStartPart00: string
  overviewMetaHours: (hours: string) => { strong: string; sub: string }
  overviewMetaTeams: (count: number, labels: string) => { strong: string; sub: string }
  overviewMetaReleases: { strong: string; sub: string }
  overviewMetaZeroDeploy: { strong: string; sub: string }
  journeyHeading: string
  journeyBadge: string
  journeyProductTitle: string
  journeyProductSub: string
  journeyAdoSpan: string
  journeyAdoTitle: string
  journeyAdoSub: string
  journeyTogetherTitle: string
  journeyTogetherSub: string
  journeyConnectorSpan: string
  journeyConnectorTitle: string
  journeyConnectorSub: string
  journeyFootNote: string
  agendaHeading: string
  agendaSub: (depth: Depth) => string
  agendaCoreLiveTotal: string
  agendaWithOptionalTotal: (optMinutes: number) => string
  formatHoursMinutes: (mins: number) => string
  outcomeEyebrow: string
  outcomeHeading: string
  outcomeLead: string
  outcomeFirstBullet: string
  outcomeTrackBullets: Record<TrackId, string>
  outcomeTeamsBullet: (count: number) => string
  fictitiousStrong: string
  fictitiousBody: string
  feedbackHeading: string
  feedbackBullets: string[]
  hiddenPartHeading: (num: string) => string
  hiddenPartBody: (label: string) => string
  addTrackBtn: (label: string) => string
  resourcesEyebrow: string
  resourcesHeading: string
  resourcesLead: string
  templatesHeading: string
  templatesBody: string
  evidenceLogBtn: string
  evidenceLogFile: string
  whenWrongHeading: string
  sourcesHeading: string
  noticesNote: { beforeLink: string; linkText: string }
  browserDataHeading: string
  browserDataBody: string
  resetDataBtn: string
  kindLabels: Record<PromptKind, string>
  squadLabels: Record<SquadKey, string>
  publicationLabels: Record<PublicationField, string>
  fieldHelp: Record<PublicationField | SquadKey, string>
  squadNameEmptyError: string
  squadNameFormatError: string
  blockerConfirmSetup: (title: string) => string
  blockerCheckpoint: (num: string, text: string) => string
  blockerSessionSetupNeeds: (fields: string) => string
  publicationDetailsHeader: string
  plainAgentName: string
  plainAgentInstruction: string
  vscodeAgentInstruction: (name: string) => string
  cliAgentInstruction: (name: string, id: string) => string
  appAgentInstruction: (name: string, id: string) => string
  storageReadError: (msg: string) => string
  storageWriteError: (msg: string) => string
}

export type WorkshopLocaleContent = {
  locale: Locale
  docsUrl: string
  conceptsUrl: string
  tracks: Track[]
  trackNote: string
  trackModeOptions: { value: TrackMode; label: string; summary: string }[]
  scopeOptions: OptionItem<Scope>[]
  routingOptions: OptionItem<Routing>[]
  routingNote: string
  depthOptions: OptionItem<Depth>[]
  depthNote: string
  glossary: Term[]
  modeRule: { title: string; body: string }
  modelGuidance: { title: string; body: string }
  studioNote: StudioNote
  observationNote: string
  readFirst: { eyebrow: string; title: string; body: string; action: string }
  clientAdvice: Record<Client, string>
  newConversation: { title: string; why: string; how: Record<Client, string> }
  lifecycleExplainers: Record<'init' | 'promote', { title: string; does: string[]; doesNot: string[] }>
  prerequisites: Prerequisite[]
  notNeeded: string[]
  pwshNote: string
  installation: Record<InstallationKeys, Prompt>
  readyScript: Prompt
  doctorCheck: Prompt
  readinessQuestion: Prompt
  coachQuestion: Prompt
  agenda: AgendaItem[]
  lessons: Lesson[]
  troubleshooting: [string, string][]
  sources: { name: string; url: string }[]
  ui: UiCopy
}

export const squadVersion: string = hveSquadRelease.version
export const squadReleaseUrl: string = hveSquadRelease.url
export const pluginMarketplace = 'microsoft/hve-squad#plugin'
export const legacyRepoMarketplace = 'Peter-N91/hve-squad#plugin'
export const pluginId = 'hve-squad@hve-squad'
export const apmCliVersion = 'v0.29.0'
export const apmCliReleaseUrl = `https://github.com/microsoft/apm/releases/tag/${apmCliVersion}`
/** diagrams 0.25.0 moved its Azure nodes to Microsoft's Azure icons V18; 0.25.1 fixed the packaged icons. */
export const diagramsVersion = '0.25.1'
export const diagramsRequirement = `diagrams>=${diagramsVersion}`
export const autopilotMode = 'mode="autopilot"'
export const guideUrl = 'https://peter-n91.github.io/hve-squad-hands-on-workshop/'
export const docsBaseUrl = 'https://microsoft.github.io/hve-squad/'
export const docsUrlFor = (locale: Locale = 'en') => locale === 'fr' ? `${docsBaseUrl}fr/` : docsBaseUrl
export const docsUrl = docsUrlFor('en')
export const docsPage = (page: string, anchor = '', locale: Locale = 'en') => `${docsUrlFor(locale)}${page}${anchor ? `#${anchor}` : ''}`
export const conceptsUrlFor = (locale: Locale = 'en') => docsPage('concepts.html', '', locale)
export const conceptsUrl = conceptsUrlFor('en')
export const messageAnchor = 'init-promote-and-work-requests'

export const startHereTerms = ['init', 'promote', 'work-request', 'team', 'federation', 'profile', 'pack', 'autopilot', 'routing', 'depth', 'state']

export const suggestedSquads: Record<SquadKey, string> = {
  productSquad: 'product',
  migrationSquad: 'azure-migration',
  modernizationSquad: 'dotnet-modernization',
  powerPlatformSquad: 'power-platform',
}

export const trackTag = (track: Pick<Track, 'slug'>) => `track-${track.slug}`
/** A track can have several releases, numbered in delivery order. The name is also the backlog item's release tag. */
export const releaseName = (track: Pick<Track, 'slug'>, n: number | string = 1) => `${track.slug}-r${n}`
export const releaseTag = (track: Pick<Track, 'slug'>, n: number | string = 1) => `product/${releaseName(track, n)}`
export const releaseFile = (track: Pick<Track, 'slug'>, n: number | string = 1) => `docs/product/releases/${releaseName(track, n)}.md`
