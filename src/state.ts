import { autopilotMode, lessons, lifecycleSteps, suggestedSquads } from './content.ts'
import type { Prompt, SetupId, SquadKey } from './content.ts'

export const clients = ['app', 'cli', 'vscode'] as const
export type Client = typeof clients[number]
export const clientLabels: Record<Client, string> = { app: 'Copilot App', cli: 'Copilot CLI', vscode: 'VS Code' }

export const publicationFields = ['organization', 'project', 'participant', 'documentTarget', 'process', 'area', 'iteration'] as const
export type PublicationField = typeof publicationFields[number]
export const requiredPublicationFields: PublicationField[] = ['organization', 'project', 'participant', 'documentTarget']
export const squadKeys: SquadKey[] = ['productSquad', 'migrationSquad', 'modernizationSquad']

export type Settings = { experience: Client } & Record<PublicationField, string> & Record<SquadKey, string>
export type SavedState = { schema: 1; checked: string[]; settings: Settings }

export const defaults: Settings = {
  experience: 'cli',
  organization: '', project: '', participant: '', documentTarget: '', process: '', area: '', iteration: '',
  ...suggestedSquads,
}
export const storageKey = 'hve-squad-hands-on-workshop-v1'
export const themeKey = 'hve-squad-hands-on-theme'

export const setupCheckId = (id: SetupId) => `setup:${id}`
export const lessonCheckId = (lessonId: string, index: number) => `${lessonId}-${index}`

export const allCheckIds = [
  ...lessons.flatMap(lesson => lesson.checks.map((_, index) => lessonCheckId(lesson.id, index))),
  ...lifecycleSteps.map(step => setupCheckId(step.id)),
]
const optionalLessons = new Set(lessons.filter(lesson => lesson.optional).map(lesson => lesson.id))
export const coreCheckIds = allCheckIds.filter(id => !optionalLessons.has(id.slice(0, id.lastIndexOf('-'))))
export const optionalCheckIds = allCheckIds.filter(id => !coreCheckIds.includes(id))

export function progress(checked: string[]) {
  const core = coreCheckIds.filter(id => checked.includes(id)).length
  const optional = optionalCheckIds.filter(id => checked.includes(id)).length
  return { core, coreTotal: coreCheckIds.length, optional, optionalTotal: optionalCheckIds.length, percent: Math.round(core / coreCheckIds.length * 100) }
}

export function missingSetup(prompt: Pick<Prompt, 'requiresSetup'>, checked: string[]) {
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
  for (const id of prompt.requiresSetup ?? []) visit(id, [])
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
  if (!raw) return { schema: 1, checked: [], settings: { ...defaults } }
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
  const settings: Settings = { ...defaults, experience: input.experience as Client }
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

export function promptBlockers(prompt: Prompt, settings: Settings, checked: string[]) {
  const issues: string[] = []
  for (const step of missingSetup(prompt, checked)) issues.push(`Confirm the setup step "${step.title}" first.`)
  for (const id of prompt.requiresChecks ?? []) {
    if (checked.includes(id)) continue
    const { lesson, text } = checkLabel(id)
    issues.push(`Part ${lesson.number} checkpoint: "${text}"`)
  }
  const referenced = squadKeys.filter(key => prompt.text.includes(`{${key}}`) || prompt.squadTarget === key)
  for (const key of referenced) {
    const error = squadNameError(settings[key])
    if (error) issues.push(`${squadLabels[key]}: ${error}`)
  }
  if (prompt.publication) {
    const missing = missingPublication(settings)
    if (missing.length) issues.push(`Session setup needs: ${missing.map(key => publicationLabels[key]).join(', ')}.`)
  }
  return issues
}

export const squadLabels: Record<SquadKey, string> = {
  productSquad: 'Product team name',
  migrationSquad: 'Migration team name',
  modernizationSquad: 'Modernization team name',
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

export function fillNames(text: string, settings: Settings) {
  return text.replace(/\{(productSquad|migrationSquad|modernizationSquad)\}/g, (_, key: SquadKey) => settings[key].trim())
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

  if (settings.experience !== 'vscode') {
    return prompt.kind === 'work' ? `${autopilotMode}${squadOption}\n\n${text}` : text
  }
  if (prompt.kind === 'setup' && entry === 'squad-federation' && prompt.lifecycle) {
    const firstBreak = text.indexOf('\n')
    const body = firstBreak >= 0 && text.slice(0, firstBreak).trim() === prompt.lifecycle ? text.slice(firstBreak + 1).trimStart() : text
    return `/${entry} ${prompt.lifecycle} request=${JSON.stringify(body)}`
  }
  const mode = prompt.kind === 'work' ? ` ${autopilotMode}` : ''
  // JSON quoting keeps quotes, backslashes and line breaks inside a single request argument.
  return `/${entry}${mode}${squadOption} request=${JSON.stringify(text)}`
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
