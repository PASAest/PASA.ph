import * as DocumentPicker from 'expo-document-picker';
import { File } from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import { Platform } from 'react-native';
import { supabase } from './supabase';

export type Picked = {
  uri: string;
  mimeType: string;
  name: string;
  kind: 'image' | 'video' | 'pdf';
  /** JPEG data straight from the picker (images only). Uploading this avoids reading the file at all. */
  base64?: string | null;
};

export class UploadError extends Error {}

const extFor = (mime: string) =>
  mime.includes('png') ? 'png' : mime.includes('pdf') ? 'pdf' : mime.includes('mp4') ? 'mp4' : mime.includes('quicktime') ? 'mov' : mime.includes('webp') ? 'webp' : mime.startsWith('video') ? 'mp4' : 'jpg';

/** Decodes base64 into bytes (atob is built into Hermes and browsers). */
function base64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

/** Reads a picked file into bytes, trying the most reliable method for each platform. */
async function readBytes(uri: string): Promise<Uint8Array> {
  if (Platform.OS !== 'web') {
    try {
      const file = new File(uri);
      if (file.exists && (file.size ?? 0) > 0) return file.bytes();
    } catch {
      // fall through to fetch
    }
  }
  const res = await fetch(uri);
  // Never upload an error page as if it were the photo (this is what produced 14-byte "File not found" uploads).
  if (!res.ok) throw new UploadError('Couldn’t read that file. Try choosing it again.');
  return new Uint8Array(await res.arrayBuffer());
}

/** Checks the bytes really are the kind of file we expect, by their signature. */
function looksValid(b: Uint8Array, kind: Picked['kind']) {
  if (b.length < 256) return false;
  const ascii = (from: number, len: number) => String.fromCharCode(...b.subarray(from, from + len));
  if (kind === 'pdf') return ascii(0, 4) === '%PDF';
  const jpeg = b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff;
  const png = b[0] === 0x89 && ascii(1, 3) === 'PNG';
  const webp = ascii(0, 4) === 'RIFF' && ascii(8, 4) === 'WEBP';
  const gif = ascii(0, 3) === 'GIF';
  const isoMedia = ascii(4, 4) === 'ftyp'; // HEIC/HEIF photos and MP4/MOV videos
  return kind === 'video' ? isoMedia : jpeg || png || webp || gif || isoMedia;
}

/** Opens the camera or photo library and returns one image (or video), or null if cancelled. */
export async function pickMedia(
  opts: { video?: boolean; aspect?: [number, number]; crop?: boolean; source?: 'library' | 'camera' } = {},
): Promise<Picked | null> {
  const options: ImagePicker.ImagePickerOptions = {
    mediaTypes: opts.video ? ['images', 'videos'] : ['images'],
    allowsEditing: opts.crop ?? !opts.video,
    aspect: opts.aspect ?? [1, 1],
    quality: 0.7,
    base64: !opts.video, // photos come back as JPEG data we can upload directly
    videoMaxDuration: 60,
  };
  if (opts.source === 'camera') {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) throw new UploadError('PASA needs camera access to take a photo. You can allow it in your phone’s Settings.');
  }
  const result = opts.source === 'camera' ? await ImagePicker.launchCameraAsync(options) : await ImagePicker.launchImageLibraryAsync(options);
  if (result.canceled) return null;
  const a = result.assets[0];
  const isVideo = a.type === 'video';
  return {
    uri: a.uri,
    // base64 from the picker is always JPEG, whatever the original format was
    mimeType: isVideo ? (a.mimeType ?? 'video/mp4') : a.base64 ? 'image/jpeg' : (a.mimeType ?? 'image/jpeg'),
    name: a.fileName ?? `media.${isVideo ? 'mp4' : 'jpg'}`,
    kind: isVideo ? 'video' : 'image',
    base64: a.base64 ?? null,
  };
}

/** Picks an ID, COR or CV: a photo or a PDF. */
export async function pickDocument(): Promise<Picked | null> {
  const result = await DocumentPicker.getDocumentAsync({ type: ['image/*', 'application/pdf'], copyToCacheDirectory: true });
  if (result.canceled) return null;
  const a = result.assets[0];
  const mime = a.mimeType ?? (a.name.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'image/jpeg');
  return { uri: a.uri, mimeType: mime, name: a.name, kind: mime === 'application/pdf' ? 'pdf' : 'image' };
}

async function put(bucket: string, path: string, file: Picked) {
  const bytes = file.base64 ? base64ToBytes(file.base64) : await readBytes(file.uri);
  if (!looksValid(bytes, file.kind)) {
    throw new UploadError(file.kind === 'pdf' ? 'That doesn’t look like a PDF. Try another file.' : 'Couldn’t read that photo. Try choosing it again, or pick a different one.');
  }
  // Every path is unique (timestamped), so no overwrite is needed.
  const { error } = await supabase.storage.from(bucket).upload(path, bytes, { contentType: file.mimeType, upsert: false });
  if (error) throw new UploadError(`Upload failed: ${error.message}`);
  return path;
}

/** Public photo (profile picture, listing photo). Returns its public URL. */
export async function uploadImage(file: Picked, userId: string) {
  const path = await put('photos', `${userId}/${Date.now()}.${extFor(file.mimeType)}`, file);
  return supabase.storage.from('photos').getPublicUrl(path).data.publicUrl;
}

/** Private verification document. Returns its storage path (viewable by the owner and admins only). */
export async function uploadDocument(file: Picked, userId: string, label: 'id' | 'cor' | 'cv') {
  return put('documents', `${userId}/${label}-${Date.now()}.${extFor(file.mimeType)}`, file);
}

/** Private chat photo or video, stored under the conversation. Returns its storage path. */
export async function uploadChatMedia(file: Picked, conversationId: string) {
  return put('chat', `${conversationId}/${Date.now()}.${extFor(file.mimeType)}`, file);
}

/** Temporary links (1 hour) for private files. */
export async function signedUrls(bucket: 'documents' | 'chat', paths: string[]) {
  if (!paths.length) return {} as Record<string, string>;
  const { data } = await supabase.storage.from(bucket).createSignedUrls(paths, 3600);
  const urls: Record<string, string> = {};
  for (const d of data ?? []) if (d.path && d.signedUrl) urls[d.path] = d.signedUrl;
  return urls;
}
