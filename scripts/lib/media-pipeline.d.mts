// Vitest testinin TS altında tipli import edebilmesi için; gövde media-pipeline.mjs içinde.
export const VARIANT_WIDTHS: readonly number[];
export const MAX_FULL_WIDTH: number;
export const WEBP_QUALITY: number;
export const BLUR_WIDTH: number;
export const FOLDER_LABELS: Readonly<Record<string, string>>;
export const IMAGE_EXT: RegExp;
export const VIDEO_EXT: RegExp;
export function folderSlug(folderName: string): string;
export function contentHash(buffer: Uint8Array): string;
export function uuidFromHash(hex: string): string;
export function planWidths(originalWidth: number): { full: number; variants: number[] };
export function imagePaths(folder: string, hash: string): { full: string; variant: (w: number) => string };
export function videoPath(folder: string, fileName: string): string;
export function mimeFor(fileName: string): string;
export function altFor(folder: string): Record<string, string>;
export interface VideoMetadata { width: number | null; height: number | null; durationMs: number | null }
export function readMp4Metadata(buf: Buffer): VideoMetadata | null;
export function readVideoMetadata(buf: Buffer, fileName: string): VideoMetadata | null;
