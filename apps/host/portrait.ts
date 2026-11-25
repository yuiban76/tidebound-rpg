// Checks a player's portrait before it is kept. Everyone in the room shows it, so a picture that unpacks into
// something enormous must never get that far; the data URL itself is already limited by the protocol.
import { createHash } from 'node:crypto'

const largest = 512

/** Width and height of a JPEG from its frame header, or undefined when the bytes are not a JPEG. */
export function jpegSize(bytes: Buffer) {
  if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) return undefined
  let at = 2
  while (at + 9 < bytes.length) {
    if (bytes[at] !== 0xff) return undefined
    const marker = bytes[at + 1]
    if (marker === 0xff) { at++; continue }
    // SOF0–SOF15, without the tables that share the range.
    if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker))
      return { height: bytes.readUInt16BE(at + 5), width: bytes.readUInt16BE(at + 7) }
    const length = bytes.readUInt16BE(at + 2)
    if (length < 2) return undefined
    at += 2 + length
  }
  return undefined
}

/** The revision a good picture is known by, or undefined when it must be refused. */
export function portraitRevision(image: string) {
  const bytes = Buffer.from(image.slice(image.indexOf(',') + 1), 'base64')
  const size = jpegSize(bytes)
  if (!size || Math.min(size.width, size.height) < 16 || Math.max(size.width, size.height) > largest) return undefined
  return createHash('sha256').update(bytes).digest('hex').slice(0, 16)
}
