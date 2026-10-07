// Packages starter/ into the files the "Get the starter solution" button delivers:
//   public/starter/manifest.json  - read by the browser to write files into a chosen folder
//   public/starter/<folder>.zip   - fallback download for browsers without folder access
// No dependencies: the zip uses the "stored" method with CRC-32 checksums.
// {{HVE_SQUAD_VERSION}} and {{HVE_SQUAD_MINOR}} in starter files become the release in
// src/hve-squad-release.ts, so the readiness check always expects the release the guide targets.
import { createHash } from 'node:crypto'
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join, relative, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { readCommittedRelease } from './hve-squad-release.mjs'

export const starterFolder = 'northwind-workshop'
const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const excluded = new Set(['bin', 'obj', 'packages', '.vs', '.git', 'TestResults', 'node_modules'])
const crlf = /\.(ps1|sln)$/i

export function normalize(path, text) {
  const lf = text.replace(/\r\n/g, '\n')
  return crlf.test(path) ? lf.replace(/\n/g, '\r\n') : lf
}

export function applyRelease(text, version) {
  return text.replaceAll('{{HVE_SQUAD_VERSION}}', version).replaceAll('{{HVE_SQUAD_MINOR}}', version.split('.').slice(0, 2).join('.'))
}

export async function collectStarter(dir = join(root, 'starter')) {
  const { version } = await readCommittedRelease()
  const files = []
  async function walk(current) {
    for (const entry of await readdir(current, { withFileTypes: true })) {
      if (excluded.has(entry.name)) continue
      const full = join(current, entry.name)
      if (entry.isDirectory()) await walk(full)
      else {
        const path = relative(dir, full).split(sep).join('/')
        files.push({ path, content: normalize(path, applyRelease(await readFile(full, 'utf8'), version)) })
      }
    }
  }
  await walk(dir)
  return files.sort((a, b) => a.path.localeCompare(b.path))
}

const crcTable = Array.from({ length: 256 }, (_, n) => {
  let c = n
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  return c >>> 0
})
export function crc32(bytes) {
  let c = 0xffffffff
  for (const byte of bytes) c = crcTable[(c ^ byte) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

// DOS date/time for 2026-10-01 00:00 keeps the archive reproducible.
const dosTime = 0
const dosDate = ((2026 - 1980) << 9) | (10 << 5) | 1

export function createZip(files, folder = starterFolder) {
  const locals = []
  const centrals = []
  let offset = 0
  for (const file of files) {
    const name = Buffer.from(`${folder}/${file.path}`, 'utf8')
    const data = Buffer.from(file.content, 'utf8')
    const crc = crc32(data)
    const local = Buffer.alloc(30)
    local.writeUInt32LE(0x04034b50, 0)
    local.writeUInt16LE(20, 4)
    local.writeUInt16LE(0x0800, 6)
    local.writeUInt16LE(0, 8)
    local.writeUInt16LE(dosTime, 10)
    local.writeUInt16LE(dosDate, 12)
    local.writeUInt32LE(crc, 14)
    local.writeUInt32LE(data.length, 18)
    local.writeUInt32LE(data.length, 22)
    local.writeUInt16LE(name.length, 26)
    local.writeUInt16LE(0, 28)
    locals.push(local, name, data)

    const central = Buffer.alloc(46)
    central.writeUInt32LE(0x02014b50, 0)
    central.writeUInt16LE(0x031e, 4)
    central.writeUInt16LE(20, 6)
    central.writeUInt16LE(0x0800, 8)
    central.writeUInt16LE(0, 10)
    central.writeUInt16LE(dosTime, 12)
    central.writeUInt16LE(dosDate, 14)
    central.writeUInt32LE(crc, 16)
    central.writeUInt32LE(data.length, 20)
    central.writeUInt32LE(data.length, 24)
    central.writeUInt16LE(name.length, 28)
    central.writeUInt32LE(file.path.endsWith('.sh') ? (0o100755 << 16) >>> 0 : (0o100644 << 16) >>> 0, 38)
    central.writeUInt32LE(offset, 42)
    centrals.push(central, name)
    offset += 30 + name.length + data.length
  }
  const centralSize = centrals.reduce((total, part) => total + part.length, 0)
  const end = Buffer.alloc(22)
  end.writeUInt32LE(0x06054b50, 0)
  end.writeUInt16LE(files.length, 8)
  end.writeUInt16LE(files.length, 10)
  end.writeUInt32LE(centralSize, 12)
  end.writeUInt32LE(offset, 16)
  return Buffer.concat([...locals, ...centrals, end])
}

export async function buildStarter(outDir = join(root, 'public', 'starter')) {
  const files = await collectStarter()
  const zip = createZip(files)
  const sha256 = createHash('sha256').update(zip).digest('hex')
  await mkdir(outDir, { recursive: true })
  await writeFile(join(outDir, `${starterFolder}.zip`), zip)
  await writeFile(join(outDir, 'manifest.json'), JSON.stringify({ folder: starterFolder, sha256, files }, null, 0))
  return { count: files.length, bytes: zip.length, sha256 }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const result = await buildStarter()
  console.log(`Starter packaged: ${result.count} files, ${result.bytes} bytes, sha256 ${result.sha256.slice(0, 12)}`)
}
