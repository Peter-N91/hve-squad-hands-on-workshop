import test from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { mkdtemp, mkdir, writeFile, rm, readdir } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { delimiter, join } from 'node:path'
import { collectStarter } from '../scripts/build-starter.mjs'
import { readCommittedRelease } from '../scripts/hve-squad-release.mjs'

const { version } = await readCommittedRelease()
const files = await collectStarter()
const current = `  hve-squad@hve-squad (v${version})`
const legacy = '  hve-squad@hve-squad-plugin (v0.18.1)\n  hve-squad-hve-core@hve-squad-plugin (v3.2.2)'
const cases = [
  { name: 'one current self-contained plugin', plugins: current, status: 'OK' },
  { name: 'version without the v prefix', plugins: current.replace('(v', '('), status: 'OK' },
  { name: 'old stable plugin', plugins: '  hve-squad@hve-squad (v0.19.2)', status: 'WRONG VERSION' },
  { name: 'different patch release', plugins: `  hve-squad@hve-squad (v${version.replace(/\d+$/, n => Number(n) + 1)})`, status: 'WRONG VERSION' },
  { name: 'retired pair', plugins: legacy, status: 'LEGACY' },
  { name: 'retired Core entry only', plugins: '  hve-squad-hve-core@hve-squad-plugin (v3.2.2)', status: 'LEGACY' },
  { name: 'mixed new and retired plugins', plugins: `${current}\n${legacy}`, status: 'LEGACY' },
  { name: 'no version', plugins: '  hve-squad@hve-squad', status: 'UNVERIFIED' },
  { name: 'unreadable version', plugins: '  hve-squad@hve-squad (unknown)', status: 'UNVERIFIED' },
  { name: 'prerelease on the stable identity', plugins: `  hve-squad@hve-squad (v${version}-pre.1)`, status: 'UNVERIFIED' },
  { name: 'preview marketplace is not stable', plugins: `  hve-squad@hve-squad-preview (v${version})`, status: 'MISSING' },
  { name: 'another plugin is not Squad', plugins: `  not-hve-squad@hve-squad (v${version})`, status: 'MISSING' },
  { name: 'nothing installed', plugins: 'No plugins installed.', status: 'MISSING' },
  { name: 'plugin list failed despite matching output', plugins: current, exitCode: 1, status: 'CHECK FAILED' },
]

const powershellHarness = `
function git {
  $global:LASTEXITCODE = 0
  if ($args[0] -eq '--version') { 'git version test' }
}
function copilot {
  $global:LASTEXITCODE = 0
  if ($args[0] -eq '--version') { 'copilot test' }
  else { $global:LASTEXITCODE = [int]$env:TEST_PLUGIN_EXIT; $env:TEST_PLUGINS }
}
function dotnet { $global:LASTEXITCODE = 0; '10.0.100' }
function az {
  $global:LASTEXITCODE = 0
  if ($args[0] -eq 'version') { '{"azure-cli":"1.0"}' }
  else { 'Bicep CLI version test' }
}
function uv { $global:LASTEXITCODE = 0; 'uv test' }
function dot { $global:LASTEXITCODE = 0; 'Graphviz test' }
function apm { $global:LASTEXITCODE = 0; 'apm 0.29.0' }
. (Join-Path $env:TEST_STARTER 'tools\\ready.ps1')
`

const runtimes = [
  { name: 'PowerShell', command: 'pwsh', powershell: true },
  ...(process.platform === 'win32' ? [{ name: 'Windows PowerShell 5.1', command: 'powershell.exe', powershell: true }] : []),
  { name: 'bash', command: process.platform === 'win32' ? 'C:\\Program Files\\Git\\bin\\bash.exe' : 'bash' },
]

for (const runtime of runtimes) {
  const probe = spawnSync(runtime.command, runtime.powershell ? ['-NoProfile', '-Command', '$PSVersionTable.PSVersion.ToString()'] : ['--version'], { encoding: 'utf8' })
  test(`${runtime.name}: packaged readiness script checks the stable self-contained plugin`, { skip: probe.error?.code === 'ENOENT' ? `${runtime.command} is not installed` : false }, async t => {
    assert.ifError(probe.error)
    assert.equal(probe.status, 0, probe.stderr)
    const root = await mkdtemp(join(tmpdir(), 'northwind-readiness-'))
    try {
      await mkdir(join(root, 'tools'))
      await mkdir(join(root, 'knowledge-docs'))
      await mkdir(join(root, 'bin'))
      await writeFile(join(root, 'knowledge-docs', 'business-case.md'), 'Synthetic readiness fixture')
      for (const file of files.filter(file => /^tools\/ready\.(ps1|sh)$/.test(file.path))) {
        await writeFile(join(root, ...file.path.split('/')), file.content)
      }
      if (!runtime.powershell) {
        const stubs = {
          git: '[ "$1" != "--version" ] || echo "git version test"\nexit 0',
          copilot: 'if [ "$1" = "--version" ]; then echo "copilot test"; else printf "%s\\n" "$TEST_PLUGINS"; exit "$TEST_PLUGIN_EXIT"; fi',
          dotnet: 'echo "10.0.100"',
          az: 'echo "Bicep CLI version test"',
          pwsh: 'echo "PowerShell 7 test"',
          uv: 'echo "uv test"',
          dot: 'echo "Graphviz test"',
          apm: 'echo "apm 0.29.0"',
        }
        for (const [name, body] of Object.entries(stubs)) {
          await writeFile(join(root, 'bin', name), `#!/usr/bin/env bash\n${body}\n`, { mode: 0o755 })
        }
      }
      for (const scenario of cases) {
        await t.test(scenario.name, () => {
          const result = spawnSync(runtime.command, runtime.powershell
            ? ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-Command', powershellHarness]
            : ['-c', 'export PATH="$(cd "$TEST_BIN" && pwd):$PATH"; source "$TEST_SCRIPT"', join(root, 'tools', 'ready.sh')], {
            cwd: root,
            encoding: 'utf8',
            timeout: 20000,
            env: {
              ...process.env,
              PATH: `${join(root, 'bin')}${delimiter}${process.env.PATH}`,
              TEST_STARTER: root,
              TEST_BIN: join(root, 'bin'),
              TEST_SCRIPT: join(root, 'tools', 'ready.sh'),
              TEST_PLUGINS: scenario.plugins,
              TEST_PLUGIN_EXIT: String(scenario.exitCode ?? 0),
              NO_COLOR: '1',
              TERM: 'dumb',
            },
          })
          assert.ifError(result.error)
          assert.equal(result.status, 0, result.stdout + result.stderr)
          const row = result.stdout.split(/\r?\n/).find(line => line.startsWith('HVE Squad plugin'))
          assert.ok(row, result.stdout)
          assert.match(row, new RegExp(`CLI client only\\s+${scenario.status}(?:\\s|$)`), result.stdout)
          if (scenario.status === 'OK') assert.match(result.stdout, /HVE Core bundled/)
          if (scenario.status === 'WRONG VERSION') assert.ok(result.stdout.includes(`the guide is built for ${version}`))
        })
      }
      assert.ok(!(await readdir(root)).includes('.git'), 'stubbed Git never creates or changes a repository')
    } finally {
      await rm(root, { recursive: true, force: true })
    }
  })
}
