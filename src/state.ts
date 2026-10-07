import {
  agenda, autopilotMode, lessons, lifecycleSteps, prerequisites, releaseFile, releaseTag, routingOptions, scopeOptions, suggestedSquads,
  trackIds, trackTag, tracks,
} from './content.ts'
import type { Answer, Lesson, Prompt, Routing, Scope, SetupId, SquadKey, Track, TrackId } from './content.ts'

export const clients = ['app', 'cli', 'vscode'] as const
export type Client = typeof clients[number]
export const clientLabels: Record<Client, string> = { app: 'Copilot App', cli: 'Copilot CLI', vscode: 'VS Code' }

export const publicationFields = ['organization', 'project', 'participant', 'documentTarget', 'process', 'area', 'iteration'] as const
export type PublicationField = typeof publicationFields[number]
export const requiredPublicationFields: PublicationField[] = ['organization', 'project', 'participant', 'documentTarget']
export const squadKeys: SquadKey[] = ['productSquad', 'migrationSquad', 'modernizationSquad', 'powerPlatformSquad']

export type Settings = { experience: Client; routing: Routing; tracks: TrackId[]; scope: Scope } & Record<PublicationField, string> & Record<SquadKey, string>
export const routings = routingOptions.map(option => option.value)
export const scopes = scopeOptions.map(option => option.value)
export type SavedState = { schema: 1; checked: string[]; settings: Settings }

export const defaults: Settings = {
  experience: 'cli',
  routing: 'off',
  tracks: [...trackIds],
  scope: 'full',
  organization: '', project: '', participant: '', documentTarget: '', process: '', area: '', iteration: '',
  ...suggestedSquads,
}
export const storageKey = 'hve-squad-hands-on-workshop-v1'
export const themeKey = 'hve-squad-hands-on-theme'

export const setupCheckId = (id: SetupId) => `setup:${id}`
export const lessonCheckId = (lessonId: string, index: number) => `${lessonId}-${index}`

const isTrackId = (value: unknown): value is TrackId => trackIds.includes(value as TrackId)
export const chosenTracks = (settings: Pick<Settings, 'tracks'>): Track[] => tracks.filter(track => settings.tracks.includes(track.id))
export const lessonVisible = (lesson: Pick<Lesson, 'track'>, settings: Pick<Settings, 'tracks'>) => !lesson.track || settings.tracks.includes(lesson.track)
export const visibleLessons = (settings: Pick<Settings, 'tracks'>) => lessons.filter(lesson => lessonVisible(lesson, settings))
export const visibleAgenda = (settings: Pick<Settings, 'tracks'>) => agenda.filter(item => {
  const lesson = lessons.find(candidate => candidate.id === item.lesson)
  return !lesson || lessonVisible(lesson, settings)
})
export const visiblePrerequisites = (settings: Pick<Settings, 'tracks'>) => prerequisites.filter(item => !item.track || settings.tracks.includes(item.track))
/** With the whole case in scope the intake may ask about any area, so every answer stays visible. */
export const visibleAnswers = (answers: Answer[] | undefined, settings: Pick<Settings, 'tracks' | 'scope'>) =>
  (answers ?? []).filter(answer => settings.scope === 'full' || answer.tracks.some(track => settings.tracks.includes(track)))

/** Chosen tracks in registry order. The last track cannot be removed: the product needs at least one release. */
export function toggleTrack(current: TrackId[], id: TrackId): TrackId[] {
  const next = current.includes(id) ? current.filter(value => value !== id) : [...current, id]
  return next.length ? trackIds.filter(value => next.includes(value)) : current
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

/** Setup steps still to confirm before a prompt, in order. Steps of tracks not chosen are ignored. */
export function missingSetup(prompt: Pick<Prompt, 'requiresSetup'>, checked: string[], settings: Pick<Settings, 'tracks'> = defaults) {
  const ordered: typeof lifecycleSteps = []
  const visited = new Set<SetupId>()
  function visit(id: SetupId, trail: SetupId[]) {
    if (trail.includes(id)) throw new Error(`Circular setup prerequisite: ${id}.`)
    if (visited.has(id)) return
    const step = lifecycleSteps.find(candidate => candidate.id === id)
    if (!step) throw new Error(`Unknown setup prerequisite: ${id}.`)
    for (const parent of step.request.requiresSetup ?? []) visit(parent, [...trail, id])
    visited.add(id)
    ordered.push(step)
  }
  const relevant = (prompt.requiresSetup ?? []).filter(id => {
    const step = lifecycleSteps.find(candidate => candidate.id === id)
    const lesson = lessons.find(candidate => candidate.id === step?.lessonId)
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
  if (input.routing !== undefined) {
    if (!routings.includes(input.routing as Routing)) throw new Error('Saved progress names an unknown model routing.')
    settings.routing = input.routing as Routing
  }
  if (input.tracks !== undefined) {
    if (!Array.isArray(input.tracks) || !input.tracks.length || !input.tracks.every(isTrackId)) throw new Error('Saved progress names no delivery track or an unknown one.')
    settings.tracks = trackIds.filter(id => (input.tracks as TrackId[]).includes(id))
  }
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

export function squadNameError(value: string) {
  const name = value.trim()
  if (!name) return 'Enter the registered team name.'
  if (!/^[a-z0-9][a-z0-9-]*$/.test(name)) return 'Use lowercase letters, digits and hyphens, starting with a letter or digit.'
  return ''
}

export function missingPublication(settings: Settings) {
  return requiredPublicationFields.filter(key => !settings[key].trim())
}

export function checkLabel(id: string) {
  const split = id.lastIndexOf('-')
  const lesson = lessons.find(item => item.id === id.slice(0, split))
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

const joinList = (items: string[]) => items.length < 2 ? items.join('') : `${items.slice(0, -1).join(', ')} and ${items.at(-1)}`
export function teamNames(settings: Settings) {
  return [settings.productSquad, ...chosenTracks(settings).map(track => settings[track.squadKey])].map(name => name.trim())
}

/** Resolves [[conditions]], then team names and the placeholders that describe the chosen tracks. */
export function fillNames(text: string, settings: Settings) {
  const chosen = chosenTracks(settings)
  return resolveConditions(text, settings).replace(/\{(\w+)\}/g, (match, key: string) => {
    if (squadKeys.includes(key as SquadKey)) return settings[key as SquadKey].trim()
    switch (key) {
      case 'trackList': return joinList(chosen.map(track => track.label))
      case 'areaList': return joinList(chosen.map(track => `${track.area} (${track.areaName})`))
      case 'teamList': return joinList(teamNames(settings).map(name => JSON.stringify(name)))
      case 'releaseTags': return joinList(chosen.map(releaseTag))
      case 'releaseList': return chosen.map(track => `\n- ${track.label}: items tagged ${trackTag(track)}, described in ${releaseFile(track)}, Git tag ${releaseTag(track)}`).join('')
      default: return match
    }
  })
}

export function referencedSquads(prompt: Pick<Prompt, 'text' | 'squadTarget'>, settings: Settings): SquadKey[] {
  const text = resolveConditions(prompt.text, settings)
  const keys = new Set(squadKeys.filter(key => text.includes(`{${key}}`)))
  if (text.includes('{teamList}')) {
    keys.add('productSquad')
    for (const track of chosenTracks(settings)) keys.add(track.squadKey)
  }
  if (prompt.squadTarget) keys.add(prompt.squadTarget)
  return squadKeys.filter(key => keys.has(key))
}

export function promptBlockers(prompt: Prompt, settings: Settings, checked: string[]) {
  const issues: string[] = []
  for (const step of missingSetup(prompt, checked, settings)) issues.push(`Confirm the setup step "${step.title}" first.`)
  for (const id of prompt.requiresChecks ?? []) {
    if (checked.includes(id)) continue
    const { lesson, text } = checkLabel(id)
    issues.push(`Part ${lesson.number} checkpoint: "${fillNames(text, settings)}"`)
  }
  if (prompt.kind !== 'shell') {
    for (const key of referencedSquads(prompt, settings)) {
      const error = squadNameError(settings[key])
      if (error) issues.push(`${squadLabels[key]}: ${error}`)
    }
  }
  if (prompt.publication) {
    const missing = missingPublication(settings)
    if (missing.length) issues.push(`Session setup needs: ${missing.map(key => publicationLabels[key]).join(', ')}.`)
  }
  return issues
}

export const squadLabels: Record<SquadKey, string> = {
  productSquad: 'Product team name',
  migrationSquad: 'Azure team name',
  modernizationSquad: '.NET team name',
  powerPlatformSquad: 'Power Platform team name',
}
export const publicationLabels: Record<PublicationField, string> = {
  organization: 'Azure DevOps organization',
  project: 'Project',
  participant: 'Participant prefix',
  documentTarget: 'Documentation location',
  process: 'Process',
  area: 'Area path',
  iteration: 'Iteration path',
}

export function renderPrompt(prompt: Prompt, settings: Settings = defaults): string {
  if (prompt.kind === 'shell') return prompt.text
  let text = fillNames(prompt.text, settings)
  if (prompt.publication) {
    const missing = missingPublication(settings)
    if (missing.length) throw new Error(`Session setup needs: ${missing.map(key => publicationLabels[key]).join(', ')}.`)
    text += '\n\nOur Azure DevOps details:\n' + publicationFields
      .filter(key => settings[key].trim())
      .map(key => `${publicationLabels[key]}: ${JSON.stringify(settings[key].trim())}`)
      .join('\n')
  }
  if (prompt.kind === 'plain') return text

  let squadOption = ''
  if (prompt.squadTarget) {
    if (prompt.entry !== 'squad-federation' || prompt.kind !== 'work') throw new Error('A team target belongs only on a federation work request.')
    const error = squadNameError(settings[prompt.squadTarget])
    if (error) throw new Error(`${squadLabels[prompt.squadTarget]}: ${error}`)
    squadOption = ` squad=${JSON.stringify(settings[prompt.squadTarget].trim())}`
  }
  const entry = prompt.entry ?? 'squad'
  const workOptions = `${autopilotMode} ${routingOption(settings)}${squadOption}`

  if (settings.experience !== 'vscode') {
    return prompt.kind === 'work' ? `${workOptions}\n\n${text}` : text
  }
  if (prompt.kind === 'setup' && entry === 'squad-federation' && prompt.lifecycle) {
    const firstBreak = text.indexOf('\n')
    const body = firstBreak >= 0 && text.slice(0, firstBreak).trim() === prompt.lifecycle ? text.slice(firstBreak + 1).trimStart() : text
    return `/${entry} ${prompt.lifecycle} request=${JSON.stringify(body)}`
  }
  const options = prompt.kind === 'work' ? ` ${workOptions}` : ''
  // JSON quoting keeps quotes, backslashes and line breaks inside a single request argument.
  return `/${entry}${options} request=${JSON.stringify(text)}`
}

export function routingOption(settings: Pick<Settings, 'routing'>) {
  return `routing=${JSON.stringify(settings.routing)}`
}

export function agentSelection(prompt: Pick<Prompt, 'entry' | 'kind'>, settings: Settings) {
  if (prompt.kind === 'plain') {
    return { name: 'Default Copilot agent', identifier: '', instruction: 'Use the default Copilot agent: do not select a squad agent or prompt for this question.' }
  }
  const federation = prompt.entry === 'squad-federation'
  const name = federation ? 'Squad Federation Coordinator' : 'Squad Coordinator'
  if (settings.experience === 'vscode') {
    const identifier = federation ? '/squad-federation' : '/squad'
    return { name, identifier, instruction: `In VS Code Copilot Chat, paste the whole block: it starts with ${identifier}. Pick the prompt, not the skill with the same name.` }
  }
  const identifier = `hve-squad:${federation ? 'squad-federation-coordinator' : 'squad-coordinator'}`
  return {
    name, identifier,
    instruction: settings.experience === 'cli'
      ? `In Copilot CLI, type /agent and choose ${name} (it may show as ${identifier}).`
      : `In the Copilot App, open the agent list and choose ${name} (it may show as ${identifier}).`,
  }
}

export function nextClient(current: Client, key: string): Client | undefined {
  if (key === 'Home') return clients[0]
  if (key === 'End') return clients[clients.length - 1]
  if (key !== 'ArrowLeft' && key !== 'ArrowRight') return undefined
  return clients[(clients.indexOf(current) + (key === 'ArrowRight' ? 1 : clients.length - 1)) % clients.length]
}
