import {
  autopilotMode, contentByLocale, depthOptions, englishUi, lessons, lifecycleSteps, locales, releaseFile, releaseName,
  releaseTag, routingOptions, scopeOptions, suggestedSquads, trackIds, trackModeOptions, trackTag,
} from './content.ts'
import type {
  AgendaItem, Answer, Client, Depth, EntryAgent, Lesson, Locale, Prompt, PublicationField, Routing, Scope, SetupId,
  SquadKey, Term, Track, TrackId, TrackMode, WorkshopLocaleContent,
} from './content.ts'

export const clients: readonly Client[] = ['cli', 'app', 'vscode'] as const
export type { Client, PublicationField }
export const clientLabels: Record<Client, string> = { app: 'Copilot App', cli: 'Copilot CLI', vscode: 'VS Code' }

export const publicationFields: readonly PublicationField[] = ['organization', 'project', 'participant', 'documentTarget', 'process', 'area', 'iteration'] as const
export const requiredPublicationFields: PublicationField[] = ['organization', 'project', 'participant', 'documentTarget']
export const squadKeys: SquadKey[] = ['productSquad', 'migrationSquad', 'modernizationSquad', 'powerPlatformSquad']

export type Settings = {
  language: Locale
  experience: Client
  routing: Routing
  depth: Depth
  trackMode: TrackMode
  tracks: TrackId[]
  scope: Scope
} & Record<PublicationField, string> & Record<SquadKey, string>

export const routings = routingOptions.map(option => option.value)
export const depths = depthOptions.map(option => option.value)
export const scopes = scopeOptions.map(option => option.value)
export const trackModes = trackModeOptions.map(option => option.value)
export type SavedState = { schema: 1; checked: string[]; settings: Settings }

export const defaults: Settings = {
  language: 'en',
  experience: 'cli',
  routing: 'off',
  depth: 'standard',
  trackMode: 'all',
  tracks: [...trackIds],
  scope: 'full',
  organization: '', project: '', participant: '', documentTarget: '', process: '', area: '', iteration: '',
  ...suggestedSquads,
}
export const storageKey = 'hve-squad-hands-on-workshop-v1'
export const themeKey = 'hve-squad-hands-on-theme'
export const langKey = 'hve-squad-hands-on-lang'

export const setupCheckId = (id: SetupId) => `setup:${id}`
export const lessonCheckId = (lessonId: string, index: number) => `${lessonId}-${index}`

const isTrackId = (value: unknown): value is TrackId => trackIds.includes(value as TrackId)
const isLocale = (value: unknown): value is Locale => locales.includes(value as Locale)

export const chosenTracks = (settings: Pick<Settings, 'tracks'> & { language?: Locale }): Track[] =>
  contentByLocale(settings.language).tracks.filter(track => settings.tracks.includes(track.id))
export const lessonVisible = (lesson: Pick<Lesson, 'track'>, settings: Pick<Settings, 'tracks'>) => !lesson.track || settings.tracks.includes(lesson.track)
export const visibleLessons = (settings: Pick<Settings, 'tracks'> & { language?: Locale }) =>
  contentByLocale(settings.language).lessons.filter(lesson => lessonVisible(lesson, settings))
export const visibleAgenda = (settings: Pick<Settings, 'tracks'> & { language?: Locale }) => {
  const bundle = contentByLocale(settings.language)
  return bundle.agenda.filter(item => {
    const lesson = bundle.lessons.find(candidate => candidate.id === item.lesson)
    return !lesson || lessonVisible(lesson, settings)
  })
}
export const visiblePrerequisites = (settings: Pick<Settings, 'tracks'> & { language?: Locale }) =>
  contentByLocale(settings.language).prerequisites.filter(item => !item.track || settings.tracks.includes(item.track))
/** With the whole case in scope the intake may ask about any area, so every answer stays visible. */
export const visibleAnswers = (answers: Answer[] | undefined, settings: Pick<Settings, 'tracks' | 'scope'>) =>
  (answers ?? []).filter(answer => settings.scope === 'full' || answer.tracks.some(track => settings.tracks.includes(track)))

/** Realistic duration in minutes for a lesson given the chosen depth, scope and tracks. */
export function lessonMinutes(
  lesson: Pick<Lesson, 'id' | 'minutes' | 'quickMinutes'>,
  settings: Partial<Pick<Settings, 'depth' | 'scope' | 'tracks'>> = defaults,
): number {
  if (!lesson.minutes) return 0
  const depth = settings.depth ?? defaults.depth
  const scope = settings.scope ?? defaults.scope
  const chosenCount = (settings.tracks ?? defaults.tracks).length
  let mins = depth === 'quick' && lesson.quickMinutes !== undefined ? lesson.quickMinutes : lesson.minutes
  if (lesson.id === 'product' && scope === 'focused' && chosenCount < trackIds.length) {
    mins = Math.max(25, mins - 10)
  }
  return mins
}

export function agendaMinutes(
  item: AgendaItem,
  settings: Partial<Pick<Settings, 'depth' | 'scope' | 'tracks' | 'language'>> = defaults,
): number {
  const match = contentByLocale(settings.language).lessons.find(candidate => candidate.id === item.lesson)
  return match ? lessonMinutes(match, settings) : item.minutes
}

export function sessionTotals(settings: Pick<Settings, 'tracks'> & Partial<Pick<Settings, 'depth' | 'scope' | 'language'>> = defaults) {
  const items = visibleAgenda(settings)
  let coreMinutes = 0
  let optionalMinutes = 0
  for (const item of items) {
    const mins = agendaMinutes(item, settings)
    if (item.optional) optionalMinutes += mins
    else coreMinutes += mins
  }
  return { coreMinutes, optionalMinutes, totalMinutes: coreMinutes + optionalMinutes }
}

/** Chosen tracks in registry order. The last track cannot be removed: the product needs at least one release. */
export function toggleTrack(current: TrackId[], id: TrackId): TrackId[] {
  const next = current.includes(id) ? current.filter(value => value !== id) : [...current, id]
  return next.length ? trackIds.filter(value => next.includes(value)) : current
}

type TrackChoice = Pick<Settings, 'trackMode' | 'tracks'>
/** Keeps the tracks consistent with the mode: all tracks, exactly one, or any non-empty selection. */
export function normalizeTracks(mode: TrackMode, tracks: TrackId[]): TrackChoice {
  const ordered = trackIds.filter(id => tracks.includes(id))
  if (mode === 'all') return { trackMode: mode, tracks: [...trackIds] }
  if (mode === 'one') return { trackMode: mode, tracks: [ordered[0] ?? trackIds[0]] }
  return { trackMode: mode, tracks: ordered.length ? ordered : [trackIds[0]] }
}
export const setTrackMode = (settings: TrackChoice, mode: TrackMode) => normalizeTracks(mode, settings.tracks)
/** The track control: in "one" mode it selects that track; in "selected" mode it toggles it; in "all" mode nothing changes. */
export function pickTrack(settings: TrackChoice, id: TrackId): TrackChoice {
  if (settings.trackMode === 'one') return normalizeTracks('one', [id])
  if (settings.trackMode === 'selected') return normalizeTracks('selected', toggleTrack(settings.tracks, id))
  return normalizeTracks('all', settings.tracks)
}
/** Adds a hidden track from its placeholder page, switching to "selected" when needed. */
export function addTrack(settings: TrackChoice, id: TrackId): TrackChoice {
  const tracks = [...settings.tracks, id]
  return normalizeTracks(trackIds.every(track => tracks.includes(track)) ? 'all' : 'selected', tracks)
}

function lessonIds(lesson: Lesson) {
  return [...lesson.checks.map((_, index) => lessonCheckId(lesson.id, index)), ...(lesson.setup ?? []).map(step => setupCheckId(step.id))]
}
export function checkIds(settings: Pick<Settings, 'tracks'> = defaults) {
  const visible = visibleLessons(settings)
  return {
    core: visible.filter(lesson => !lesson.optional).flatMap(lessonIds),
    optional: visible.filter(lesson => lesson.optional).flatMap(lessonIds),
  }
}
export const allCheckIds = lessons.flatMap(lessonIds)
export const coreCheckIds = checkIds().core
export const optionalCheckIds = checkIds().optional

export function progress(checked: string[], settings: Pick<Settings, 'tracks'> = defaults) {
  const ids = checkIds(settings)
  const core = ids.core.filter(id => checked.includes(id)).length
  const optional = ids.optional.filter(id => checked.includes(id)).length
  return { core, coreTotal: ids.core.length, optional, optionalTotal: ids.optional.length, percent: Math.round(core / ids.core.length * 100) }
}

function localizedLifecycleSteps(locale: Locale = 'en') {
  return contentByLocale(locale).lessons.flatMap(lesson =>
    (lesson.setup ?? []).map(step => ({ ...step, lessonId: lesson.id })),
  )
}

/** Setup steps still to confirm before a prompt, in order. Steps of tracks not chosen are ignored. */
export function missingSetup(prompt: Pick<Prompt, 'requiresSetup'>, checked: string[], settings: Pick<Settings, 'tracks'> & { language?: Locale } = defaults) {
  const bundle = contentByLocale(settings.language)
  const steps = localizedLifecycleSteps(settings.language)
  const ordered: typeof steps = []
  const visited = new Set<SetupId>()
  function visit(id: SetupId, trail: SetupId[]) {
    if (trail.includes(id)) throw new Error(`Circular setup prerequisite: ${id}.`)
    if (visited.has(id)) return
    const step = steps.find(candidate => candidate.id === id)
    if (!step) throw new Error(`Unknown setup prerequisite: ${id}.`)
    for (const parent of step.request.requiresSetup ?? []) visit(parent, [...trail, id])
    visited.add(id)
    ordered.push(step)
  }
  const relevant = (prompt.requiresSetup ?? []).filter(id => {
    const step = steps.find(candidate => candidate.id === id)
    const lesson = bundle.lessons.find(candidate => candidate.id === step?.lessonId)
    return !lesson || lessonVisible(lesson, settings)
  })
  for (const id of relevant) visit(id, [])
  return ordered.filter(step => !checked.includes(setupCheckId(step.id)))
}

/** Unchecking a setup step also unchecks setup steps that depend on it. */
export function toggleCheck(id: string, current: string[]) {
  let checked = current.includes(id) ? current.filter(value => value !== id) : [...current, id]
  if (id.startsWith('setup:') && !checked.includes(id)) {
    checked = checked.filter(candidate => {
      const step = lifecycleSteps.find(item => setupCheckId(item.id) === candidate)
      return !step || missingSetup({ requiresSetup: [step.id] }, checked).length === 0
    })
  }
  return checked
}

export function decodeState(raw: string | null): SavedState {
  if (!raw) return { schema: 1, checked: [], settings: { ...defaults, tracks: [...defaults.tracks] } }
  let parsed: unknown
  try { parsed = JSON.parse(raw) } catch { throw new Error('Saved progress is not valid JSON.') }
  if (!parsed || typeof parsed !== 'object' || (parsed as { schema?: unknown }).schema !== 1) {
    throw new Error('Saved progress has an unsupported format.')
  }
  const data = parsed as Record<string, unknown>
  if (!Array.isArray(data.checked) || !data.checked.every(x => typeof x === 'string') || !data.settings || typeof data.settings !== 'object') {
    throw new Error('Saved progress is damaged.')
  }
  const input = data.settings as Record<string, unknown>
  if (!clients.includes(input.experience as Client)) throw new Error('Saved progress names an unknown Copilot client.')
  const settings: Settings = { ...defaults, tracks: [...defaults.tracks], experience: input.experience as Client }
  if (input.language !== undefined) {
    if (!isLocale(input.language)) throw new Error('Saved progress names an unknown language.')
    settings.language = input.language
  }
  if (input.routing !== undefined) {
    if (!routings.includes(input.routing as Routing)) throw new Error('Saved progress names an unknown model routing.')
    settings.routing = input.routing as Routing
  }
  if (input.depth !== undefined) {
    if (!depths.includes(input.depth as Depth)) throw new Error('Saved progress names an unknown work depth.')
    settings.depth = input.depth as Depth
  }
  if (input.tracks !== undefined) {
    if (!Array.isArray(input.tracks) || !input.tracks.length || !input.tracks.every(isTrackId)) throw new Error('Saved progress names no delivery track or an unknown one.')
    settings.tracks = trackIds.filter(id => (input.tracks as TrackId[]).includes(id))
  }
  if (input.trackMode !== undefined && !trackModes.includes(input.trackMode as TrackMode)) throw new Error('Saved progress names an unknown track choice.')
  const mode = (input.trackMode as TrackMode | undefined) ?? (settings.tracks.length === trackIds.length ? 'all' : 'selected')
  Object.assign(settings, normalizeTracks(mode, settings.tracks))
  if (input.scope !== undefined) {
    if (!scopes.includes(input.scope as Scope)) throw new Error('Saved progress names an unknown product scope.')
    settings.scope = input.scope as Scope
  }
  for (const key of [...publicationFields, ...squadKeys]) {
    if (input[key] === undefined) continue
    if (typeof input[key] !== 'string') throw new Error(`Saved setting ${key} is damaged.`)
    settings[key] = input[key].slice(0, 300)
  }
  const known = new Set(allCheckIds)
  return { schema: 1, checked: [...new Set(data.checked as string[])].filter(id => known.has(id)), settings }
}

export function squadNameError(value: string, locale: Locale = 'en') {
  const ui = contentByLocale(locale).ui
  const name = value.trim()
  if (!name) return ui.squadNameEmptyError
  if (!/^[a-z0-9][a-z0-9-]*$/.test(name)) return ui.squadNameFormatError
  return ''
}

export function missingPublication(settings: Settings) {
  return requiredPublicationFields.filter(key => !settings[key].trim())
}

export function termById(id: string, locale: Locale = 'en'): Term {
  const term = contentByLocale(locale).glossary.find(candidate => candidate.id === id)
  if (!term) throw new Error(`Unknown glossary term: ${id}.`)
  return term
}

/** A term written in lesson text as [label](term:id): it becomes a link to the docs section that explains it. */
const termLink = /\[([^\]\n]+)\]\(term:([a-z-]+)\)/g
export type TextPart = string | { term: Term; label: string }
export function termParts(text: string, locale: Locale = 'en'): TextPart[] {
  const parts: TextPart[] = []
  let last = 0
  for (const match of text.matchAll(termLink)) {
    if (match.index > last) parts.push(text.slice(last, match.index))
    parts.push({ term: termById(match[2], locale), label: match[1] })
    last = match.index + match[0].length
  }
  if (last < text.length) parts.push(text.slice(last))
  return parts
}
export const stripTerms = (text: string) => text.replace(termLink, '$1')

/** The terms listed under a copied message: its own list, or the ones its kind of message always uses. */
export function promptTermIds(prompt: Pick<Prompt, 'kind' | 'lifecycle' | 'entry' | 'terms'>): string[] {
  if (prompt.terms) return prompt.terms
  if (prompt.kind === 'work') return ['work-request', 'autopilot', 'routing', 'depth']
  if (prompt.kind !== 'setup') return []
  if (prompt.lifecycle === 'promote') return ['promote', 'federation', 'state']
  return prompt.entry === 'squad-federation' ? ['init', 'team', 'federation', 'profile', 'pack'] : ['init', 'team', 'profile', 'pack']
}
export const promptTerms = (prompt: Pick<Prompt, 'kind' | 'lifecycle' | 'entry' | 'terms'>, locale: Locale = 'en') =>
  promptTermIds(prompt).map(id => termById(id, locale))

export function checkLabel(id: string, locale: Locale = 'en') {
  const split = id.lastIndexOf('-')
  const lesson = contentByLocale(locale).lessons.find(item => item.id === id.slice(0, split))
  const text = lesson?.checks[Number(id.slice(split + 1))]
  if (!lesson || !text) throw new Error(`Unknown checkpoint: ${id}.`)
  return { lesson, text }
}

function conditionHolds(condition: string, settings: Pick<Settings, 'tracks' | 'scope'>) {
  const holds = (token: string) => {
    if (scopes.includes(token as Scope)) return settings.scope === token
    if (isTrackId(token)) return settings.tracks.includes(token)
    throw new Error(`Unknown text condition: ${token}.`)
  }
  return condition.includes('+') ? condition.split('+').every(holds) : condition.split('|').some(holds)
}
const conditional = /\[\[([A-Za-z|+]+):([\s\S]*?)\]\]/g
export function resolveConditions(text: string, settings: Pick<Settings, 'tracks' | 'scope'>) {
  return text.replace(conditional, (_, condition: string, body: string) => conditionHolds(condition, settings) ? body : '')
}

const joinList = (items: string[], last = 'and') => items.length < 2 ? items.join('') : `${items.slice(0, -1).join(', ')} ${last} ${items.at(-1)}`
export function teamNames(settings: Settings) {
  return [settings.productSquad, ...chosenTracks(settings).map(track => track.squadKey ? settings[track.squadKey] : '')].map(name => name.trim())
}

/** Resolves [[conditions]], then team names and the placeholders that describe the chosen tracks. */
export function fillNames(text: string, settings: Settings) {
  const lang = settings.language ?? 'en'
  const chosen = chosenTracks(settings)
  const andWord = lang === 'fr' ? 'et' : 'and'
  const orWord = lang === 'fr' ? 'ou' : 'or'
  return resolveConditions(text, settings).replace(/\{(\w+)\}/g, (match, key: string) => {
    if (squadKeys.includes(key as SquadKey)) return settings[key as SquadKey].trim()
    switch (key) {
      case 'trackList': return joinList(chosen.map(track => track.label), andWord)
      case 'areaList': return joinList(chosen.map(track => `${track.area} (${track.areaName})`), andWord)
      case 'teamList': return joinList(teamNames(settings).map(name => JSON.stringify(name)), andWord)
      case 'releaseNames': return joinList(chosen.map(track => releaseName(track)), orWord)
      case 'releaseTags': return joinList(chosen.map(track => releaseTag(track)), andWord)
      case 'releaseList': return chosen.map(track => lang === 'fr'
        ? `\n- ${track.label} : tag de chantier ${trackTag(track)} ; tags de version ${releaseName(track, 1)}, ${releaseName(track, 2)}, etc. ; fichiers de version ${releaseFile(track, '<n>')} ; tags Git ${releaseTag(track, '<n>')}`
        : `\n- ${track.label}: track tag ${trackTag(track)}; release tags ${releaseName(track, 1)}, ${releaseName(track, 2)} and so on; release files ${releaseFile(track, '<n>')}; Git tags ${releaseTag(track, '<n>')}`).join('')
      default: return match
    }
  })
}

function collectBundlePrompts(bundle: WorkshopLocaleContent): Prompt[] {
  return [
    bundle.readinessQuestion, bundle.readyScript, bundle.doctorCheck, bundle.coachQuestion,
    ...Object.values(bundle.installation),
    ...bundle.lessons.flatMap(lesson => [
      ...(lesson.setup ?? []).map(step => step.request),
      ...(lesson.flow ?? []).map(item => item.prompt),
      ...lesson.steps.flatMap(step => step.prompt ? [step.prompt] : []),
    ]),
  ]
}

export function localizePrompt(prompt: Prompt, locale: Locale = 'en'): Prompt {
  if (!prompt.promptId) return prompt
  const match = collectBundlePrompts(contentByLocale(locale)).find(candidate => candidate.promptId === prompt.promptId)
  return match ?? prompt
}

export function referencedSquads(prompt: Pick<Prompt, 'text' | 'squadTarget' | 'promptId'>, settings: Settings): SquadKey[] {
  const resolved = prompt.promptId ? localizePrompt(prompt as Prompt, settings.language) : prompt
  const text = resolveConditions(resolved.text, settings)
  const keys = new Set(squadKeys.filter(key => text.includes(`{${key}}`)))
  if (text.includes('{teamList}')) {
    keys.add('productSquad')
    for (const track of chosenTracks(settings)) keys.add(track.squadKey)
  }
  if (resolved.squadTarget) keys.add(resolved.squadTarget)
  return squadKeys.filter(key => keys.has(key))
}

export function promptBlockers(prompt: Prompt, settings: Settings, checked: string[]) {
  const lang = settings.language ?? 'en'
  const ui = contentByLocale(lang).ui
  const resolved = localizePrompt(prompt, lang)
  const issues: string[] = []
  for (const step of missingSetup(resolved, checked, settings)) issues.push(ui.blockerConfirmSetup(step.title))
  for (const id of resolved.requiresChecks ?? []) {
    if (checked.includes(id)) continue
    const { lesson, text } = checkLabel(id, lang)
    issues.push(ui.blockerCheckpoint(lesson.number, stripTerms(fillNames(text, settings))))
  }
  if (resolved.kind !== 'shell') {
    for (const key of referencedSquads(resolved, settings)) {
      const error = squadNameError(settings[key], lang)
      if (error) issues.push(`${ui.squadLabels[key]}: ${error}`)
    }
  }
  if (resolved.publication) {
    const missing = missingPublication(settings)
    if (missing.length) issues.push(ui.blockerSessionSetupNeeds(missing.map(key => ui.publicationLabels[key]).join(', ')))
  }
  return issues
}

export const squadLabels: Record<SquadKey, string> = englishUi.squadLabels
export const publicationLabels: Record<PublicationField, string> = englishUi.publicationLabels

export function renderPrompt(prompt: Prompt, settings: Settings = defaults): string {
  const lang = settings.language ?? 'en'
  const ui = contentByLocale(lang).ui
  const resolved = localizePrompt(prompt, lang)
  if (resolved.kind === 'shell') return resolved.text
  let text = fillNames(resolved.text, settings)
  if (resolved.publication) {
    const missing = missingPublication(settings)
    if (missing.length) throw new Error(ui.blockerSessionSetupNeeds(missing.map(key => ui.publicationLabels[key]).join(', ')))
    text += `\n\n${ui.publicationDetailsHeader}\n` + publicationFields
      .filter(key => settings[key].trim())
      .map(key => `${ui.publicationLabels[key]}: ${JSON.stringify(settings[key].trim())}`)
      .join('\n')
  }
  if (resolved.kind === 'plain') return text

  let squadOption = ''
  if (resolved.squadTarget) {
    if (resolved.entry !== 'squad-federation' || resolved.kind !== 'work') throw new Error('A team target belongs only on a federation work request.')
    const error = squadNameError(settings[resolved.squadTarget], lang)
    if (error) throw new Error(`${ui.squadLabels[resolved.squadTarget]}: ${error}`)
    squadOption = ` squad=${JSON.stringify(settings[resolved.squadTarget].trim())}`
  }
  if (resolved.kind !== 'work') return text
  return `${autopilotMode} ${routingOption(settings)} ${depthOption(settings)}${squadOption}\n\n${text}`
}

export function routingOption(settings: Pick<Settings, 'routing'>) {
  return `routing=${JSON.stringify(settings.routing ?? 'off')}`
}

export function depthOption(settings: Pick<Settings, 'depth'>) {
  return `depth=${JSON.stringify(settings.depth ?? 'standard')}`
}

const agents: Record<EntryAgent, { name: string; pluginId: string }> = {
  squad: { name: 'Squad Coordinator', pluginId: 'squad-coordinator' },
  'squad-federation': { name: 'Squad Federation Coordinator', pluginId: 'squad-federation-coordinator' },
  'squad-coach': { name: 'Squad Coach', pluginId: 'squad-coach' },
  'squad-doctor': { name: 'Squad Doctor', pluginId: 'squad-doctor' },
  'squad-document': { name: 'Squad Document', pluginId: 'squad-document' },
  'squad-governance-report': { name: 'Squad Governance Report', pluginId: 'squad-governance-report' },
  'squad-external-agent-builder': { name: 'Squad External Agent Builder', pluginId: 'squad-external-agent-builder' },
  'squad-connector-builder': { name: 'Squad Connector Builder', pluginId: 'squad-connector-builder' },
}

/** Every client receives the same message: only the way you select the agent differs. */
export function agentSelection(prompt: Pick<Prompt, 'entry' | 'kind'>, settings: Pick<Settings, 'experience'> & { language?: Locale }) {
  const ui = contentByLocale(settings.language).ui
  if (prompt.kind === 'plain') {
    return { name: ui.plainAgentName, identifier: '', instruction: ui.plainAgentInstruction }
  }
  const { name, pluginId: id } = agents[prompt.entry ?? 'squad']
  if (settings.experience === 'vscode') {
    return { name, identifier: name, instruction: ui.vscodeAgentInstruction(name) }
  }
  const identifier = `hve-squad:${id}`
  return {
    name, identifier,
    instruction: settings.experience === 'cli'
      ? ui.cliAgentInstruction(name, identifier)
      : ui.appAgentInstruction(name, identifier),
  }
}

/** How to start a fresh conversation in the client and select the agent of the next message again. */
export const newConversationHow = (prompt: Pick<Prompt, 'entry' | 'kind'>, settings: Pick<Settings, 'experience'> & { language?: Locale }) =>
  contentByLocale(settings.language).newConversation.how[settings.experience].replace('{agent}', agentSelection(prompt, settings).name)

export function nextClient(current: Client, key: string): Client | undefined {
  if (key === 'Home') return clients[0]
  if (key === 'End') return clients[clients.length - 1]
  if (key !== 'ArrowLeft' && key !== 'ArrowRight') return undefined
  return clients[(clients.indexOf(current) + (key === 'ArrowRight' ? 1 : clients.length - 1)) % clients.length]
}
