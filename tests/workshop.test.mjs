import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import {
  agenda, autopilotMode, installation, lessons, lifecycleSteps, readinessQuestion, readyScript, routingOptions, sources, squadVersion, suggestedSquads, troubleshooting,
} from '../src/content.ts'
import {
  agentSelection, checkLabel, coreCheckIds, decodeState, defaults, fillNames, missingSetup, optionalCheckIds, progress, promptBlockers,
  renderPrompt, setupCheckId, squadNameError, storageKey, toggleCheck,
} from '../src/state.ts'
import { collectStarter, crc32, createZip, starterFolder } from '../scripts/build-starter.mjs'

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

test('agenda covers every lesson in order and totals four and a half hours live', () => {
  const ordered = agenda.filter(item => item.lesson).map(item => item.lesson)
  assert.deepEqual(ordered, lessons.map(lesson => lesson.id))
  assert.equal(agenda.reduce((total, item) => total + item.minutes, 0), 270)
  assert.equal(agenda.at(-1).lesson, 'reflect')
  assert.equal(agenda.find(item => item.lesson === 'ado').optional, true)
})

test('every lesson is complete and uniquely identified', () => {
  assert.equal(new Set(lessons.map(lesson => lesson.id)).size, lessons.length)
  for (const lesson of lessons) {
    assert.ok(lesson.goal && lesson.concept && lesson.recovery, lesson.id)
    assert.ok(lesson.steps.length && lesson.checks.length && lesson.evidence.length && lesson.inputs.length, lesson.id)
  }
  assert.deepEqual(lessons.filter(lesson => lesson.optional).map(lesson => lesson.id), ['ado'])
})

test('setup steps form one chain: product → promote → migration → modernization', () => {
  assert.deepEqual(lifecycleSteps.map(step => step.id), ['product-team', 'promote', 'migration-team', 'modernization-team'])
  assert.deepEqual(missingSetup({ requiresSetup: ['modernization-team'] }, []).map(step => step.id), ['product-team', 'promote', 'migration-team', 'modernization-team'])
  assert.deepEqual(missingSetup({ requiresSetup: ['modernization-team'] }, ['setup:product-team', 'setup:promote']).map(step => step.id), ['migration-team', 'modernization-team'])
})

test('prompt metadata is consistent', () => {
  for (const prompt of allPrompts) {
    assert.ok(['setup', 'work', 'question', 'plain', 'shell'].includes(prompt.kind), prompt.title)
    if (prompt.kind === 'setup') {
      assert.ok(prompt.lifecycle, prompt.title)
      assert.ok(prompt.text.startsWith(`${prompt.lifecycle}\n\n`), prompt.title)
    } else assert.equal(prompt.lifecycle, undefined, prompt.title)
    if (prompt.squadTarget) assert.ok(prompt.entry === 'squad-federation' && prompt.kind === 'work', prompt.title)
    if (['setup', 'work', 'question'].includes(prompt.kind)) assert.ok(prompt.entry, prompt.title)
    if (prompt.kind !== 'shell') for (const match of prompt.text.matchAll(/\{(\w+)\}/g)) assert.ok(match[1] in suggestedSquads, `${prompt.title}: {${match[1]}}`)
  }
  const federationWork = allPrompts.filter(prompt => prompt.kind === 'work' && prompt.entry === 'squad-federation')
  assert.deepEqual(federationWork.map(prompt => prompt.squadTarget), ['migrationSquad', 'modernizationSquad'])
})

test('only work requests carry autopilot, for every client', () => {
  for (const experience of ['app', 'cli', 'vscode']) {
    const settings = { ...defaults, experience, organization: 'contoso', project: 'Northwind', participant: 'AB-', documentTarget: 'wiki:/Northwind' }
    for (const prompt of allPrompts) {
      const text = renderPrompt(prompt, settings)
      assert.equal(text.includes(autopilotMode), prompt.kind === 'work', `${experience} · ${prompt.title}`)
      assert.doesNotMatch(text, /\{(productSquad|migrationSquad|modernizationSquad)\}/, prompt.title)
    }
  }
})

test('App and CLI put the mode, routing and squad target on the first line', () => {
  const migration = lessons.find(lesson => lesson.id === 'migration').flow[0].prompt
  const text = renderPrompt(migration, defaults)
  assert.ok(text.startsWith(`${autopilotMode} routing="off" squad="azure-migration"\n\nPlan the move`), text.slice(0, 80))
  const promote = lifecycleSteps.find(step => step.id === 'promote').request
  assert.ok(renderPrompt(promote, { ...defaults, experience: 'app' }).startsWith('promote\n\n'))
})

test('every autopilot request carries the chosen routing, and nothing else does', () => {
  assert.deepEqual(routingOptions.map(option => option.value), ['off', 'ranked', 'manual'])
  for (const option of routingOptions) assert.ok(option.summary && option.detail, option.value)
  assert.equal(defaults.routing, 'off')
  for (const routing of ['off', 'ranked', 'manual']) {
    for (const experience of ['app', 'cli', 'vscode']) {
      const settings = { ...defaults, experience, routing, organization: 'contoso', project: 'Northwind', participant: 'AB-', documentTarget: 'wiki:/Northwind' }
      for (const prompt of allPrompts) {
        const text = renderPrompt(prompt, settings)
        const header = experience === 'vscode' ? text.slice(0, text.indexOf(' request=')) : text.split('\n')[0]
        if (prompt.kind === 'work') assert.ok(header.includes(`${autopilotMode} routing="${routing}"`), `${experience} ${routing} ${prompt.title}: ${header}`)
        else assert.doesNotMatch(text, /routing="/, `${experience} ${prompt.title}`)
      }
    }
  }
  const saved = decodeState(JSON.stringify({ schema: 1, checked: [], settings: { experience: 'cli', routing: 'manual' } }))
  assert.equal(saved.settings.routing, 'manual')
  assert.equal(decodeState(JSON.stringify({ schema: 1, checked: [], settings: { experience: 'cli' } })).settings.routing, 'off')
  assert.throws(() => decodeState(JSON.stringify({ schema: 1, checked: [], settings: { experience: 'cli', routing: 'fast' } })), /routing/)
})

test('the product lesson leaves intake to the squad', () => {
  const product = lessons.find(lesson => lesson.id === 'product')
  assert.equal(product.flow.length, 1)
  assert.equal(product.flow[0].prompt.kind, 'work')
  assert.ok(!allPrompts.some(prompt => prompt.kind === 'question' && prompt.entry === 'squad'))
  assert.match(product.flow[0].hint, /intake validator/)
  assert.doesNotMatch(product.flow[0].prompt.text, /answers I gave/)
  assert.ok(product.answers.length >= 5)
})

test('VS Code commands use the documented prompt inputs', () => {
  const vscode = { ...defaults, experience: 'vscode' }
  const productInit = renderPrompt(lifecycleSteps[0].request, vscode)
  assert.ok(productInit.startsWith('/squad request="init\\n\\n'), productInit)
  const migrationInit = renderPrompt(lifecycleSteps[2].request, vscode)
  assert.ok(migrationInit.startsWith('/squad-federation init request="Add a new team named \\"azure-migration\\"'), migrationInit)
  const promote = renderPrompt(lifecycleSteps[1].request, vscode)
  assert.ok(promote.startsWith('/squad-federation promote request="We want'), promote)
  const modernize = renderPrompt(lessons.find(lesson => lesson.id === 'modernize').flow[0].prompt, vscode)
  assert.ok(modernize.startsWith('/squad-federation mode="autopilot" routing="off" squad="dotnet-modernization" request="Modernize'), modernize)
  const work = renderPrompt(lessons.find(lesson => lesson.id === 'product').flow[0].prompt, vscode)
  const request = JSON.parse(work.slice(work.indexOf('request=') + 'request='.length))
  assert.match(request, /^Using knowledge-docs/)
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
  const migration = lessons.find(lesson => lesson.id === 'migration').flow[0].prompt
  assert.throws(() => renderPrompt(migration, { ...defaults, migrationSquad: 'Bad Name' }), /lowercase/)
  assert.ok(promptBlockers(migration, { ...defaults, migrationSquad: '' }, allChecked).some(item => item.includes('Migration team name')))
})

test('Azure DevOps publication needs the Session setup details and includes them', () => {
  const publish = lessons.find(lesson => lesson.id === 'ado').flow[0].prompt
  assert.throws(() => renderPrompt(publish, defaults), /Session setup needs/)
  const text = renderPrompt(publish, { ...defaults, organization: 'contoso', project: 'Northwind', participant: 'AB-', documentTarget: 'wiki:/Northwind', process: '' })
  assert.match(text, /Azure DevOps organization: "contoso"/)
  assert.match(text, /Participant prefix: "AB-"/)
  assert.doesNotMatch(text, /Process:/)
})

test('copy stays blocked until earlier setup is confirmed', () => {
  const modernize = lessons.find(lesson => lesson.id === 'modernize').flow[0].prompt
  assert.equal(promptBlockers(modernize, defaults, []).filter(item => item.startsWith('Confirm the setup')).length, 4)
  assert.deepEqual(promptBlockers(modernize, defaults, allChecked), [])
})

test('later teams wait for the outputs they build on', () => {
  const promote = lifecycleSteps.find(step => step.id === 'promote').request
  const modernizationInit = lifecycleSteps.find(step => step.id === 'modernization-team').request
  assert.deepEqual(promote.requiresChecks, ['product-3'])
  assert.deepEqual(modernizationInit.requiresChecks, ['migration-3'])
  for (const prompt of allPrompts) for (const id of prompt.requiresChecks ?? []) assert.ok(checkLabel(id).text, id)
  assert.match(checkLabel('product-3').text, /first release/)
  assert.match(checkLabel('migration-3').text, /application-change list/)
  const setupOnly = ['setup:product-team']
  assert.deepEqual(promptBlockers(promote, defaults, setupOnly), ['Part 02 checkpoint: "I agreed a first release and can explain what is out of it."'])
  assert.deepEqual(promptBlockers(promote, defaults, [...setupOnly, 'product-3']), [])
  assert.throws(() => checkLabel('product-99'), /Unknown checkpoint/)
})

test('unchecking a setup step also unchecks the steps that depend on it', () => {
  const all = lifecycleSteps.map(step => setupCheckId(step.id))
  assert.deepEqual(toggleCheck('setup:promote', all), ['setup:product-team'])
  assert.deepEqual(toggleCheck('product-0', ['setup:product-team']), ['setup:product-team', 'product-0'])
})

test('saved state is validated, deduplicated and filtered', () => {
  const state = decodeState(JSON.stringify({ schema: 1, checked: ['product-0', 'product-0', 'gone-9'], settings: { experience: 'app', project: 'X' } }))
  assert.deepEqual(state.checked, ['product-0'])
  assert.equal(state.settings.project, 'X')
  assert.equal(state.settings.migrationSquad, 'azure-migration')
  for (const raw of ['not json', '{}', 'null', '{"schema":2}', JSON.stringify({ schema: 1, checked: [1], settings: defaults }), JSON.stringify({ schema: 1, checked: [], settings: { ...defaults, experience: 'emacs' } })]) {
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
  const cited = new Set(guideText.match(/\b(BR|NFR|C|SM|CS|ES|OQ)-\d{2}\b/g))
  assert.ok(cited.size > 25)
  for (const id of cited) assert.match(knowledge, new RegExp(`\\b${id}\\b`), id)
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

test('the starter is clean, normalized and versioned', () => {
  const paths = starterFiles.map(file => file.path)
  for (const required of ['README.md', '.gitignore', '.gitattributes', '.github/copilot-instructions.md', 'knowledge-docs/business-case.md', 'src/Northwind.OrderDesk.sln', 'tools/ready.ps1', 'tools/ready.sh']) {
    assert.ok(paths.includes(required), required)
  }
  assert.ok(!paths.some(path => /(^|\/)(bin|obj|packages|\.vs|\.git)\//.test(path)))
  for (const file of starterFiles) {
    if (/\.(ps1|sln)$/.test(file.path)) assert.ok(!/[^\r]\n/.test(file.content), `${file.path} uses CRLF`)
    else assert.ok(!file.content.includes('\r'), `${file.path} uses LF`)
  }
  assert.match(starterText('tools/ready.ps1'), /git tag starter/)
  assert.match(starterText('tools/ready.sh'), /git tag starter/)
  for (const script of ['tools/ready.ps1', 'tools/ready.sh']) {
    assert.match(starterText(script), /refs\/tags\/starter/, `${script} repairs a missing tag`)
    assert.match(starterText(script), /commit\.gpgsign=false/, `${script} never prompts for signing`)
    assert.match(starterText(script), /WRONG VERSION[\s\S]*0\.18/, `${script} checks the plugin version`)
  }
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

test('sources are https and versions are consistent', () => {
  for (const source of sources) assert.match(source.url, /^https:\/\//)
  assert.equal(squadVersion, '0.18.0')
  assert.match(installation.apm.text, /hve-squad#v0\.18\.0/)
  assert.match(installation.cli.text, /hve-squad-hve-core@hve-squad-plugin/)
})

test('the stylesheet uses the HVE Squad identity', async () => {
  const css = await readFile(new URL('../src/index.css', import.meta.url), 'utf8')
  for (const token of ['#2563eb', '#06b6d4', '#22c55e', '"Manrope"', '"Source Sans 3"', '"JetBrains Mono"', 'html[data-theme="dark"]', '@media print']) {
    assert.ok(css.includes(token), token)
  }
})
