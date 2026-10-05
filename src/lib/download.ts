/** Saves a generated file on the device. Nothing is uploaded anywhere. */
export function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  link.rel = 'noopener'
  document.body.append(link)
  link.click()
  link.remove()
  // Give the browser time to start the download before releasing the file.
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000)
}
