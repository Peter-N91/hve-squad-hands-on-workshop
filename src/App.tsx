import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import {
  apmCliReleaseUrl, apmCliVersion, contentByLocale, legacyRepoMarketplace, localeLabels, locales,
  pluginId, pluginMarketplace, releaseName, squadReleaseUrl, squadVersion, startHereTerms,
} from './content.ts'
import type { Lesson, LessonStep, LifecycleStep, Locale, Prompt, SquadKey, Term } from './content.ts'
import {
  addTrack, agendaMinutes, agentSelection, chosenTracks, clientLabels, clients, decodeState, defaults, fillNames,
  langKey, lessonCheckId, lessonMinutes, missingSetup, newConversationHow, nextClient, pickTrack, progress,
  promptBlockers, promptTerms, publicationFields, renderPrompt, sessionTotals, setTrackMode, setupCheckId,
  squadNameError, storageKey, termById, termParts, themeKey, toggleCheck, visibleAgenda, visibleAnswers,
  visibleLessons, visiblePrerequisites,
} from './state.ts'
import type { SavedState, Settings } from './state.ts'
import { canWriteFolders, downloadZip, getStarter, starterZipUrl } from './starter.ts'

const base = import.meta.env.BASE_URL

function detectInitialLocale(hasSavedLanguage: boolean, savedLanguage: Locale): Locale {
  try {
    const param = new URLSearchParams(window.location.search).get('lang')
    if (param === 'en' || param === 'fr') return param
  } catch { /* ignore URL errors */ }
  if (hasSavedLanguage) return savedLanguage
  try {
    const stored = localStorage.getItem(langKey)
    if (stored === 'en' || stored === 'fr') return stored
  } catch { /* storage unavailable */ }
  if (typeof navigator !== 'undefined' && navigator.language?.toLowerCase().startsWith('fr')) return 'fr'
  return 'en'
}

function readInitial() {
  try {
    const raw = localStorage.getItem(storageKey)
    let hasSavedLanguage = false
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as { settings?: { language?: unknown } }
        hasSavedLanguage = parsed?.settings?.language === 'en' || parsed?.settings?.language === 'fr'
      } catch { /* decodeState handles invalid JSON below */ }
    }
    const decoded = decodeState(raw)
    const language = detectInitialLocale(hasSavedLanguage, decoded.settings.language)
    return { data: { ...decoded, settings: { ...decoded.settings, language } }, error: '' }
  } catch (error) {
    const language = detectInitialLocale(false, 'en')
    const ui = contentByLocale(language).ui
    return {
      data: { schema: 1, checked: [], settings: { ...defaults, tracks: [...defaults.tracks], language } } satisfies SavedState,
      error: ui.storageReadError(error instanceof Error ? error.message : String(error)),
    }
  }
}

function syncDocumentLocale(lang: Locale, title: string, description: string) {
  document.documentElement.setAttribute('lang', lang)
  document.title = title
  document.querySelector('meta[name="description"]')?.setAttribute('content', description)
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

  const settings = saved.settings
  const lang = settings.language
  const bundle = contentByLocale(lang)
  const ui = bundle.ui

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
  useEffect(() => {
    syncDocumentLocale(lang, ui.pageTitle, ui.metaDescription)
    try { localStorage.setItem(langKey, lang) } catch { /* language preference is optional */ }
  }, [lang, ui.metaDescription, ui.pageTitle])

  const vscode = settings.experience === 'vscode'
  const stats = progress(saved.checked, settings)
  const visible = visibleLessons(settings)
  const active = visible.find(lesson => lesson.id === page)
  const hiddenLesson = active ? undefined : bundle.lessons.find(lesson => lesson.id === page)
  const chosen = chosenTracks(settings)
  const tx = (text: string) => fillNames(text, settings)
  const txList = (items: string[]) => items.map(tx).filter(item => item.trim())
  /** Turns [label](term:id) into a link to the docs section that explains the term. */
  const rich = (text: string): ReactNode => termParts(text, lang).map((part, index) => typeof part === 'string' ? part
    : <a key={index} className="term" href={part.term.url} target="_blank" rel="noreferrer" title={`${part.term.meaning} ${ui.opensDocsSuffix}`}>{part.label}</a>)
  const tr = (text: string) => rich(tx(text))

  function persist(next: SavedState) {
    setSaved(next)
    if (storageError) return
    try {
      localStorage.setItem(storageKey, JSON.stringify(next))
    } catch (error) {
      setStorageError(contentByLocale(next.settings.language).ui.storageWriteError(error instanceof Error ? error.message : String(error)))
    }
  }
  const updateSetting = <K extends keyof Settings>(key: K, value: Settings[K]) => persist({ ...saved, settings: { ...settings, [key]: value } })
  const updateSettings = (partial: Partial<Settings>) => persist({ ...saved, settings: { ...settings, ...partial } })
  const toggle = (id: string) => persist({ ...saved, checked: toggleCheck(id, saved.checked) })
  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text)
      setStatus(ui.copiedStatus)
    } catch {
      setStatus(ui.clipboardUnavailableStatus)
    }
  }
  async function fetchStarter() {
    setStarterBusy(true)
    setStarterMessage('')
    try {
      const result = await getStarter()
      if (result.kind === 'folder') setStarterMessage(ui.starterFolderDone(result.count, result.location))
      else if (result.kind === 'zip') setStarterMessage(ui.starterZipDone)
      else if (result.kind === 'exists') setStarterMessage(ui.starterExists(result.location))
      else setStarterMessage(ui.starterCancelled)
    } catch (error) {
      setStarterMessage(ui.starterFailed(error instanceof Error ? error.message : String(error)))
    } finally {
      setStarterBusy(false)
    }
  }

  function routingPicker(context: string) {
    const current = bundle.routingOptions.find(option => option.value === settings.routing) ?? bundle.routingOptions[0]
    return <div className="routing-picker">
      <span className="routing-label">{ui.routingLabel}</span>
      <div className="segmented" role="radiogroup" aria-label={ui.routingAria(context)}>
        {bundle.routingOptions.map(option => <button type="button" role="radio" key={option.value} aria-checked={settings.routing === option.value}
          title={option.detail} onClick={() => updateSetting('routing', option.value)}>{option.label}</button>)}
      </div>
      <span className="routing-summary"><code>routing="{current.value}"</code> — {current.summary}</span>
      {settings.routing === 'economy' && <span className="economy-hint">{ui.economyConsentHint}</span>}
    </div>
  }

  function depthPicker(context: string) {
    const current = bundle.depthOptions.find(option => option.value === settings.depth) ?? bundle.depthOptions[0]
    return <div className="routing-picker depth-picker">
      <span className="routing-label">{ui.depthLabel}</span>
      <div className="segmented" role="radiogroup" aria-label={ui.depthAria(context)}>
        {bundle.depthOptions.map(option => <button type="button" role="radio" key={option.value} aria-checked={settings.depth === option.value}
          title={option.detail} onClick={() => updateSetting('depth', option.value)}>{option.label}</button>)}
      </div>
      <span className="routing-summary"><code>depth="{current.value}"</code> — {current.summary}</span>
    </div>
  }

  function executionControls(context: string) {
    return <div className="execution-controls">
      {routingPicker(context)}
      {depthPicker(context)}
    </div>
  }

  function trackPicker(context: string, compact = false) {
    const mode = bundle.trackModeOptions.find(option => option.value === settings.trackMode) ?? bundle.trackModeOptions[0]
    return <section className={compact ? 'track-picker compact' : 'panel track-picker'} aria-label={ui.whatYouBuildAria(context)}>
      {!compact && <span className="eyebrow">{ui.whatYouBuildEyebrow}</span>}
      <h2>{compact ? ui.whatYouBuildCompactHeading : ui.whatYouBuildHeading}</h2>
      <div className="routing-picker">
        <span className="routing-label">{ui.tracksLabel}</span>
        <div className="segmented" role="radiogroup" aria-label={ui.tracksToBuildAria(context)}>
          {bundle.trackModeOptions.map(option => <button type="button" role="radio" key={option.value} aria-checked={settings.trackMode === option.value}
            title={option.summary} onClick={() => updateSettings(setTrackMode(settings, option.value))}>{option.label}</button>)}
        </div>
        <span className="routing-summary">{mode.summary}</span>
      </div>
      <div className="track-options" role={settings.trackMode === 'one' ? 'radiogroup' : 'group'} aria-label={ui.deliveryTracksAria(context)}>
        {bundle.tracks.map(track => {
          const on = settings.tracks.includes(track.id)
          const locked = settings.trackMode === 'all' || (settings.trackMode === 'selected' && on && settings.tracks.length === 1)
          const lesson = bundle.lessons.find(item => item.id === track.lessonId)
          return <label key={track.id} className={on ? 'track-option on' : 'track-option'}
            title={settings.trackMode === 'all' ? ui.trackLockedAllTitle : locked ? ui.trackLockedLastTitle : undefined}>
            <input type={settings.trackMode === 'one' ? 'radio' : 'checkbox'} name={`track-${context.replace(/\W+/g, '-')}`} checked={on} disabled={locked}
              onChange={() => updateSettings(pickTrack(settings, track.id))} />
            <span><strong>{track.label}</strong><small>{ui.partPrefix} {lesson?.number} · {track.area} {track.areaName}</small>
              {!compact && <em>{track.summary}</em>}
              <code>{releaseName(track, 1)}, {releaseName(track, 2)}…</code></span>
          </label>
        })}
      </div>
      <div className="routing-picker scope-picker">
        <span className="routing-label">{ui.productScopeLabel}</span>
        <div className="segmented" role="radiogroup" aria-label={ui.productScopeAria(context)}>
          {bundle.scopeOptions.map(option => <button type="button" role="radio" key={option.value} aria-checked={settings.scope === option.value}
            title={option.detail} onClick={() => updateSetting('scope', option.value)}>{option.label}</button>)}
        </div>
        <span className="routing-summary">{bundle.scopeOptions.find(option => option.value === settings.scope)?.summary}</span>
      </div>
      {!compact && <p className="small">{bundle.scopeOptions.find(option => option.value === settings.scope)?.detail} {bundle.trackNote}</p>}
    </section>
  }

  function termLinks(terms: Term[]) {
    return terms.map((term, index) => <span key={term.id}>{index > 0 && ' · '}<a className="term" href={term.url} target="_blank" rel="noreferrer" title={term.meaning}>{term.label}</a></span>)
  }

  function termsTable(ids: string[]) {
    return <table className="terms-table">
      <thead><tr><th>{ui.termColumn}</th><th>{ui.inOneSentenceColumn}</th></tr></thead>
      <tbody>{ids.map(id => {
        const term = termById(id, lang)
        return <tr key={id}><td><a className="term" href={term.url} target="_blank" rel="noreferrer">{term.label}</a></td><td>{term.meaning}</td></tr>
      })}</tbody>
    </table>
  }

  function readFirstPanel(context: string) {
    return <section className="panel read-first" aria-label={`${bundle.readFirst.title} (${context})`}>
      <span className="eyebrow">{bundle.readFirst.eyebrow}</span>
      <h2>{bundle.readFirst.title}</h2>
      <p>{bundle.readFirst.body}</p>
      <p><a className="button primary" href={bundle.conceptsUrl} target="_blank" rel="noreferrer">{bundle.readFirst.action} ↗</a></p>
      {termsTable(startHereTerms)}
    </section>
  }

  function lifecycleExplainer(step: LifecycleStep) {
    const info = step.request.lifecycle && bundle.lifecycleExplainers[step.request.lifecycle]
    if (!info) return null
    return <section className="does-box" aria-label={info.title}>
      <h3>{info.title}</h3>
      <div className="does-grid">
        <div><strong className="yes">{ui.doesLabel}</strong><ul>{info.does.map(item => <li key={item}>{item}</li>)}</ul></div>
        <div><strong className="no">{ui.doesNotLabel}</strong><ul>{info.doesNot.map(item => <li key={item}>{item}</li>)}</ul></div>
      </div>
    </section>
  }

  function setupQuestions(step: LifecycleStep) {
    if (!step.questions?.length) return null
    return <section className="questions" aria-label={ui.coordinatorQuestionsAria}>
      <h3>{ui.coordinatorQuestionsHeading}</h3>
      <p className="small">{ui.coordinatorQuestionsIntro}</p>
      <table><tbody>{step.questions.map(item => <tr key={item.ask}>
        <td>{item.ask}</td>
        <td>{tx(item.answer)}{item.terms && <span className="term-links"> {ui.readMoreLabel}: {termLinks(item.terms.map(id => termById(id, lang)))}</span>}</td>
      </tr>)}</tbody></table>
    </section>
  }

  function newConversationNote(step: LifecycleStep) {
    return <aside className="new-chat" aria-label={bundle.newConversation.title}>
      <strong>{bundle.newConversation.title}</strong>
      <p>{bundle.newConversation.why} <a className="term" href={termById('new-chat', lang).url} target="_blank" rel="noreferrer">{ui.readMoreLabel}</a></p>
      <p className="small">{newConversationHow(step.request, settings)}</p>
    </aside>
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
    const terms = shell ? [] : promptTerms(prompt, lang)
    const needsSettings = blockers.some(item =>
      item.includes(ui.sessionSetupHeading) || Object.values(ui.squadLabels).some(label => item.includes(label)))
    return <div className="prompt-block">
      <div className="prompt-toolbar">
        <span className={`kind ${prompt.kind}`}>{ui.kindLabels[prompt.kind]}</span>
        <button type="button" disabled={blockers.length > 0} onClick={() => copy(text)}>{shell && prompt.bash ? ui.copyPowerShellBtn : ui.copyBtn}</button>
      </div>
      <h4>{prompt.title}</h4>
      {agent && <p className="agent-hint">{agent.instruction}</p>}
      {terms.length > 0 && <p className="agent-hint term-links">{ui.termsInMessageLabel} {termLinks(terms)}</p>}
      {prompt.kind === 'work' && executionControls(prompt.title)}
      {shell && prompt.bash && <p className="shell-label">{ui.windowsPowerShellLabel}</p>}
      <pre tabIndex={0}><code>{text}</code></pre>
      {shell && prompt.bash && <>
        <p className="shell-label">{ui.macLinuxBashLabel} <button type="button" onClick={() => copy(prompt.bash!)}>{ui.copyBashBtn}</button></p>
        <pre tabIndex={0}><code>{prompt.bash}</code></pre>
      </>}
      {blockers.length > 0 && <div className="prompt-warning" role="note">
        {ui.copyUnlocksWhen}
        <ul>{blockers.map(item => <li key={item}>{item}</li>)}</ul>
        {missingSetup(prompt, saved.checked, settings).slice(0, 1).map(step => <a key={step.id} href={`#${step.lessonId}`}>{ui.goToStep(step.title)}</a>)}
        {missingSetup(prompt, saved.checked, settings).length === 0 && (prompt.requiresChecks ?? []).filter(id => !saved.checked.includes(id)).slice(0, 1).map(id => <a key={id} href={`#${id.slice(0, id.lastIndexOf('-'))}`}>{ui.goToCheckpoint}</a>)}
        {needsSettings && <button type="button" onClick={() => { setSetupOpen(true); window.scrollTo({ top: 0, behavior: 'smooth' }) }}>{ui.openSessionSetupBtn}</button>}
      </div>}
    </div>
  }
  function exercise(step: LessonStep, index: number) {
    return <div className="exercise" key={step.title}>
      <div className="step-index">{String(index + 1).padStart(2, '0')}</div>
      <div><h2>{step.title}</h2><p>{tr(step.body)}</p>{step.prompt && promptBlock(step.prompt)}</div>
    </div>
  }
  const starterPanel = (heading = ui.starterPanelDefaultHeading) => <section className="starter-panel" aria-label={ui.starterPanelDefaultHeading}>
    <div>
      <h2>{heading}</h2>
      <p>{ui.starterPanelBody(canWriteFolders())}</p>
      {starterMessage && <p className="starter-result" role="status">{starterMessage}</p>}
      {canWriteFolders() && <p className="small">{ui.preferZipPrefix} <a href={starterZipUrl()} download onClick={event => { event.preventDefault(); downloadZip() }}>{ui.downloadZipLink}</a></p>}
    </div>
    <button type="button" className="button starter-button" disabled={starterBusy} onClick={fetchStarter}>{starterBusy ? ui.writingFilesBtn : canWriteFolders() ? ui.chooseFolderBtn : ui.downloadStarterBtn}</button>
  </section>

  function installPanel(): ReactNode {
    const inst = bundle.installation
    return <section className="panel" aria-label={ui.installHeading(squadVersion)}>
      <span className="eyebrow">{ui.installStepEyebrow(clientLabels[settings.experience])}</span>
      <h2>{ui.installHeading(squadVersion)}</h2>
      <p className="small">{ui.installReleaseNotePrefix} <a href={squadReleaseUrl} target="_blank" rel="noreferrer">{ui.installReleaseNotesLink(squadVersion)}</a>.</p>
      {settings.experience === 'cli' && <>
        <p>{ui.cliInstallBody(pluginId, squadVersion)}</p>
        {promptBlock(inst.cli)}
        <details><summary>{ui.cliSwitchRepoSummary}</summary>
          <p>{ui.cliSwitchRepoBody(legacyRepoMarketplace, pluginMarketplace)}</p>
          {promptBlock(inst.cliSwitchRepo)}
        </details>
        <details><summary>{ui.cliUpdateSummary(squadVersion)}</summary>
          <p>{ui.cliUpdateBody}</p>
          {promptBlock(inst.cliUpdate)}
        </details>
        <details><summary>{ui.cliMigrateSummary}</summary>
          <p>{ui.cliMigrateBody}</p>
          {promptBlock(inst.cliMigrate)}
        </details>
      </>}
      {settings.experience === 'app' && <>
        <ol>{ui.appInstallSteps(pluginMarketplace, legacyRepoMarketplace, squadVersion).map(step => <li key={step}>{step}</li>)}</ol>
        <p className="small">{ui.appInstallNote.beforeLink}<a href={`${bundle.docsUrl}getting-started.html`} target="_blank" rel="noreferrer">{ui.appInstallNote.linkText}</a>{ui.appInstallNote.afterLink}</p>
      </>}
      {vscode && <>
        <p>{ui.vscodeInstallBody(pluginMarketplace, legacyRepoMarketplace, squadVersion)}</p>
        <p className="small">{ui.vscodeInstallNote}</p>
        <details><summary>{ui.vscodeApmSummary}</summary>
          <p>{ui.vscodeApmBody(apmCliVersion)}</p>
          {promptBlock(inst.apm)}
          <p className="small">{ui.vscodeApmFooter} <a href={apmCliReleaseUrl} target="_blank" rel="noreferrer">APM {apmCliVersion}</a>.</p>
        </details>
      </>}
    </section>
  }
  function mcpPanel(): ReactNode {
    const org = settings.organization.trim() || '<organization>'
    const url = `https://mcp.dev.azure.com/${org}`
    return <section className="panel" aria-label={ui.adoMcpHeading}>
      <span className="eyebrow">{ui.adoMcpEyebrow(clientLabels[settings.experience])}</span>
      <h2>{ui.adoMcpHeading}</h2>
      {vscode && <><p>{ui.adoMcpVscodeBody}</p>
        <pre tabIndex={0}><code>{JSON.stringify({ servers: { 'ado-remote-mcp': { url, type: 'http' } }, inputs: [] }, null, 2)}</code></pre></>}
      {settings.experience === 'cli' && <><p>{ui.adoMcpCliBody}</p>
        <pre tabIndex={0}><code>{JSON.stringify({ mcpServers: { ado: { type: 'http', url, tools: ['*'] } } }, null, 2)}</code></pre></>}
      {settings.experience === 'app' && <>
        <p>{ui.adoMcpAppBody}</p>
        <pre tabIndex={0}><code>{url}</code></pre>
      </>}
      <p className="small">{ui.adoMcpFooter.beforeLink}<a href="https://learn.microsoft.com/azure/devops/mcp-server/remote-mcp-server" target="_blank" rel="noreferrer">{ui.adoMcpFooter.linkText}</a>.</p>
    </section>
  }

  function renderLesson(lesson: Lesson, printOnly = false) {
    const mins = lessonMinutes(lesson, settings)
    return <article key={lesson.id} className={printOnly ? 'lesson print-only' : 'lesson'} aria-label={lesson.title}>
      <div className="eyebrow">{lesson.eyebrow}<span>/</span>{mins ? `${mins} ${ui.minutesSuffix}` : ui.selfPacedLabel}</div>
      <div className="lesson-title"><span className="big-number">{lesson.number}</span><h1>{lesson.title}</h1></div>
      <p className="lead">{tr(lesson.goal)}</p>
      <p className="timing-bar"><strong>{ui.timingBreakdownLabel}:</strong> {lesson.timing}</p>
      {lesson.optional && <div className="optional-banner"><strong>{ui.optionalBannerStrong}</strong> {ui.optionalBannerBody}</div>}
      <div className="concept"><strong>{ui.theIdeaLabel}</strong><p>{tr(lesson.concept)}</p></div>
      {lesson.id === 'prepare' && <>
        {readFirstPanel(printOnly ? 'Part 00, print' : 'Part 00')}
        <section aria-label={ui.prereqSectionHeading}>
          <div className="section-heading"><h2>{ui.prereqSectionHeading}</h2><span className="badge">{ui.prereqBadge}</span></div>
          <table className="prereq-table">
            <thead><tr><th>{ui.prereqColumns.what}</th><th>{ui.prereqColumns.why}</th><th>{ui.prereqColumns.when}</th><th>{ui.prereqColumns.check}</th><th className="os">{ui.prereqColumns.windows}</th><th className="os">{ui.prereqColumns.mac}</th></tr></thead>
            <tbody>{visiblePrerequisites(settings).map(item => <tr key={item.what}>
              <td><strong>{item.what}</strong></td>
              <td>{item.why}</td>
              <td><span className={`scope ${item.scope}`}>{item.part}</span></td>
              <td><code>{item.check}</code></td>
              <td className="os"><code>{item.windows}</code></td>
              <td className="os"><code>{item.mac}</code></td>
            </tr>)}</tbody>
          </table>
          <p className="small">{ui.notNeededIntro.before}<strong>{ui.notNeededIntro.strong}</strong>{ui.notNeededIntro.after}</p>
          <ul className="not-needed">{bundle.notNeeded.map(item => <li key={item}>{item}</li>)}</ul>
          <p className="small">{bundle.pwshNote}</p>
        </section>
        {starterPanel(ui.starterStep1Heading)}
      </>}
      {lesson.id === 'product' && trackPicker(printOnly ? 'Part 02, print' : 'Part 02')}
      {lesson.id === 'orient' && <>
        <div className="rule-grid">
          <aside className="rule-box"><strong>{bundle.modeRule.title}</strong><p>{rich(bundle.modeRule.body)}</p></aside>
          <aside className="rule-box"><strong>{bundle.modelGuidance.title}</strong><p>{bundle.modelGuidance.body}</p></aside>
        </div>
        <aside className="rule-box studio-box">
          <span className="eyebrow">{bundle.studioNote.eyebrow}</span>
          <strong>{bundle.studioNote.title}</strong>
          <p>{rich(bundle.studioNote.body)}</p>
        </aside>
        <section className="panel routing-panel" aria-label={ui.routingLabel}>
          <span className="eyebrow">{ui.routingPanelEyebrow}</span>
          <h2>{ui.routingPanelHeading}</h2>
          <div className="routing-options">{bundle.routingOptions.map(option => <button type="button" key={option.value} className="routing-option" aria-pressed={settings.routing === option.value} onClick={() => updateSetting('routing', option.value)}>
            <code>routing="{option.value}"</code><strong>{option.summary}</strong><span>{option.detail}</span>
          </button>)}</div>
          {settings.routing === 'economy' && <p className="small economy-hint">{ui.economyConsentHint}</p>}
          <p className="small">{bundle.routingNote}</p>
        </section>
        <section className="panel routing-panel" aria-label={ui.depthLabel}>
          <span className="eyebrow">{ui.depthPanelEyebrow}</span>
          <h2>{ui.depthPanelHeading}</h2>
          <div className="depth-options">{bundle.depthOptions.map(option => <button type="button" key={option.value} className="routing-option" aria-pressed={settings.depth === option.value} onClick={() => updateSetting('depth', option.value)}>
            <code>depth="{option.value}"</code><strong>{option.summary}</strong><span>{option.detail}</span>
          </button>)}</div>
          <p className="small">{bundle.depthNote}</p>
        </section>
      </>}
      <section className="inputs"><h2>{ui.haveTheseReadyHeading}</h2><ul>{txList(lesson.inputs).map(input => <li key={input}>{rich(input)}</li>)}</ul></section>
      {lesson.setup && <section aria-label="Setup">
        <div className="section-caption">{ui.setupSectionCaption}</div>
        {lesson.setup.map(step => <section className="lifecycle-step" key={step.id}>
          <h2>{step.title}</h2>
          <p>{tr(step.description)}</p>
          {lifecycleExplainer(step)}
          {promptBlock(step.request)}
          {setupQuestions(step)}
          <h3>{ui.whatShouldHappenHeading}</h3>
          <ul>{txList(step.expected).map(item => <li key={item}>{rich(item)}</li>)}</ul>
          {newConversationNote(step)}
          <label className="check-row setup-check">
            <input type="checkbox" checked={saved.checked.includes(setupCheckId(step.id))} disabled={missingSetup(step.request, saved.checked, settings).length > 0} onChange={() => toggle(setupCheckId(step.id))} />
            <span>{tx(step.checkpoint)}</span>
          </label>
        </section>)}
      </section>}
      {lesson.id === 'ado' && mcpPanel()}
      {lesson.flow?.map(item => <section className="flow-step" key={item.heading}>
        <h2>{item.heading}</h2>
        <p>{tr(item.hint)}</p>
        {promptBlock(item.prompt)}
      </section>)}
      {visibleAnswers(lesson.answers, settings).length > 0 && <section className="answers panel" aria-label={ui.businessAnswersHeading}>
        <span className="eyebrow">{ui.businessAnswersEyebrow}</span>
        <h2>{ui.businessAnswersHeading}</h2>
        <p className="small">{ui.businessAnswersIntro}</p>
        <table><tbody>{visibleAnswers(lesson.answers, settings).map(item => <tr key={item.question}><td>{item.question}</td><td>{item.answer}</td></tr>)}</tbody></table>
      </section>}
      {lesson.behaviors && <section className="behavior-panel" aria-label={ui.observeHeading}>
        <span className="eyebrow">{ui.observeEyebrow}</span>
        <h2>{ui.observeHeading}</h2>
        <ul>{txList(lesson.behaviors).map(item => <li key={item}>{rich(item)}</li>)}</ul>
        <p className="small">{bundle.observationNote}</p>
      </section>}
      {lesson.reviewKey && <section className="review-key" aria-label={ui.reviewKeyEyebrow}>
        <span className="eyebrow">{ui.reviewKeyEyebrow}</span>
        <h2>{lesson.reviewKey.title}</h2>
        <p>{tx(lesson.reviewKey.intro)}</p>
        <ol>{lesson.reviewKey.items.map(item => <li key={item.label}><strong>{item.label}</strong>{tx(item.detail)}</li>)}</ol>
      </section>}
      <section aria-label={ui.stepsCaption}>
        <div className="section-caption">{lesson.flow || lesson.setup ? ui.reviewAndVerifyCaption : ui.stepsCaption}</div>
        {lesson.steps.map((step, index) => <div key={step.title}>
          {exercise(step, index)}
          {lesson.id === 'prepare' && index === 2 && installPanel()}
        </div>)}
      </section>
      <div className="checkpoint-grid">
        <section className="evidence-card"><span className="eyebrow">{ui.evidenceEyebrow}</span><h2>{ui.evidenceHeading}</h2><ul>{txList(lesson.evidence).map(item => <li key={item}>{rich(item)}</li>)}</ul></section>
        <section className="check-card"><span className="eyebrow">{ui.checkpointEyebrow}</span><h2>{ui.checkpointHeading}</h2>
          {lesson.checks.map((item, index) => <label className="check-row" key={item}>
            <input type="checkbox" checked={saved.checked.includes(lessonCheckId(lesson.id, index))} onChange={() => toggle(lessonCheckId(lesson.id, index))} />
            <span>{tr(item)}</span>
          </label>)}
          <p className="small">{ui.checkpointBrowserNote}</p>
        </section>
      </div>
      <aside className="recovery"><h3>{ui.recoveryHeading}</h3><p>{tr(lesson.recovery)}</p></aside>
    </article>
  }

  const agendaItems = visibleAgenda(settings)
  const totals = sessionTotals(settings)
  const lessonNumber = (id: string) => bundle.lessons.find(lesson => lesson.id === id)?.number
  const hoursMeta = ui.overviewMetaHours(ui.formatHoursMinutes(totals.coreMinutes))
  const teamsMeta = ui.overviewMetaTeams(chosen.length + 1, chosen.map(track => track.label).join(' · '))
  const overview = <div className="overview">
    <section className="hero">
      <div className="eyebrow">{ui.overviewHeroEyebrow} · <a href={squadReleaseUrl} target="_blank" rel="noreferrer">HVE Squad v{squadVersion}</a> ({ui.overviewHeroLatest})</div>
      <h1>{ui.overviewHeroTitleBefore}<em>{ui.overviewHeroTitleEm}</em></h1>
      <p className="lead">{ui.overviewHeroLead}</p>
      <div className="hero-actions">
        <a className="button primary" href={bundle.conceptsUrl} target="_blank" rel="noreferrer">{bundle.readFirst.action} ↗</a>
        <button type="button" className="button starter-button" disabled={starterBusy} onClick={fetchStarter}>{starterBusy ? ui.writingFilesBtn : ui.starterPanelDefaultHeading}</button>
        <a className="button" href="#prepare">{ui.overviewStartPart00}</a>
      </div>
      {starterMessage && <p className="starter-result" role="status">{starterMessage}</p>}
      <div className="hero-meta">
        <span><strong>{hoursMeta.strong}</strong>{hoursMeta.sub}</span>
        <span><strong>{teamsMeta.strong}</strong>{teamsMeta.sub}</span>
        <span><strong>{ui.overviewMetaReleases.strong}</strong>{ui.overviewMetaReleases.sub}</span>
        <span><strong>{ui.overviewMetaZeroDeploy.strong}</strong>{ui.overviewMetaZeroDeploy.sub}</span>
      </div>
    </section>
    {readFirstPanel('overview')}
    {trackPicker('overview')}
    <section className="card" aria-label={ui.journeyHeading}>
      <div className="section-heading"><h2>{ui.journeyHeading}</h2><span className="badge">{ui.journeyBadge}</span></div>
      <div className="journey">
        <div><span>02</span><strong>{ui.journeyProductTitle}</strong><small>{ui.journeyProductSub}</small><em className="team-chip">{settings.productSquad}</em></div>
        <div className="optional"><span>{ui.journeyAdoSpan}</span><strong>{ui.journeyAdoTitle}</strong><small>{ui.journeyAdoSub}</small></div>
        {chosen.map(track => <div key={track.id} className="track-card"><span>{lessonNumber(track.lessonId)} · {track.area}</span><strong>{track.label}</strong><small>{track.produces}</small><code className="release-chip">{releaseName(track, 1)}, {releaseName(track, 2)}…</code><em className="team-chip">{settings[track.squadKey]}</em></div>)}
        <div><span>08</span><strong>{ui.journeyTogetherTitle}</strong><small>{ui.journeyTogetherSub}</small></div>
        <div className="optional"><span>{ui.journeyConnectorSpan}</span><strong>{ui.journeyConnectorTitle}</strong><small>{ui.journeyConnectorSub}</small></div>
      </div>
      <p className="small">{ui.journeyFootNote}</p>
    </section>
    <div className="overview-grid">
      <section className="agenda-card">
        <div className="section-heading"><h2>{ui.agendaHeading}</h2><span className="small">{ui.agendaSub(settings.depth)}</span></div>
        {agendaItems.map(item => {
          const lesson = bundle.lessons.find(candidate => candidate.id === item.lesson)
          const mins = agendaMinutes(item, settings)
          return <div className="agenda-row" key={`${item.lesson}-${item.title}`}>
            <span className="num">{lesson?.number ?? '—'}</span>
            {lesson ? <a href={`#${lesson.id}`}>{item.title}{item.optional && <span className="optional-tag">{ui.optionalBadge}</span>}</a> : <span>{item.title}</span>}
            <span className="duration">{item.note ?? `${mins} ${ui.minutesSuffix}`}</span>
          </div>
        })}
        <div className="agenda-total"><span>{ui.agendaCoreLiveTotal}</span><span>{ui.formatHoursMinutes(totals.coreMinutes)}</span></div>
        {totals.optionalMinutes > 0 && <div className="agenda-subtotal"><span>{ui.agendaWithOptionalTotal(totals.optionalMinutes)}</span><span>{ui.formatHoursMinutes(totals.totalMinutes)}</span></div>}
      </section>
      <section className="outcome-card">
        <span className="eyebrow">{ui.outcomeEyebrow}</span>
        <h2>{ui.outcomeHeading}</h2>
        <p>{ui.outcomeLead}</p>
        <ul>
          <li>{ui.outcomeFirstBullet}</li>
          {chosen.map(track => <li key={track.id}>{ui.outcomeTrackBullets[track.id]}</li>)}
          <li>{ui.outcomeTeamsBullet(chosen.length + 1)}</li>
        </ul>
        <div className="inset"><strong>{ui.fictitiousStrong}</strong><p>{ui.fictitiousBody}</p></div>
      </section>
    </div>
    <section className="feedback-note">
      <h2>{ui.feedbackHeading}</h2>
      <ul>{ui.feedbackBullets.map(item => <li key={item}>{item}</li>)}</ul>
    </section>
  </div>

  const nextLesson = active ? visible[visible.indexOf(active) + 1] : undefined
  const previousLesson = active ? visible[visible.indexOf(active) - 1] : undefined
  const hiddenTrack = bundle.tracks.find(track => track.id === hiddenLesson?.track)
  const hiddenPage = hiddenLesson && hiddenTrack && <section className="hidden-part">
    <div className="eyebrow">{hiddenLesson.eyebrow}</div>
    <h1>{ui.hiddenPartHeading(hiddenLesson.number)}</h1>
    <p className="lead">{ui.hiddenPartBody(hiddenTrack.label)}</p>
    <button type="button" className="button primary" onClick={() => updateSettings(addTrack(settings, hiddenTrack.id))}>{ui.addTrackBtn(hiddenTrack.label)}</button>{' '}
    <a className="button" href="#overview">{ui.backToOverview}</a>
  </section>

  const resources = <article className="resources">
    <div className="eyebrow">{ui.resourcesEyebrow}</div>
    <h1>{ui.resourcesHeading}</h1>
    <p className="lead">{ui.resourcesLead}</p>
    {starterPanel()}
    <section><h2>{ui.templatesHeading}</h2><p>{ui.templatesBody}</p>
      <a className="button primary" href={`${base}${ui.evidenceLogFile}`} download>{ui.evidenceLogBtn}</a>
    </section>
    <section><h2>{ui.whenWrongHeading}</h2>{bundle.troubleshooting.map(([title, body]) => <details key={title}><summary>{title}</summary><p>{rich(body)}</p></details>)}</section>
    <section><h2>{ui.sourcesHeading}</h2><ul className="source-list">{bundle.sources.map(source => <li key={`${source.name}-${source.url}`}><a href={source.url} target="_blank" rel="noreferrer">{source.name} ↗</a></li>)}</ul>
      <p className="small">{ui.noticesNote.beforeLink}<a href={`${base}THIRD-PARTY-NOTICES.txt`}>{ui.noticesNote.linkText}</a>.</p>
    </section>
    <section><h2>{ui.browserDataHeading}</h2><p>{ui.browserDataBody}</p>
      <button type="button" onClick={() => download('hve-squad-workshop-progress.json', JSON.stringify(saved, null, 2))}>{ui.exportProgressBtn}</button>
      <button type="button" className="danger" onClick={() => setResetOpen(true)}>{ui.resetDataBtn}</button>
    </section>
  </article>

  return <div className={focusMode ? 'app focus-mode' : 'app'}>
    <a className="skip-link" href="#main" onClick={event => { event.preventDefault(); main.current?.focus() }}>{ui.skipToContent}</a>
    <header className="topbar">
      <a className="brand" href="#overview"><img src={`${base}hve-squad-logo.svg`} alt="" width="44" height="44" /><span><strong>HVE Squad</strong><small>{ui.brandSubtitle}</small></span></a>
      <div className="header-actions">
        <div className="segmented lang-switch" role="group" aria-label={ui.languageLabel}>
          {locales.map(code => <button type="button" key={code} aria-pressed={lang === code} onClick={() => updateSetting('language', code)}>{localeLabels[code]}</button>)}
        </div>
        <button type="button" aria-expanded={setupOpen} onClick={() => setSetupOpen(!setupOpen)}>{ui.sessionSetupBtn}</button>
        <a className="button" href={bundle.docsUrl} target="_blank" rel="noreferrer">{ui.docsBtn}</a>
        <button type="button" aria-label={ui.switchThemeTo(theme === 'light' ? 'dark' : 'light')} onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}>{theme === 'light' ? ui.themeDark : ui.themeLight}</button>
        <button className="mobile-menu" type="button" aria-expanded={menuOpen} onClick={() => setMenuOpen(!menuOpen)}>{ui.mobilePartsBtn}</button>
      </div>
    </header>
    {setupOpen && <section className="session-setup" aria-label={ui.sessionSetupHeading}>
      <div className="setup-heading"><div><h2>{ui.sessionSetupHeading}</h2><p>{ui.sessionSetupIntro}</p></div><button type="button" onClick={() => setSetupOpen(false)}>{ui.closeBtn}</button></div>
      <div className="settings-group">{trackPicker('Session setup', true)}</div>
      <div className="settings-group"><h3>{ui.teamNamesHeading}</h3><p className="small">{ui.teamNamesIntro}</p>
        <div className="settings-grid">{(['productSquad', ...chosen.map(track => track.squadKey)] as SquadKey[]).map(key => <label key={key}>{ui.squadLabels[key]}
          <span className="help">{ui.fieldHelp[key]}</span>
          <input value={settings[key]} maxLength={60} aria-invalid={!!squadNameError(settings[key], lang)} onChange={event => updateSetting(key, event.target.value)} />
          {squadNameError(settings[key], lang) && <span role="alert">{squadNameError(settings[key], lang)}</span>}
        </label>)}</div>
      </div>
      <div className="settings-group"><h3>{ui.adoHeading}</h3>
        <div className="settings-grid">{publicationFields.map(key => <label key={key}>{ui.publicationLabels[key]}
          <span className="help">{ui.fieldHelp[key]}</span>
          <input value={settings[key]} maxLength={300} onChange={event => updateSetting(key, event.target.value)} />
        </label>)}</div>
      </div>
    </section>}
    <div className="layout">
      <aside className={menuOpen ? 'sidebar open' : 'sidebar'} aria-label="Workshop navigation">
        <div className="sidebar-heading">{ui.sidebarHeading}</div>
        <nav>
          <a href="#overview" aria-current={page === 'overview' ? 'page' : undefined}><span className="nav-number">↗</span>{ui.overviewNav}</a>
          {visible.map(lesson => {
            const ids = [...lesson.checks.map((_, index) => lessonCheckId(lesson.id, index)), ...(lesson.setup ?? []).map(step => setupCheckId(step.id))]
            const done = ids.every(id => saved.checked.includes(id))
            const mins = lessonMinutes(lesson, settings)
            return <a key={lesson.id} href={`#${lesson.id}`} aria-current={page === lesson.id ? 'page' : undefined}>
              <span className={done ? 'nav-number done' : 'nav-number'}>{done ? '✓' : lesson.number}</span>
              <span>{lesson.title}{lesson.optional && <span className="optional-tag">{ui.optionalBadge}</span>}<small>{mins ? `${mins} ${ui.minutesSuffix}` : ui.beforeSessionLabel}</small></span>
            </a>
          })}
          <a href="#resources" aria-current={page === 'resources' ? 'page' : undefined}><span className="nav-number">＋</span>{ui.resourcesNav}</a>
        </nav>
        <div className="progress-box">
          <div><strong>{ui.progressHeading}</strong><span>{stats.percent}%</span></div>
          <div className="progress-track" role="progressbar" aria-label={ui.coreCheckpointsAria} aria-valuemin={0} aria-valuemax={stats.coreTotal} aria-valuenow={stats.core}><span style={{ width: `${stats.percent}%` }} /></div>
          <p>{ui.progressSummary(stats.core, stats.coreTotal, stats.optional, stats.optionalTotal)}</p>
          <button type="button" onClick={() => download('hve-squad-workshop-progress.json', JSON.stringify(saved, null, 2))}>{ui.exportProgressBtn}</button>
        </div>
      </aside>
      <main id="main" className="main-content" ref={main} tabIndex={-1}>
        <div className="content-toolbar">
          <div className="segmented" role="tablist" aria-label={ui.clientTablistAria}>{clients.map(value => <button
            type="button" role="tab" id={`client-${value}`} key={value} aria-selected={settings.experience === value} tabIndex={settings.experience === value ? 0 : -1}
            onClick={() => updateSetting('experience', value)}
            onKeyDown={event => {
              const next = nextClient(value, event.key)
              if (next) { event.preventDefault(); updateSetting('experience', next); document.getElementById(`client-${next}`)?.focus() }
            }}>{clientLabels[value]}{value === 'cli' && <span className="optional-tag">{ui.recommendedBadge}</span>}</button>)}</div>
          <div><button type="button" aria-pressed={focusMode} onClick={() => setFocusMode(!focusMode)}>{focusMode ? ui.showNavBtn : ui.focusViewBtn}</button><button type="button" onClick={() => window.print()}>{ui.printGuideBtn}</button></div>
        </div>
        <p className="client-note">{ui.clientNotePrefix} <strong>{clientLabels[settings.experience]}</strong>. {bundle.clientAdvice[settings.experience]} {ui.clientNoteBody.beforePart}<a href="#orient">{ui.clientNoteBody.partLink}</a>{ui.clientNoteBody.afterPart}</p>
        {executionControls('page')}
        {storageError && <div className="notice warning" role="alert">{storageError}<button type="button" onClick={() => setResetOpen(true)}>{ui.resetOptionsBtn}</button></div>}
        <div className="status" role="status" aria-live="polite">{status}</div>
        {page === 'overview' ? overview : active ? renderLesson(active) : hiddenPage ? hiddenPage : page === 'resources' ? resources
          : <section><h1>{ui.pageNotFoundTitle}</h1><p>{ui.pageNotFoundBody}</p><a href="#overview">{ui.backToOverview}</a></section>}
        {active && <nav className="lesson-navigation" aria-label={ui.prevNextAria}>
          <a href={`#${previousLesson?.id ?? 'overview'}`}>← {previousLesson?.title ?? ui.overviewNav}</a>
          <a className="button primary" href={`#${nextLesson?.id ?? 'resources'}`}>{nextLesson?.title ?? ui.resourcesNav} →</a>
        </nav>}
        {visible.map(lesson => renderLesson(lesson, true))}
        <footer><span>{ui.footerLeft}</span><span>{ui.footerRight.builtFor} <a href={squadReleaseUrl} target="_blank" rel="noreferrer">HVE Squad v{squadVersion}</a>, {ui.footerRight.latestRelease} · {ui.footerRight.tracksLabel}: {chosen.map(track => track.label).join(', ')} · {stats.coreTotal} {ui.footerRight.checkpointsLabel}</span></footer>
      </main>
    </div>
    <dialog ref={resetDialog} className="reset-dialog" aria-labelledby="reset-title" onClose={() => setResetOpen(false)}>
      <h2 id="reset-title">{ui.resetDialogTitle}</h2>
      <p>{ui.resetDialogBody}</p>
      <button autoFocus type="button" onClick={() => setResetOpen(false)}>{ui.keepDataBtn}</button>{' '}
      <button type="button" className="danger" onClick={() => {
        try {
          localStorage.removeItem(storageKey)
          setSaved({ schema: 1, checked: [], settings: { ...defaults, tracks: [...defaults.tracks], language: lang } })
          setStorageError('')
          setStatus(ui.resetDoneStatus)
        } catch (error) {
          setStatus(`Reset failed: ${error instanceof Error ? error.message : String(error)}`)
        }
        setResetOpen(false)
      }}>{ui.confirmResetBtn}</button>
    </dialog>
  </div>
}
export default App
