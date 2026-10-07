import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import {
  agenda, autopilotMode, installation, lessons, lifecycleSteps, prerequisites, readinessQuestion, readyScript, releaseTag, routingOptions, scopeOptions, sources,
  squadReleaseUrl, squadVersion, suggestedSquads, trackIds, tracks, troubleshooting,
} from '../src/content.ts'
import { hveSquadRelease } from '../src/hve-squad-release.ts'
import {
  agentSelection, checkIds, checkLabel, coreCheckIds, decodeState, defaults, fillNames, missingSetup, optionalCheckIds, progress, promptBlockers,
  renderPrompt, resolveConditions, setupCheckId, squadNameError, storageKey, toggleCheck, toggleTrack, visibleAgenda, visibleAnswers, visibleLessons,
  visiblePrerequisites,
} from '../src/state.ts'
import { applyRelease, collectStarter, crc32, createZip, starterFolder } from '../scripts/build-starter.mjs'
import { parseRelease, readCommittedRelease, renderReleaseModule } from '../scripts/hve-squad-release.mjs'

const allPrompts = [
  readinessQuestion, readyScript, installation.cli, installation.cliUpdate, installation.apm,
  ...lessons.flatMap(lesson => [
    ...(lesson.setup ?? []).map(step => step.request),
    ...(lesson.flow ?? []).map(item => item.prompt),
    ...lesson.steps.flatMap(step => step.prompt ? [step.prompt] : []),
  ]),
]
const allChecked = [...coreCheckIds, ...optionalCheckIds]
const starterFiles = await collectStarter()
const starterText = path => starterFiles.find(file => file.path === path)?.content ?? ''
const knowledge = ['knowledge-docs/business-case.md', 'knowledge-docs/current-state.md', 'knowledge-docs/engineering-standards.md'].map(starterText).join('\n')
const guideText = JSON.stringify({ lessons, troubleshooting, readinessQuestion })
const lesson = id => lessons.find(item => item.id === id)
const workPrompt = id => lesson(id).flow[0].prompt
const publication = { organization: 'contoso', project: 'Northwind', participant: 'AB-', documentTarget: 'wiki:/Northwind' }

// Every non-empty set of tracks, with both product scopes.
const trackSets = Array.from({ length: 2 ** trackIds.length - 1 }, (_, mask) => trackIds.filter((_, bit) => (mask + 1) & (1 << bit)))
const combinations = trackSets.flatMap(set => scopeOptions.map(option => ({ ...defaults, ...publication, tracks: set, scope: option.value })))
const lessonStrings = item => [
  item.goal, item.concept, item.recovery, ...item.inputs, ...item.evidence, ...item.checks, ...(item.behaviors ?? []),
  ...(item.reviewKey ? [item.reviewKey.intro, ...item.reviewKey.items.map(entry => entry.detail)] : []),
  ...item.steps.map(step => step.body), ...(item.flow ?? []).map(flow => flow.hint),
  ...(item.setup ?? []).flatMap(step => [step.description, step.checkpoint, ...step.expected]),
]

test('the agenda follows the lessons and shrinks with the tracks chosen', () => {
  const ordered = agenda.filter(item => item.lesson).map(item => item.lesson)
  assert.deepEqual(ordered, lessons.map(item => item.id))
  const total = settings => visibleAgenda(settings).reduce((sum, item) => sum + item.minutes, 0)
  assert.equal(total(defaults), 340)
  for (const id of trackIds) assert.equal(total({ tracks: [id] }), 220, id)
  assert.equal(agenda.at(-1).lesson, 'reflect')
  assert.equal(agenda.find(item => item.lesson === 'ado').optional, true)
})

test('every lesson is complete and uniquely identified', () => {
  assert.equal(new Set(lessons.map(item => item.id)).size, lessons.length)
  assert.deepEqual(lessons.map(item => item.number), lessons.map((_, index) => String(index).padStart(2, '0')))
  for (const item of lessons) {
    assert.ok(item.goal && item.concept && item.recovery, item.id)
    assert.ok(item.steps.length && item.checks.length && item.evidence.length && item.inputs.length, item.id)
  }
  assert.deepEqual(lessons.filter(item => item.optional).map(item => item.id), ['ado'])
})

test('each track owns one lesson, one setup step and one team name', () => {
  assert.deepEqual(trackIds, ['azure', 'dotnet', 'powerPlatform'])
  for (const track of tracks) {
    const owned = lessons.filter(item => item.track === track.id)
    assert.deepEqual(owned.map(item => item.id), [track.lessonId], track.id)
    assert.deepEqual(owned[0].setup.map(step => step.id), [track.setupId], track.id)
    assert.ok(track.squadKey in suggestedSquads, track.id)
    assert.equal(owned[0].flow[0].prompt.squadTarget, track.squadKey, track.id)
    assert.match(knowledge, new RegExp(`\\| ${track.area} \\|[^\\n]*\\*\\*${track.label.replace('.', '\\.')}\\*\\*`), `${track.area} is delivered by ${track.label}`)
    assert.match(knowledge, new RegExp(`track-${track.slug}`), `ES-30 names the tag of ${track.id}`)
  }
})

test('every BR- and NFR- identifier belongs to a business area', () => {
  const table = starterText('knowledge-docs/business-case.md').split('\n').filter(line => /^\| BA-\d{2} \|/.test(line)).join('\n')
  const covered = new Set()
  for (const [, prefix, from, to] of table.matchAll(/\b(BR|NFR)-(\d{2})(?: to (?:BR|NFR)-(\d{2}))?/g)) {
    for (let n = Number(from); n <= Number(to ?? from); n++) covered.add(`${prefix}-${String(n).padStart(2, '0')}`)
  }
  const defined = [...starterText('knowledge-docs/business-case.md').matchAll(/^\| ((?:BR|NFR)-\d{2}) \|/gm)].map(match => match[1])
  assert.equal(defined.length, 19 + 9)
  for (const id of defined) assert.ok(covered.has(id), `${id} has a business area`)
})

test('setup: product → promote, then every track team needs only the promotion', () => {
  assert.deepEqual(lifecycleSteps.map(step => step.id), ['product-team', 'promote', 'migration-team', 'modernization-team', 'power-platform-team'])
  for (const track of tracks) {
    const step = lifecycleSteps.find(item => item.id === track.setupId)
    assert.deepEqual(step.request.requiresSetup, ['promote'], track.id)
    assert.equal(step.request.requiresChecks, undefined, track.id)
    assert.deepEqual(missingSetup({ requiresSetup: [track.setupId] }, []).map(item => item.id), ['product-team', 'promote', track.setupId])
  }
  assert.deepEqual(lifecycleSteps.find(step => step.id === 'promote').request.requiresChecks, ['product-3'])
  assert.match(checkLabel('product-3').text, /release/)
})

test('prompt metadata is consistent', () => {
  const placeholders = new Set([...Object.keys(suggestedSquads), 'trackList', 'areaList', 'teamList', 'releaseTags', 'releaseList'])
  for (const prompt of allPrompts) {
    assert.ok(['setup', 'work', 'question', 'plain', 'shell'].includes(prompt.kind), prompt.title)
    if (prompt.kind === 'setup') {
      assert.ok(prompt.lifecycle, prompt.title)
      assert.ok(prompt.text.startsWith(`${prompt.lifecycle}\n\n`), prompt.title)
    } else assert.equal(prompt.lifecycle, undefined, prompt.title)
    if (prompt.squadTarget) assert.ok(prompt.entry === 'squad-federation' && prompt.kind === 'work', prompt.title)
    if (['setup', 'work', 'question'].includes(prompt.kind)) assert.ok(prompt.entry, prompt.title)
    if (prompt.kind !== 'shell') for (const match of prompt.text.matchAll(/\{(\w+)\}/g)) assert.ok(placeholders.has(match[1]), `${prompt.title}: {${match[1]}}`)
  }
  const federationWork = allPrompts.filter(prompt => prompt.kind === 'work' && prompt.entry === 'squad-federation')
  assert.deepEqual(federationWork.map(prompt => prompt.squadTarget), ['migrationSquad', 'modernizationSquad', 'powerPlatformSquad'])
})

test('every request and lesson text renders cleanly for every choice of tracks and scope', () => {
  for (const settings of combinations) {
    for (const prompt of allPrompts) {
      if (prompt.kind === 'shell') continue
      const text = renderPrompt(prompt, settings)
      assert.doesNotMatch(text, /\{(productSquad|migrationSquad|modernizationSquad|powerPlatformSquad|trackList|areaList|teamList|releaseTags|releaseList)\}|\[\[|\]\]/, `${settings.tracks}/${settings.scope} · ${prompt.title}`)
    }
    for (const item of visibleLessons(settings)) {
      for (const text of lessonStrings(item)) assert.doesNotMatch(fillNames(text, settings), /\[\[|\]\]|\{(trackList|areaList|teamList|releaseTags|releaseList)\}/, `${item.id}: ${text.slice(0, 40)}`)
    }
  }
  assert.throws(() => resolveConditions('[[cloud:x]]', defaults), /Unknown text condition/)
})

test('only work requests carry autopilot, for every client', () => {
  for (const experience of ['app', 'cli', 'vscode']) {
    const settings = { ...defaults, ...publication, experience }
    for (const prompt of allPrompts) {
      const text = renderPrompt(prompt, settings)
      assert.equal(text.includes(autopilotMode), prompt.kind === 'work', `${experience} · ${prompt.title}`)
    }
  }
})

test('App and CLI put the mode, routing and squad target on the first line', () => {
  const text = renderPrompt(workPrompt('migration'), defaults)
  assert.ok(text.startsWith(`${autopilotMode} routing="off" squad="azure-migration"\n\nPlan the move`), text.slice(0, 80))
  const power = renderPrompt(workPrompt('powerplatform'), defaults)
  assert.ok(power.startsWith(`${autopilotMode} routing="off" squad="power-platform"\n\nDesign the delivery-claims`), power.slice(0, 80))
  const promote = lifecycleSteps.find(step => step.id === 'promote').request
  assert.ok(renderPrompt(promote, { ...defaults, experience: 'app' }).startsWith('promote\n\n'))
})

test('every autopilot request carries the chosen routing, and nothing else does', () => {
  assert.deepEqual(routingOptions.map(option => option.value), ['off', 'ranked', 'manual'])
  for (const option of routingOptions) assert.ok(option.summary && option.detail, option.value)
  assert.equal(defaults.routing, 'off')
  for (const routing of ['off', 'ranked', 'manual']) {
    for (const experience of ['app', 'cli', 'vscode']) {
      const settings = { ...defaults, ...publication, experience, routing }
      for (const prompt of allPrompts) {
        const text = renderPrompt(prompt, settings)
        const header = experience === 'vscode' ? text.slice(0, text.indexOf(' request=')) : text.split('\n')[0]
        if (prompt.kind === 'work') assert.ok(header.includes(`${autopilotMode} routing="${routing}"`), `${experience} ${routing} ${prompt.title}: ${header}`)
        else assert.doesNotMatch(text, /routing="/, `${experience} ${prompt.title}`)
      }
    }
  }
  assert.equal(decodeState(JSON.stringify({ schema: 1, checked: [], settings: { experience: 'cli', routing: 'manual' } })).settings.routing, 'manual')
  assert.equal(decodeState(JSON.stringify({ schema: 1, checked: [], settings: { experience: 'cli' } })).settings.routing, 'off')
  assert.throws(() => decodeState(JSON.stringify({ schema: 1, checked: [], settings: { experience: 'cli', routing: 'fast' } })), /routing/)
})

test('the product lesson leaves intake to the squad', () => {
  const product = lesson('product')
  assert.equal(product.flow.length, 1)
  assert.equal(product.flow[0].prompt.kind, 'work')
  assert.ok(!allPrompts.some(prompt => prompt.kind === 'question' && prompt.entry === 'squad'))
  assert.match(product.flow[0].hint, /intake validator/)
  assert.doesNotMatch(product.flow[0].prompt.text, /answers I gave/)
  assert.ok(product.answers.length >= 7)
})

test('the product request asks for one tagged release per chosen track, in the chosen scope', () => {
  const product = workPrompt('product')
  const all = renderPrompt(product, defaults)
  assert.match(all, /tracks, each run by its own team that builds only from its own release: Azure, \.NET and Power Platform\./)
  assert.match(all, /Cover the whole business case/)
  for (const track of tracks) assert.ok(all.includes(`Git tag ${releaseTag(track)}`), track.id)
  assert.match(all, /Tag every item with the track that delivers it \(ES-30\)/)
  assert.match(all, /commit the product documents and create the Git tag of each release/)

  const focused = renderPrompt(product, { ...defaults, tracks: ['powerPlatform'], scope: 'focused' })
  assert.match(focused, /these tracks, each run by its own team that builds only from its own release: Power Platform\./)
  assert.match(focused, /Cover only the business areas of those tracks — BA-03 \(Delivery claims and credit notes\) — and list the other areas as out of scope/)
  assert.match(focused, /product\/power-platform-r1/)
  assert.doesNotMatch(focused, /product\/azure-r1|product\/dotnet-r1|whole business case/)

  const init = renderPrompt(lifecycleSteps[0].request, { ...defaults, tracks: ['azure', 'dotnet'], scope: 'focused' })
  assert.match(init, /in the business areas BA-01 \(Platform and data-centre exit\) and BA-02 \(Ordering and customer self-service\)/)
  assert.match(init, /one release per delivery track \(Azure and \.NET\)/)
})

test('tracks are independent: hidden parts, answers, prerequisites and progress follow the choice', () => {
  const powerOnly = { ...defaults, tracks: ['powerPlatform'] }
  assert.deepEqual(visibleLessons(powerOnly).map(item => item.id), ['prepare', 'orient', 'product', 'ado', 'federation', 'powerplatform', 'together', 'reflect'])
  assert.ok(!visiblePrerequisites(powerOnly).some(item => item.what.startsWith('.NET') || item.what.startsWith('Azure CLI')))
  assert.equal(visiblePrerequisites(defaults).length, prerequisites.length)
  assert.deepEqual(visibleAnswers(lesson('product').answers, { ...powerOnly, scope: 'focused' }).map(answer => answer.question.slice(0, 5)), ['OQ-04', 'OQ-05'])
  assert.equal(visibleAnswers(lesson('product').answers, { ...powerOnly, scope: 'full' }).length, lesson('product').answers.length)

  const ids = checkIds(powerOnly)
  assert.ok(!ids.core.some(id => id.startsWith('migration-') || id.startsWith('modernize-') || id.includes('migration-team')))
  assert.equal(progress(ids.core, powerOnly).percent, 100)
  assert.ok(progress(ids.core, defaults).percent < 100)

  assert.deepEqual(toggleTrack(['azure', 'dotnet'], 'azure'), ['dotnet'])
  assert.deepEqual(toggleTrack(['dotnet'], 'dotnet'), ['dotnet'])
  assert.deepEqual(toggleTrack(['powerPlatform'], 'azure'), ['azure', 'powerPlatform'])
})

test('the status question lists only the chosen teams and waits only for their setup', () => {
  const together = workPrompt('together')
  const all = renderPrompt(together, defaults)
  assert.match(all, /"product", "azure-migration", "dotnet-modernization" and "power-platform"/)
  assert.match(all, /Is every application change listed by "azure-migration" either done by "dotnet-modernization"/)
  const power = { ...defaults, tracks: ['powerPlatform'] }
  const powerText = renderPrompt(together, power)
  assert.match(powerText, /For each team — "product" and "power-platform" —/)
  assert.doesNotMatch(powerText, /azure-migration|dotnet-modernization/)
  assert.deepEqual(missingSetup(together, [], power).map(step => step.id), ['product-team', 'promote', 'power-platform-team'])
  assert.deepEqual(promptBlockers(together, { ...power, migrationSquad: 'Bad Name' }, ['setup:product-team', 'setup:promote', 'setup:power-platform-team']), [])
  assert.ok(promptBlockers(together, { ...power, powerPlatformSquad: '' }, allChecked).some(item => item.includes('Power Platform team name')))
})

test('the .NET track never waits for the Azure track', () => {
  const modernize = workPrompt('modernize')
  const alone = renderPrompt(modernize, { ...defaults, tracks: ['dotnet'] })
  assert.doesNotMatch(alone, /azure-migration/)
  assert.match(alone, /identify what blocks it/)
  assert.match(renderPrompt(modernize, defaults), /If the "azure-migration" team has already listed application changes, use the approaches its design selected; do not wait for it\./)
  assert.deepEqual(promptBlockers(modernize, { ...defaults, tracks: ['dotnet'] }, ['setup:product-team', 'setup:promote', 'setup:modernization-team']), [])
})

test('VS Code commands use the documented prompt inputs', () => {
  const vscode = { ...defaults, experience: 'vscode' }
  const productInit = renderPrompt(lifecycleSteps[0].request, vscode)
  assert.ok(productInit.startsWith('/squad request="init\\n\\n'), productInit)
  const migrationInit = renderPrompt(lifecycleSteps[2].request, vscode)
  assert.ok(migrationInit.startsWith('/squad-federation init request="Add a new team named \\"azure-migration\\"'), migrationInit)
  const promote = renderPrompt(lifecycleSteps[1].request, vscode)
  assert.ok(promote.startsWith('/squad-federation promote request="We want'), promote)
  const modernize = renderPrompt(workPrompt('modernize'), vscode)
  assert.ok(modernize.startsWith('/squad-federation mode="autopilot" routing="off" squad="dotnet-modernization" request="Modernize'), modernize)
  const work = renderPrompt(workPrompt('product'), vscode)
  const request = JSON.parse(work.slice(work.indexOf('request=') + 'request='.length))
  assert.match(request, /^Using knowledge-docs/)
  assert.match(request, /\n- Azure: items tagged track-azure, described in docs\/product\/releases\/azure-r1\.md, Git tag product\/azure-r1/)
  assert.equal(renderPrompt(readinessQuestion, vscode), readinessQuestion.text)
})

test('custom team names flow through every request and are validated', () => {
  const settings = { ...defaults, migrationSquad: 'cloud', productSquad: 'planning' }
  const init = renderPrompt(lifecycleSteps[2].request, settings)
  assert.match(init, /named "cloud"/)
  assert.match(init, /"planning" team/)
  assert.equal(fillNames('{modernizationSquad}', settings), 'dotnet-modernization')
  for (const bad of ['', 'Azure Migration', '-x', 'azure_migration']) assert.ok(squadNameError(bad), bad)
  assert.equal(squadNameError('azure-migration'), '')
  const migration = workPrompt('migration')
  assert.throws(() => renderPrompt(migration, { ...defaults, migrationSquad: 'Bad Name' }), /lowercase/)
  assert.ok(promptBlockers(migration, { ...defaults, migrationSquad: '' }, allChecked).some(item => item.includes('Azure team name')))
})

test('Azure DevOps publication needs the Session setup details and includes them', () => {
  const publish = workPrompt('ado')
  assert.throws(() => renderPrompt(publish, defaults), /Session setup needs/)
  const text = renderPrompt(publish, { ...defaults, ...publication, process: '' })
  assert.match(text, /Azure DevOps organization: "contoso"/)
  assert.match(text, /Participant prefix: "AB-"/)
  assert.match(text, /its track tag \(ES-30\)/)
  assert.doesNotMatch(text, /Process:/)
})

test('copy stays blocked until earlier setup is confirmed', () => {
  const modernize = workPrompt('modernize')
  assert.equal(promptBlockers(modernize, defaults, []).filter(item => item.startsWith('Confirm the setup')).length, 3)
  assert.deepEqual(promptBlockers(modernize, defaults, allChecked), [])
  const promote = lifecycleSteps.find(step => step.id === 'promote').request
  const setupOnly = ['setup:product-team']
  assert.deepEqual(promptBlockers(promote, defaults, setupOnly), ['Part 02 checkpoint: "I approved one release per chosen track, and git tag -l "product/*" lists their tags."'])
  assert.deepEqual(promptBlockers(promote, defaults, [...setupOnly, 'product-3']), [])
  for (const prompt of allPrompts) for (const id of prompt.requiresChecks ?? []) assert.ok(checkLabel(id).text, id)
  assert.throws(() => checkLabel('product-99'), /Unknown checkpoint/)
})

test('unchecking a setup step also unchecks the steps that depend on it', () => {
  const all = lifecycleSteps.map(step => setupCheckId(step.id))
  assert.deepEqual(toggleCheck('setup:promote', all), ['setup:product-team'])
  assert.deepEqual(toggleCheck('setup:migration-team', all), all.filter(id => id !== 'setup:migration-team'))
  assert.deepEqual(toggleCheck('product-0', ['setup:product-team']), ['setup:product-team', 'product-0'])
})

test('saved state is validated, deduplicated, filtered and backward compatible', () => {
  const state = decodeState(JSON.stringify({ schema: 1, checked: ['product-0', 'product-0', 'gone-9'], settings: { experience: 'app', project: 'X' } }))
  assert.deepEqual(state.checked, ['product-0'])
  assert.equal(state.settings.project, 'X')
  assert.equal(state.settings.migrationSquad, 'azure-migration')
  assert.deepEqual(state.settings.tracks, trackIds)
  assert.equal(state.settings.scope, 'full')
  const chosen = decodeState(JSON.stringify({ schema: 1, checked: [], settings: { experience: 'cli', tracks: ['powerPlatform', 'azure'], scope: 'focused' } }))
  assert.deepEqual(chosen.settings.tracks, ['azure', 'powerPlatform'])
  assert.equal(chosen.settings.scope, 'focused')
  for (const raw of [
    'not json', '{}', 'null', '{"schema":2}',
    JSON.stringify({ schema: 1, checked: [1], settings: defaults }),
    JSON.stringify({ schema: 1, checked: [], settings: { ...defaults, experience: 'emacs' } }),
    JSON.stringify({ schema: 1, checked: [], settings: { experience: 'cli', tracks: [] } }),
    JSON.stringify({ schema: 1, checked: [], settings: { experience: 'cli', tracks: ['sap'] } }),
    JSON.stringify({ schema: 1, checked: [], settings: { experience: 'cli', scope: 'some' } }),
  ]) {
    assert.throws(() => decodeState(raw), raw)
  }
  assert.equal(storageKey, 'hve-squad-hands-on-workshop-v1')
})

test('progress counts core checkpoints and keeps the optional part separate', () => {
  assert.ok(optionalCheckIds.length > 0 && optionalCheckIds.every(id => id.startsWith('ado-')))
  const result = progress([...optionalCheckIds])
  assert.equal(result.core, 0)
  assert.equal(result.percent, 0)
  assert.equal(progress(coreCheckIds).percent, 100)
})

test('agent selection matches each client', () => {
  assert.match(agentSelection({ entry: 'squad', kind: 'work' }, defaults).instruction, /type \/agent/)
  assert.match(agentSelection({ entry: 'squad-federation', kind: 'setup' }, { ...defaults, experience: 'app' }).instruction, /agent list/)
  assert.equal(agentSelection({ entry: 'squad-federation', kind: 'work' }, { ...defaults, experience: 'vscode' }).identifier, '/squad-federation')
  assert.match(agentSelection({ kind: 'plain' }, defaults).instruction, /do not select a squad/)
})

test('every identifier the guide cites exists in the starter knowledge-docs', () => {
  const cited = new Set(guideText.match(/\b(BR|NFR|C|SM|CS|ES|OQ|BA|P)-\d{2}\b/g))
  assert.ok(cited.size > 40)
  for (const id of cited) assert.match(knowledge, new RegExp(`\\b${id}\\b`), id)
  for (const track of tracks) assert.match(knowledge, new RegExp(`\\| ${track.area} \\| ${track.areaName} \\|`), track.area)
})

test('every starter file the guide cites exists', () => {
  const cited = ['InvoiceStore.cs', 'EventLogErrorLogger.cs', 'OrdersController.cs', 'Web.config', 'database/003-stockpilot-exchange.sql', 'src/Northwind.OrderDesk.sln', 'src/Northwind.OrderDesk.Tests/PricingServiceTests.cs', 'tools/ready.ps1', 'tools/ready.sh']
  for (const name of cited) assert.ok(guideText.includes(name) || [readyScript.text, readyScript.bash].join().includes(name.replace('/', '\\')) || name.startsWith('tools/'), `guide mentions ${name}`)
  for (const name of cited) assert.ok(starterFiles.some(file => file.path.endsWith(name)), `starter has ${name}`)
  const legacy = starterText('database/003-stockpilot-exchange.sql')
  for (const blocker of ['xp_cmdshell', 'BULK INSERT', 'SQL Server Agent']) assert.ok(legacy.includes(blocker), blocker)
  assert.match(starterText('src/Northwind.OrderDesk.Web/Web.config'), /Integrated Security=SSPI[\s\S]*InvoiceSharePath[\s\S]*authentication mode="Windows"[\s\S]*sessionState mode="InProc"/)
})

test('the legacy suite has the 28 tests the guide promises', () => {
  const count = starterFiles.filter(file => file.path.startsWith('src/Northwind.OrderDesk.Tests/'))
    .reduce((total, file) => total + (file.content.match(/\[TestMethod\]/g) ?? []).length, 0)
  assert.equal(count, 28)
  assert.match(guideText, /28 tests/)
})

test('the starter is clean, normalized and checks the latest HVE Squad release', () => {
  const paths = starterFiles.map(file => file.path)
  for (const required of ['README.md', '.gitignore', '.gitattributes', '.github/copilot-instructions.md', 'knowledge-docs/business-case.md', 'src/Northwind.OrderDesk.sln', 'tools/ready.ps1', 'tools/ready.sh']) {
    assert.ok(paths.includes(required), required)
  }
  assert.ok(!paths.some(path => /(^|\/)(bin|obj|packages|\.vs|\.git)\//.test(path)))
  for (const file of starterFiles) {
    if (/\.(ps1|sln)$/.test(file.path)) assert.ok(!/[^\r]\n/.test(file.content), `${file.path} uses CRLF`)
    else assert.ok(!file.content.includes('\r'), `${file.path} uses LF`)
    assert.doesNotMatch(file.content, /\{\{HVE_SQUAD_/, `${file.path} has no unresolved release placeholder`)
  }
  const minor = squadVersion.split('.').slice(0, 2).join('.')
  for (const script of ['tools/ready.ps1', 'tools/ready.sh']) {
    assert.match(starterText(script), /git tag starter/)
    assert.match(starterText(script), /refs\/tags\/starter/, `${script} repairs a missing tag`)
    assert.match(starterText(script), /commit\.gpgsign=false/, `${script} never prompts for signing`)
    assert.ok(starterText(script).includes(`${minor}.*`), `${script} accepts ${minor}.x`)
    assert.ok(starterText(script).includes(`the guide is built for ${squadVersion}`), `${script} names ${squadVersion}`)
  }
  assert.equal(applyRelease('{{HVE_SQUAD_MINOR}}.* / {{HVE_SQUAD_VERSION}}', '1.2.3'), '1.2.* / 1.2.3')
  assert.ok(guideText.includes('git diff starter'))
})

test('the starter zip is a valid archive with matching checksums', () => {
  const zip = createZip(starterFiles)
  const end = zip.length - 22
  assert.equal(zip.readUInt32LE(end), 0x06054b50)
  assert.equal(zip.readUInt16LE(end + 10), starterFiles.length)
  let offset = zip.readUInt32LE(end + 16)
  for (const file of starterFiles) {
    assert.equal(zip.readUInt32LE(offset), 0x02014b50)
    const nameLength = zip.readUInt16LE(offset + 28)
    const name = zip.subarray(offset + 46, offset + 46 + nameLength).toString('utf8')
    assert.equal(name, `${starterFolder}/${file.path}`)
    const local = zip.readUInt32LE(offset + 42)
    const size = zip.readUInt32LE(local + 18)
    const data = zip.subarray(local + 30 + zip.readUInt16LE(local + 26), local + 30 + zip.readUInt16LE(local + 26) + size)
    assert.equal(zip.readUInt16LE(local + 8), 0)
    assert.equal(crc32(data), zip.readUInt32LE(local + 14), name)
    assert.equal(data.toString('utf8'), file.content)
    offset += 46 + nameLength
  }
})

test('the guide targets one HVE Squad release, everywhere', async () => {
  assert.match(squadVersion, /^\d+\.\d+\.\d+$/)
  assert.equal(squadVersion, hveSquadRelease.version)
  assert.equal(squadReleaseUrl, `https://github.com/Peter-N91/hve-squad/releases/tag/v${squadVersion}`)
  assert.match(installation.apm.text, new RegExp(`hve-squad#v${squadVersion.replaceAll('.', '\\.')}`))
  assert.match(installation.cli.text, /hve-squad-hve-core@hve-squad-plugin/)
  assert.ok(sources.some(source => source.url === squadReleaseUrl))
  assert.ok(prerequisites.some(item => item.what === `HVE Squad ${squadVersion}`))
  const committed = await readCommittedRelease()
  assert.deepEqual(committed, { ...hveSquadRelease })
  assert.equal(renderReleaseModule(committed), (await readFile(new URL('../src/hve-squad-release.ts', import.meta.url), 'utf8')).replace(/\r\n/g, '\n'))
  const release = { tag_name: 'v9.8.7', html_url: 'https://github.com/Peter-N91/hve-squad/releases/tag/v9.8.7', published_at: '2027-01-01T00:00:00Z', draft: false, prerelease: false }
  assert.deepEqual(parseRelease(release), { version: '9.8.7', tag: 'v9.8.7', url: release.html_url, publishedAt: release.published_at })
  assert.throws(() => parseRelease({ ...release, prerelease: true }), /pre-release/)
  assert.throws(() => parseRelease({ ...release, tag_name: 'v0.19.0-pre' }), /unexpected release tag/)
})

test('sources are https and the prerequisites are tied to their part or track', () => {
  const pwsh = prerequisites.find(item => item.what.startsWith('PowerShell 7'))
  assert.equal(pwsh?.scope, 'everyone')
  assert.match(pwsh.mac, /brew install --cask powershell/)
  assert.match(starterText('tools/ready.ps1'), /'PowerShell 7\+' 'All parts'/)
  assert.match(starterText('tools/ready.sh'), /command -v pwsh[\s\S]*"PowerShell 7\+" "All parts"/)
  for (const source of sources) assert.match(source.url, /^https:\/\//)
  assert.equal(prerequisites.find(item => item.what === '.NET 10 SDK').track, 'dotnet')
  assert.equal(prerequisites.find(item => item.what === 'Azure CLI with Bicep').track, 'azure')
})

test('the stylesheet uses the HVE Squad identity', async () => {
  const css = await readFile(new URL('../src/index.css', import.meta.url), 'utf8')
  for (const token of ['#2563eb', '#06b6d4', '#22c55e', '"Manrope"', '"Source Sans 3"', '"JetBrains Mono"', 'html[data-theme="dark"]', '@media print', '.track-option']) {
    assert.ok(css.includes(token), token)
  }
})
