// 03-SECURITY-KVKK › Sihirli bayt: uzantı ve MIME istemciden gelir, sahtelenebilir. Gerçek tür ilk baytlardan okunur.
export const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;

export interface DetectedType {
  readonly mime: 'image/jpeg' | 'image/png' | 'image/webp' | 'application/pdf' | 'video/mp4' | 'video/webm';
  readonly ext: 'jpg' | 'png' | 'webp' | 'pdf' | 'mp4' | 'webm';
  readonly isImage: boolean;
}

function startsWith(buf: Uint8Array, bytes: number[], offset = 0): boolean {
  return bytes.every((b, i) => buf[offset + i] === b);
}

/** Baytlardan tür; tanınmıyorsa null (reddedilir). */
export function detectFileType(buf: Uint8Array): DetectedType | null {
  if (startsWith(buf, [0xff, 0xd8, 0xff])) return { mime: 'image/jpeg', ext: 'jpg', isImage: true };
  if (startsWith(buf, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return { mime: 'image/png', ext: 'png', isImage: true };
  if (startsWith(buf, [0x52, 0x49, 0x46, 0x46]) && startsWith(buf, [0x57, 0x45, 0x42, 0x50], 8)) return { mime: 'image/webp', ext: 'webp', isImage: true };
  if (startsWith(buf, [0x25, 0x50, 0x44, 0x46, 0x2d])) return { mime: 'application/pdf', ext: 'pdf', isImage: false };
  if (startsWith(buf, [0x66, 0x74, 0x79, 0x70], 4)) return { mime: 'video/mp4', ext: 'mp4', isImage: false };
  if (startsWith(buf, [0x1a, 0x45, 0xdf, 0xa3])) return { mime: 'video/webm', ext: 'webm', isImage: false };
  return null;
}

/** Bildirilen MIME ile tespit uyuşmalı: "image/jpeg" diyen PNG bile reddedilir (tutarsızlık şüphelidir). */
export function mimeMatches(declared: string, detected: DetectedType): boolean {
  if (declared === detected.mime) return true;
  return declared === 'image/jpg' && detected.mime === 'image/jpeg';
}
