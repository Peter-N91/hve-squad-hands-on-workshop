import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import {
  agenda, apmCliReleaseUrl, apmCliVersion, docsUrl, installation, lessons, lifecycleSteps, modeRule, modelGuidance,
  notNeeded, observationNote, prerequisites, pwshNote, routingNote, routingOptions, sources, squadVersion, troubleshooting,
} from './content'
import type { Lesson, LessonStep, Prompt, SquadKey } from './content'
import {
  agentSelection, clientLabels, clients, decodeState, defaults, fillNames, lessonCheckId, missingSetup, nextClient, progress,
  promptBlockers, publicationFields, publicationLabels, renderPrompt, setupCheckId, squadKeys, squadLabels, squadNameError,
  storageKey, themeKey, toggleCheck,
} from './state'
import type { PublicationField, SavedState, Settings } from './state'
import { canWriteFolders, downloadZip, getStarter, starterZipUrl } from './starter'

const base = import.meta.env.BASE_URL
const kindLabels: Record<Prompt['kind'], string> = {
  setup: 'Setup · no autopilot', work: 'Work · autopilot', question: 'Conversation · no autopilot', plain: 'Default Copilot · no squad', shell: 'Terminal',
}
const fieldHelp: Record<PublicationField | SquadKey, string> = {
  productSquad: 'The name the product team receives at promotion (Part 04). Keep the suggestion unless the squad registers another.',
  migrationSquad: 'Used in Part 04 to name the team and target its work request with squad="…".',
  modernizationSquad: 'Used in Part 05 to name the team and target its work request with squad="…".',
  organization: 'The part after dev.azure.com/ in your project URL. Not a token.',
  project: 'The Azure DevOps project the facilitator prepared.',
  participant: 'A short unique prefix for your work-item titles, e.g. "AB-".',
  documentTarget: 'Where the documents go: a repository path or Wiki page agreed with the facilitator.',
  process: 'Optional. Agile, Scrum or Basic. Leave empty and the squad reads it from the project.',
  area: 'Optional. Leave empty to use the project default.',
  iteration: 'Optional. Leave empty to use the project default.',
}

function readInitial() {
  try {
    return { data: decodeState(localStorage.getItem(storageKey)), error: '' }
  } catch (error) {
    return {
      data: { schema: 1, checked: [], settings: { ...defaults } } satisfies SavedState,
      error: `Saved progress could not be read, so saving is paused to protect it. ${error instanceof Error ? error.message : String(error)}`,
    }
  }
}
function download(name: string, content: string) {
  const url = URL.createObjectURL(new Blob([content], { type: 'application/json' }))
  const link = document.createElement('a')
  link.href = url
  link.download = name
  link.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

function App() {
  const [initial] = useState(readInitial)
  const [saved, setSaved] = useState(initial.data)
  const [storageError, setStorageError] = useState(initial.error)
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(() => window.location.hash.slice(1) || 'overview')
  const [setupOpen, setSetupOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [focusMode, setFocusMode] = useState(false)
  const [resetOpen, setResetOpen] = useState(false)
  const [starterBusy, setStarterBusy] = useState(false)
  const [starterMessage, setStarterMessage] = useState('')
  const [theme, setTheme] = useState(() => document.documentElement.dataset.theme || 'light')
  const main = useRef<HTMLElement>(null)
  const resetDialog = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const handle = () => { setPage(window.location.hash.slice(1) || 'overview'); setMenuOpen(false); setStatus('') }
    window.addEventListener('hashchange', handle)
    return () => window.removeEventListener('hashchange', handle)
  }, [])
  useEffect(() => {
    main.current?.focus({ preventScroll: true })
    window.scrollTo({ top: 0, behavior: 'instant' })
  }, [page])
  useEffect(() => {
    if (resetOpen) resetDialog.current?.showModal()
    else resetDialog.current?.close()
  }, [resetOpen])
  useEffect(() => {
    document.documentElement.dataset.theme = theme
    try { localStorage.setItem(themeKey, theme) } catch { /* theme preference is optional */ }
  }, [theme])

  const settings = saved.settings
  const vscode = settings.experience === 'vscode'
  const stats = progress(saved.checked)
  const active = lessons.find(lesson => lesson.id === page)

  function persist(next: SavedState) {
    setSaved(next)
    if (storageError) return
    try {
      localStorage.setItem(storageKey, JSON.stringify(next))
    } catch (error) {
      setStorageError(`Progress could not be saved in this browser. Export it before leaving. ${error instanceof Error ? error.message : String(error)}`)
    }
  }
  const updateSetting = <K extends keyof Settings>(key: K, value: Settings[K]) => persist({ ...saved, settings: { ...settings, [key]: value } })
  const toggle = (id: string) => persist({ ...saved, checked: toggleCheck(id, saved.checked) })
  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text)
      setStatus('Copied. Paste it into your client in the northwind-workshop folder.')
    } catch {
      setStatus('The clipboard is not available here. Select the text and copy it manually.')
    }
  }
  async function fetchStarter() {
    setStarterBusy(true)
    setStarterMessage('')
    try {
      const result = await getStarter()
      if (result.kind === 'folder') setStarterMessage(`Done: ${result.count} files written to ${result.location}. Next: open a terminal in that folder and run the readiness check.`)
      else if (result.kind === 'zip') setStarterMessage('Your browser cannot write to folders, so the starter was downloaded as northwind-workshop.zip. Extract it where you want the workshop folder.')
      else if (result.kind === 'exists') setStarterMessage(`${result.location} already exists. Nothing was overwritten: choose another location or rename the existing folder.`)
      else setStarterMessage('No folder was chosen. Nothing was written.')
    } catch (error) {
      setStarterMessage(`Writing the folder failed (${error instanceof Error ? error.message : String(error)}). Download the zip instead.`)
    } finally {
      setStarterBusy(false)
    }
  }

  function routingPicker(context: string) {
    const current = routingOptions.find(option => option.value === settings.routing) ?? routingOptions[0]
    return <div className="routing-picker">
      <span className="routing-label">Model routing</span>
      <div className="segmented" role="radiogroup" aria-label={`Model routing (${context})`}>
        {routingOptions.map(option => <button type="button" role="radio" key={option.value} aria-checked={settings.routing === option.value}
          title={option.detail} onClick={() => updateSetting('routing', option.value)}>{option.label}</button>)}
      </div>
      <span className="routing-summary"><code>routing="{current.value}"</code> — {current.summary}</span>
    </div>
  }

  function promptBlock(prompt: Prompt) {
    const blockers = promptBlockers(prompt, settings, saved.checked)
    let text: string
    try {
      text = renderPrompt(prompt, settings)
    } catch (error) {
      text = prompt.kind === 'shell' ? prompt.text : fillNames(prompt.text, settings)
      const message = error instanceof Error ? error.message : String(error)
      if (!blockers.includes(message)) blockers.push(message)
    }
    const shell = prompt.kind === 'shell'
    const agent = shell ? undefined : agentSelection(prompt, settings)
    const needsSettings = blockers.some(item => item.includes('Session setup') || item.includes('team name'))
    return <div className="prompt-block">
      <div className="prompt-toolbar">
        <span className={`kind ${prompt.kind}`}>{kindLabels[prompt.kind]}</span>
        <button type="button" disabled={blockers.length > 0} onClick={() => copy(text)}>{shell && prompt.bash ? 'Copy PowerShell' : 'Copy'}</button>
      </div>
      <h4>{prompt.title}</h4>
      {agent && <p className="agent-hint">{agent.instruction}</p>}
      {prompt.kind === 'work' && routingPicker(prompt.title)}
      {shell && prompt.bash && <p className="shell-label">Windows · PowerShell</p>}
      <pre tabIndex={0}><code>{text}</code></pre>
      {shell && prompt.bash && <>
        <p className="shell-label">macOS / Linux · bash <button type="button" onClick={() => copy(prompt.bash!)}>Copy bash</button></p>
        <pre tabIndex={0}><code>{prompt.bash}</code></pre>
      </>}
      {blockers.length > 0 && <div className="prompt-warning" role="note">
        Copy unlocks when:
        <ul>{blockers.map(item => <li key={item}>{item}</li>)}</ul>
        {missingSetup(prompt, saved.checked).slice(0, 1).map(step => <a key={step.id} href={`#${step.lessonId}`}>Go to “{step.title}”</a>)}
        {missingSetup(prompt, saved.checked).length === 0 && (prompt.requiresChecks ?? []).filter(id => !saved.checked.includes(id)).slice(0, 1).map(id => <a key={id} href={`#${id.slice(0, id.lastIndexOf('-'))}`}>Go to that checkpoint</a>)}
        {needsSettings && <button type="button" onClick={() => { setSetupOpen(true); window.scrollTo({ top: 0, behavior: 'smooth' }) }}>Open Session setup</button>}
      </div>}
    </div>
  }
  function exercise(step: LessonStep, index: number) {
    return <div className="exercise" key={step.title}>
      <div className="step-index">{String(index + 1).padStart(2, '0')}</div>
      <div><h2>{step.title}</h2><p>{step.body}</p>{step.prompt && promptBlock(step.prompt)}</div>
    </div>
  }
  const starterPanel = (heading = 'Get the starter solution') => <section className="starter-panel" aria-label="Starter solution">
    <div>
      <h2>{heading}</h2>
      <p>One click gives you the complete Northwind workshop folder: the business case, the engineering standards, the legacy .NET Framework 4.8 Order Desk with its 28 tests, the database scripts and a readiness check. {canWriteFolders() ? 'You choose where it goes on your computer.' : 'Your browser will download it as a zip file.'}</p>
      {starterMessage && <p className="starter-result" role="status">{starterMessage}</p>}
      {canWriteFolders() && <p className="small">Prefer a zip? <a href={starterZipUrl()} download onClick={event => { event.preventDefault(); downloadZip() }}>Download northwind-workshop.zip</a></p>}
    </div>
    <button type="button" className="button starter-button" disabled={starterBusy} onClick={fetchStarter}>{starterBusy ? 'Writing files…' : canWriteFolders() ? 'Choose a folder and get the starter' : 'Download the starter'}</button>
  </section>

  function installPanel(): ReactNode {
    return <section className="panel" aria-label="Install HVE Squad">
      <span className="eyebrow">Step 3 · {clientLabels[settings.experience]}</span>
      <h2>Install HVE Squad {squadVersion}</h2>
      {settings.experience === 'cli' && <>
        <p>Run these in any terminal. The pair must be installed together; do not also install the official hve-core plugin. <code>copilot plugin list</code> must show <code>hve-squad@hve-squad-plugin (v{squadVersion})</code>; the second entry shows HVE Core's own version, which is expected. Then start <code>copilot</code> inside the northwind-workshop folder and type <code>/agent</code>: you should see Squad Coordinator and Squad Federation Coordinator.</p>
        {promptBlock(installation.cli)}
        <details><summary>Installed for an earlier workshop? Update to v{squadVersion}</summary>
          <p>Update hve-squad, and remove then reinstall hve-squad-hve-core: a plain update keeps its old pinned commit.</p>
          {promptBlock(installation.cliUpdate)}
        </details>
      </>}
      {settings.experience === 'app' && <>
        <ol>
          <li>Open the Copilot App settings, then <strong>Plugins</strong>.</li>
          <li>Add the marketplace <code>Peter-N91/hve-squad-plugin</code>.</li>
          <li>Install both <code>hve-squad</code> and <code>hve-squad-hve-core</code>. Do not also install the official hve-core plugin.</li>
          <li>Check that hve-squad shows version <strong>{squadVersion}</strong>. If it shows an older version, update hve-squad, then remove and reinstall hve-squad-hve-core.</li>
          <li>Open the northwind-workshop folder and check the agent list for Squad Coordinator and Squad Federation Coordinator.</li>
        </ol>
        <p className="small">Labels can vary between App versions; see the <a href="https://peter-n91.github.io/hve-squad-plugin/install-desktop.html" target="_blank" rel="noreferrer">App installation guide</a>. A CLI installation does not install the App plugins.</p>
      </>}
      {vscode && <>
        <p>VS Code uses the APM package, which adds the <code>/squad</code> and <code>/squad-federation</code> prompts to the folder. APM must be <strong>exactly {apmCliVersion}</strong> — newer versions currently fail on this package. Install it with the command from the table above, sign in to GitHub (<code>gh auth login</code>) to avoid slow rate limits, then run this inside the northwind-workshop folder:</p>
        {promptBlock(installation.apm)}
        <p className="small">Reload VS Code, open Copilot Chat and type <code>/</code>. Choose the entries described as “Hands a request to…”, not the skills with the same name. <a href={apmCliReleaseUrl} target="_blank" rel="noreferrer">APM {apmCliVersion} release</a>.</p>
      </>}
    </section>
  }
  function mcpPanel(): ReactNode {
    const org = settings.organization.trim() || '<organization>'
    const url = `https://mcp.dev.azure.com/${org}`
    return <section className="panel" aria-label="Connect Azure DevOps">
      <span className="eyebrow">Official remote Azure DevOps MCP server · {clientLabels[settings.experience]}</span>
      <h2>Connect Azure DevOps</h2>
      {vscode && <><p>Create <code>.vscode/mcp.json</code> in the northwind-workshop folder, start the server from the MCP view and sign in with your work account when asked.</p>
        <pre tabIndex={0}><code>{JSON.stringify({ servers: { 'ado-remote-mcp': { url, type: 'http' } }, inputs: [] }, null, 2)}</code></pre></>}
      {settings.experience === 'cli' && <><p>In Copilot CLI run <code>/mcp add</code> and enter: name <code>ado</code>, type <strong>HTTP</strong>, URL <code>{url}</code>, tools <code>*</code>. Sign in when prompted. The equivalent entry in <code>~/.copilot/mcp-config.json</code> is:</p>
        <pre tabIndex={0}><code>{JSON.stringify({ mcpServers: { ado: { type: 'http', url, tools: ['*'] } } }, null, 2)}</code></pre></>}
      {settings.experience === 'app' && <p>Open the App's MCP server settings, add an <strong>HTTP</strong> server named <code>ado</code> with the URL <code>{url}</code>, and sign in with your work account when asked.</p>}
      <p className="small">Then, with no squad agent selected, ask “List my Azure DevOps projects”. Your organization must use Microsoft Entra ID. Never paste a token into a prompt or file. <a href="https://learn.microsoft.com/azure/devops/mcp-server/remote-mcp-server" target="_blank" rel="noreferrer">Microsoft Learn: remote MCP server</a>.</p>
    </section>
  }

  function renderLesson(lesson: Lesson, printOnly = false) {
    return <article key={lesson.id} className={printOnly ? 'lesson print-only' : 'lesson'} aria-label={lesson.title}>
      <div className="eyebrow">{lesson.eyebrow}<span>/</span>{lesson.minutes ? `${lesson.minutes} min` : 'self-paced'}</div>
      <div className="lesson-title"><span className="big-number">{lesson.number}</span><h1>{lesson.title}</h1></div>
      <p className="lead">{lesson.goal}</p>
      {lesson.optional && <div className="optional-banner"><strong>Optional.</strong> Its checkpoints do not count toward your core progress, and nothing later depends on it.</div>}
      <div className="concept"><strong>The idea</strong><p>{lesson.concept}</p></div>
      {lesson.id === 'prepare' && <>
        <section aria-label="Everything you need">
          <div className="section-heading"><h2>Everything you need, in one place</h2><span className="badge">Check once</span></div>
          <table className="prereq-table">
            <thead><tr><th>What</th><th>Why</th><th>When</th><th>Check</th><th className="os">Windows</th><th className="os">macOS</th></tr></thead>
            <tbody>{prerequisites.map(item => <tr key={item.what}>
              <td><strong>{item.what}</strong></td>
              <td>{item.why}</td>
              <td><span className={`scope ${item.scope}`}>{item.part}</span></td>
              <td><code>{item.check}</code></td>
              <td className="os"><code>{item.windows}</code></td>
              <td className="os"><code>{item.mac}</code></td>
            </tr>)}</tbody>
          </table>
          <p className="small">You do <strong>not</strong> need:</p>
          <ul className="not-needed">{notNeeded.map(item => <li key={item}>{item}</li>)}</ul>
          <p className="small">{pwshNote}</p>
        </section>
        {starterPanel('Step 1 · Get the starter solution')}
      </>}
      {lesson.id === 'orient' && <>
        <div className="rule-grid">
          <aside className="rule-box"><strong>{modeRule.title}</strong><p>{modeRule.body}</p></aside>
          <aside className="rule-box"><strong>{modelGuidance.title}</strong><p>{modelGuidance.body}</p></aside>
        </div>
        <section className="panel routing-panel" aria-label="Model routing">
          <span className="eyebrow">Your choice · added to every work request</span>
          <h2>Model routing: how each role's model is chosen</h2>
          <div className="routing-options">{routingOptions.map(option => <button type="button" key={option.value} className="routing-option" aria-pressed={settings.routing === option.value} onClick={() => updateSetting('routing', option.value)}>
            <code>routing="{option.value}"</code><strong>{option.summary}</strong><span>{option.detail}</span>
          </button>)}</div>
          <p className="small">{routingNote}</p>
        </section>
      </>}
      <section className="inputs"><h2>Have these ready</h2><ul>{lesson.inputs.map(input => <li key={input}>{input}</li>)}</ul></section>
      {lesson.setup && <section aria-label="Setup">
        <div className="section-caption">Setup first · confirm · then the work request</div>
        {lesson.setup.map(step => <section className="lifecycle-step" key={step.id}>
          <h2>{step.title}</h2>
          <p>{step.description}</p>
          {promptBlock(step.request)}
          <h3>What should happen</h3>
          <ul>{step.expected.map(item => <li key={item}>{item}</li>)}</ul>
          <label className="check-row setup-check">
            <input type="checkbox" checked={saved.checked.includes(setupCheckId(step.id))} disabled={missingSetup(step.request, saved.checked).length > 0} onChange={() => toggle(setupCheckId(step.id))} />
            <span>{step.checkpoint}</span>
          </label>
        </section>)}
      </section>}
      {lesson.id === 'ado' && mcpPanel()}
      {lesson.flow?.map(item => <section className="flow-step" key={item.heading}>
        <h2>{item.heading}</h2>
        <p>{item.hint}</p>
        {promptBlock(item.prompt)}
      </section>)}
      {lesson.answers && <section className="answers panel" aria-label="Business answers">
        <span className="eyebrow">You play Northwind · only when the squad asks</span>
        <h2>Business answers you can give</h2>
        <p className="small">Do not send these up front. Use them to answer the intake validator's questions consistently. Anything it does not ask about should appear in the documents as ASSUMPTION or OPEN.</p>
        <table><tbody>{lesson.answers.map(item => <tr key={item.question}><td>{item.question}</td><td>{item.answer}</td></tr>)}</tbody></table>
      </section>}
      {lesson.behaviors && <section className="behavior-panel" aria-label="What to observe">
        <span className="eyebrow">Observe · not part of the request</span>
        <h2>What the squad should do on its own</h2>
        <ul>{lesson.behaviors.map(item => <li key={item}>{item}</li>)}</ul>
        <p className="small">{observationNote}</p>
      </section>}
      {lesson.reviewKey && <section className="review-key" aria-label="Review key">
        <span className="eyebrow">Review key</span>
        <h2>{lesson.reviewKey.title}</h2>
        <p>{lesson.reviewKey.intro}</p>
        <ol>{lesson.reviewKey.items.map(item => <li key={item.label}><strong>{item.label}</strong>{item.detail}</li>)}</ol>
      </section>}
      <section aria-label="Steps">
        <div className="section-caption">{lesson.flow || lesson.setup ? 'Review and verify' : 'Steps'}</div>
        {lesson.steps.map((step, index) => <div key={step.title}>
          {exercise(step, index)}
          {lesson.id === 'prepare' && index === 2 && installPanel()}
        </div>)}
      </section>
      <div className="checkpoint-grid">
        <section className="evidence-card"><span className="eyebrow">Evidence</span><h2>Keep this</h2><ul>{lesson.evidence.map(item => <li key={item}>{item}</li>)}</ul></section>
        <section className="check-card"><span className="eyebrow">Your checkpoint</span><h2>Can you show it?</h2>
          {lesson.checks.map((item, index) => <label className="check-row" key={item}>
            <input type="checkbox" checked={saved.checked.includes(lessonCheckId(lesson.id, index))} onChange={() => toggle(lessonCheckId(lesson.id, index))} />
            <span>{item}</span>
          </label>)}
          <p className="small">Your own record, stored in this browser. It does not inspect your project.</p>
        </section>
      </div>
      <aside className="recovery"><h3>If you get stuck</h3><p>{lesson.recovery}</p></aside>
    </article>
  }

  const totalMinutes = agenda.reduce((total, item) => total + item.minutes, 0)
  const overview = <div className="overview">
    <section className="hero">
      <div className="eyebrow">Hands-on workshop · HVE Squad v{squadVersion}</div>
      <h1>From a business case to a <em>modernized app on Azure.</em></h1>
      <p className="lead">Build three cooperating squads in one repository. A product team turns Northwind's business case into a traceable backlog. An Azure team plans the migration. A .NET team upgrades the legacy application — and you review, answer and approve along the way.</p>
      <div className="hero-actions">
        <button type="button" className="button starter-button" disabled={starterBusy} onClick={fetchStarter}>{starterBusy ? 'Writing files…' : 'Get the starter solution'}</button>
        <a className="button" href="#prepare">Start with Part 00 →</a>
        <a className="button" href={docsUrl} target="_blank" rel="noreferrer">HVE Squad docs</a>
      </div>
      {starterMessage && <p className="starter-result" role="status">{starterMessage}</p>}
      <div className="hero-meta">
        <span><strong>~{Math.round(totalMinutes / 6) / 10} hours</strong>facilitated or self-paced</span>
        <span><strong>3 squads</strong>product · Azure · .NET</span>
        <span><strong>1 repository</strong>your evidence</span>
        <span><strong>0 deployments</strong>nothing touches Azure</span>
      </div>
    </section>
    <section className="card" aria-label="Journey">
      <div className="section-heading"><h2>One connected journey</h2><span className="badge">Single squad → federation</span></div>
      <div className="journey">
        <div><span>02</span><strong>Product</strong><small>Intake · BRD · PRD · MVE · backlog</small><em className="team-chip">{settings.productSquad}</em></div>
        <div className="optional"><span>03 · optional</span><strong>Azure DevOps</strong><small>Publish with approval</small></div>
        <div><span>04</span><strong>Azure migration</strong><small>Blockers · HLD/LLD · Bicep · cost</small><em className="team-chip">{settings.migrationSquad}</em></div>
        <div><span>05</span><strong>.NET modernization</strong><small>4.8 → .NET 10 · tests stay green</small><em className="team-chip">{settings.modernizationSquad}</em></div>
        <div><span>06</span><strong>Together</strong><small>Status across teams · resume</small></div>
      </div>
    </section>
    <div className="overview-grid">
      <section className="agenda-card">
        <div className="section-heading"><h2>Agenda</h2><span className="small">Durations, not clock times</span></div>
        {agenda.map(item => {
          const lesson = lessons.find(candidate => candidate.id === item.lesson)
          return <div className="agenda-row" key={item.title}>
            <span className="num">{lesson?.number ?? '—'}</span>
            {lesson ? <a href={`#${lesson.id}`}>{item.title}{item.optional && <span className="optional-tag">optional</span>}</a> : <span>{item.title}</span>}
            <span className="duration">{item.note ?? `${item.minutes} min`}</span>
          </div>
        })}
        <div className="agenda-total"><span>Live session</span><span>{Math.floor(totalMinutes / 60)} h {totalMinutes % 60} min</span></div>
      </section>
      <section className="outcome-card">
        <span className="eyebrow">The real finish line</span>
        <h2>Leave able to do it again.</h2>
        <p>You do not need a finished application. You need to show evidence, explain your decisions and resume the work later.</p>
        <ul>
          <li>Every requirement traceable to its source.</li>
          <li>Migration blockers found in the code, not guessed.</li>
          <li>Pricing tests green and unchanged on .NET 10.</li>
          <li>Three teams, one consistent picture.</li>
        </ul>
        <div className="inset"><strong>Northwind is fictitious.</strong><p>Every document and line of code in the starter is synthetic and safe to share.</p></div>
      </section>
    </div>
    <section className="feedback-note">
      <h2>Designed from participant feedback</h2>
      <ul>
        <li>One prerequisites list, each tool tied to the part that needs it.</li>
        <li>One button for a ready-to-use folder; no manual repository setup.</li>
        <li>Markdown business case: no PDF readers, Python or OCR.</li>
        <li>Identifiers on every fact, so invented or missing requirements are easy to spot.</li>
        <li>An intake validator checks the case for gaps before any document is drafted.</li>
        <li>Engineering standards that define structure, style and file locations.</li>
        <li>Azure DevOps optional, with the official remote MCP server.</li>
        <li>Review keys and terminal checks instead of trusting summaries.</li>
      </ul>
    </section>
  </div>

  const nextLesson = active ? lessons[lessons.indexOf(active) + 1] : undefined
  const previousLesson = active ? lessons[lessons.indexOf(active) - 1] : undefined
  const resources = <article className="resources">
    <div className="eyebrow">Keep moving, without guessing</div>
    <h1>Resources</h1>
    <p className="lead">Templates, fixes for common problems, and the sources behind every step.</p>
    {starterPanel()}
    <section><h2>Templates</h2><p>Blank templates for your own notes. Keep the filled copies in your northwind-workshop folder.</p>
      <a className="button primary" href={`${base}downloads/evidence-log.md`} download>Evidence log</a>
    </section>
    <section><h2>When something goes wrong</h2>{troubleshooting.map(([title, body]) => <details key={title}><summary>{title}</summary><p>{body}</p></details>)}</section>
    <section><h2>Sources</h2><ul className="source-list">{sources.map(source => <li key={source.url}><a href={source.url} target="_blank" rel="noreferrer">{source.name} ↗</a></li>)}</ul>
      <p className="small">HVE Squad logo and documentation identity are MIT licensed; Manrope, Source Sans 3 and JetBrains Mono are SIL Open Font License fonts. <a href={`${base}THIRD-PARTY-NOTICES.txt`}>Third-party notices</a>.</p>
    </section>
    <section><h2>Your browser data</h2><p>Progress and Session setup stay in this browser only. Nothing is sent anywhere. Export before switching computers.</p>
      <button type="button" onClick={() => download('hve-squad-workshop-progress.json', JSON.stringify(saved, null, 2))}>Export progress</button>
      <button type="button" className="danger" onClick={() => setResetOpen(true)}>Reset this guide's data</button>
    </section>
  </article>

  return <div className={focusMode ? 'app focus-mode' : 'app'}>
    <a className="skip-link" href="#main" onClick={event => { event.preventDefault(); main.current?.focus() }}>Skip to content</a>
    <header className="topbar">
      <a className="brand" href="#overview"><img src={`${base}hve-squad-logo.svg`} alt="" width="44" height="44" /><span><strong>HVE Squad</strong><small>Hands-on workshop</small></span></a>
      <div className="header-actions">
        <button type="button" aria-expanded={setupOpen} onClick={() => setSetupOpen(!setupOpen)}>Session setup</button>
        <a className="button" href={docsUrl} target="_blank" rel="noreferrer">Docs</a>
        <button type="button" aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} theme`} onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}>{theme === 'light' ? 'Dark' : 'Light'}</button>
        <button className="mobile-menu" type="button" aria-expanded={menuOpen} onClick={() => setMenuOpen(!menuOpen)}>Parts</button>
      </div>
    </header>
    {setupOpen && <section className="session-setup" aria-label="Session setup">
      <div className="setup-heading"><div><h2>Session setup</h2><p>Stored only in this browser. The guide uses these values to complete the requests you copy. Never enter passwords or tokens.</p></div><button type="button" onClick={() => setSetupOpen(false)}>Close</button></div>
      <div className="settings-group"><h3>Team names · Parts 04–06</h3><p className="small">Keep the suggestions unless a squad registers a different name; then type the registered name here.</p>
        <div className="settings-grid">{squadKeys.map(key => <label key={key}>{squadLabels[key]}
          <span className="help">{fieldHelp[key]}</span>
          <input value={settings[key]} maxLength={60} aria-invalid={!!squadNameError(settings[key])} onChange={event => updateSetting(key, event.target.value)} />
          {squadNameError(settings[key]) && <span role="alert">{squadNameError(settings[key])}</span>}
        </label>)}</div>
      </div>
      <div className="settings-group"><h3>Azure DevOps · Part 03 only (optional)</h3>
        <div className="settings-grid">{publicationFields.map(key => <label key={key}>{publicationLabels[key]}
          <span className="help">{fieldHelp[key]}</span>
          <input value={settings[key]} maxLength={300} onChange={event => updateSetting(key, event.target.value)} />
        </label>)}</div>
      </div>
    </section>}
    <div className="layout">
      <aside className={menuOpen ? 'sidebar open' : 'sidebar'} aria-label="Workshop navigation">
        <div className="sidebar-heading">Your journey</div>
        <nav>
          <a href="#overview" aria-current={page === 'overview' ? 'page' : undefined}><span className="nav-number">↗</span>Overview</a>
          {lessons.map(lesson => {
            const ids = [...lesson.checks.map((_, index) => lessonCheckId(lesson.id, index)), ...(lesson.setup ?? []).map(step => setupCheckId(step.id))]
            const done = ids.every(id => saved.checked.includes(id))
            return <a key={lesson.id} href={`#${lesson.id}`} aria-current={page === lesson.id ? 'page' : undefined}>
              <span className={done ? 'nav-number done' : 'nav-number'}>{done ? '✓' : lesson.number}</span>
              <span>{lesson.title}{lesson.optional && <span className="optional-tag">optional</span>}<small>{lesson.minutes ? `${lesson.minutes} min` : 'Before the session'}</small></span>
            </a>
          })}
          <a href="#resources" aria-current={page === 'resources' ? 'page' : undefined}><span className="nav-number">＋</span>Resources</a>
        </nav>
        <div className="progress-box">
          <div><strong>Your progress</strong><span>{stats.percent}%</span></div>
          <div className="progress-track" role="progressbar" aria-label="Core checkpoints completed" aria-valuemin={0} aria-valuemax={stats.coreTotal} aria-valuenow={stats.core}><span style={{ width: `${stats.percent}%` }} /></div>
          <p>{stats.core} of {stats.coreTotal} core checkpoints · {stats.optional} of {stats.optionalTotal} optional</p>
          <button type="button" onClick={() => download('hve-squad-workshop-progress.json', JSON.stringify(saved, null, 2))}>Export progress</button>
        </div>
      </aside>
      <main id="main" className="main-content" ref={main} tabIndex={-1}>
        <div className="content-toolbar">
          <div className="segmented" role="tablist" aria-label="Copilot client">{clients.map(value => <button
            type="button" role="tab" id={`client-${value}`} key={value} aria-selected={settings.experience === value} tabIndex={settings.experience === value ? 0 : -1}
            onClick={() => updateSetting('experience', value)}
            onKeyDown={event => {
              const next = nextClient(value, event.key)
              if (next) { event.preventDefault(); updateSetting('experience', next); document.getElementById(`client-${next}`)?.focus() }
            }}>{clientLabels[value]}</button>)}</div>
          <div><button type="button" aria-pressed={focusMode} onClick={() => setFocusMode(!focusMode)}>{focusMode ? 'Show navigation' : 'Focus view'}</button><button type="button" onClick={() => window.print()}>Print guide</button></div>
        </div>
        <p className="client-note">Your client: <strong>{clientLabels[settings.experience]}</strong>. Every request below is formatted for it{vscode ? ' as a /squad or /squad-federation command.' : ', to paste into the selected agent\'s chat.'} Work requests also carry <code>routing="{settings.routing}"</code> — change it below or in <a href="#orient">Part 01</a>.</p>
        {routingPicker('page')}
        {storageError && <div className="notice warning" role="alert">{storageError}<button type="button" onClick={() => setResetOpen(true)}>Reset options</button></div>}
        <div className="status" role="status" aria-live="polite">{status}</div>
        {page === 'overview' ? overview : active ? renderLesson(active) : page === 'resources' ? resources
          : <section><h1>Page not found</h1><p>This link does not match a part of the workshop.</p><a href="#overview">Back to the overview</a></section>}
        {active && <nav className="lesson-navigation" aria-label="Previous and next part">
          <a href={`#${previousLesson?.id ?? 'overview'}`}>← {previousLesson?.title ?? 'Overview'}</a>
          <a className="button primary" href={`#${nextLesson?.id ?? 'resources'}`}>{nextLesson?.title ?? 'Resources'} →</a>
        </nav>}
        {lessons.map(lesson => renderLesson(lesson, true))}
        <footer><span>HVE Squad hands-on workshop · Northwind Traders is fictitious</span><span>Built for HVE Squad v{squadVersion} · {lifecycleSteps.length} setup steps · {stats.coreTotal} core checkpoints</span></footer>
      </main>
    </div>
    <dialog ref={resetDialog} className="reset-dialog" aria-labelledby="reset-title" onClose={() => setResetOpen(false)}>
      <h2 id="reset-title">Reset this guide's data?</h2>
      <p>This removes your checkpoints and Session setup for this workshop from this browser. Your northwind-workshop folder is not touched.</p>
      <button autoFocus type="button" onClick={() => setResetOpen(false)}>Keep my data</button>{' '}
      <button type="button" className="danger" onClick={() => {
        try {
          localStorage.removeItem(storageKey)
          setSaved({ schema: 1, checked: [], settings: { ...defaults } })
          setStorageError('')
          setStatus('This guide\'s browser data was reset.')
        } catch (error) {
          setStatus(`Reset failed: ${error instanceof Error ? error.message : String(error)}`)
        }
        setResetOpen(false)
      }}>Reset</button>
    </dialog>
  </div>
}
export default App
