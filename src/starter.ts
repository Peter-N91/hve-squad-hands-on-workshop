type StarterFile = { path: string; content: string }
type Manifest = { folder: string; sha256: string; files: StarterFile[] }

type WritableFile = { write(data: string): Promise<void>; close(): Promise<void> }
type FileHandle = { createWritable(): Promise<WritableFile> }
type DirectoryHandle = {
  name: string
  getDirectoryHandle(name: string, options?: { create?: boolean }): Promise<DirectoryHandle>
  getFileHandle(name: string, options?: { create?: boolean }): Promise<FileHandle>
  values(): AsyncIterable<unknown>
}
type PickerWindow = Window & {
  showDirectoryPicker?: (options?: { id?: string; mode?: 'read' | 'readwrite'; startIn?: string }) => Promise<DirectoryHandle>
}

export type StarterResult =
  | { kind: 'folder'; location: string; count: number }
  | { kind: 'zip' }
  | { kind: 'cancelled' }
  | { kind: 'exists'; location: string }

const base = () => import.meta.env.BASE_URL
export const starterZipUrl = () => `${base()}starter/northwind-workshop.zip`

export function canWriteFolders() {
  return typeof window !== 'undefined' && typeof (window as PickerWindow).showDirectoryPicker === 'function' && window.isSecureContext
}

export async function getStarter(): Promise<StarterResult> {
  if (!canWriteFolders()) {
    downloadZip()
    return { kind: 'zip' }
  }
  let parent: DirectoryHandle
  try {
    parent = await (window as PickerWindow).showDirectoryPicker!({ id: 'northwind-workshop', mode: 'readwrite', startIn: 'documents' })
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') return { kind: 'cancelled' }
    throw error
  }
  const response = await fetch(`${base()}starter/manifest.json`, { cache: 'no-store' })
  if (!response.ok) throw new Error(`The starter files could not be loaded (HTTP ${response.status}).`)
  const manifest = await response.json() as Manifest

  const location = `${parent.name}/${manifest.folder}`
  let target: DirectoryHandle
  try {
    await parent.getDirectoryHandle(manifest.folder)
    return { kind: 'exists', location }
  } catch (error) {
    if (!(error instanceof DOMException && error.name === 'NotFoundError')) throw error
    target = await parent.getDirectoryHandle(manifest.folder, { create: true })
  }

  for (const file of manifest.files) {
    const parts = file.path.split('/')
    let directory = target
    for (const segment of parts.slice(0, -1)) directory = await directory.getDirectoryHandle(segment, { create: true })
    const handle = await directory.getFileHandle(parts[parts.length - 1], { create: true })
    const writable = await handle.createWritable()
    await writable.write(file.content)
    await writable.close()
  }
  return { kind: 'folder', location, count: manifest.files.length }
}

export function downloadZip() {
  const link = document.createElement('a')
  link.href = starterZipUrl()
  link.download = 'northwind-workshop.zip'
  link.click()
}
