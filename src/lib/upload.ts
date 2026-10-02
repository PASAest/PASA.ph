import * as DocumentPicker from 'expo-document-picker';
import { File } from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import { Platform } from 'react-native';
import { supabase } from './supabase';

export type Picked = { uri: string; mimeType: string; name: string; kind: 'image' | 'video' | 'pdf' };

const extFor = (mime: string) =>
  mime.includes('png') ? 'png' : mime.includes('pdf') ? 'pdf' : mime.includes('mp4') ? 'mp4' : mime.includes('quicktime') ? 'mov' : mime.includes('webp') ? 'webp' : mime.startsWith('video') ? 'mp4' : 'jpg';

/** Reads a picked file into bytes. Native uses expo-file-system (fetch().arrayBuffer() is unreliable on Android). */
async function readBytes(uri: string): Promise<ArrayBuffer> {
  if (Platform.OS === 'web') return (await fetch(uri)).arrayBuffer();
  return new File(uri).arrayBuffer();
}

/** Opens the photo library and returns one picked image or video, or null if cancelled. */
export async function pickMedia(opts: { video?: boolean; aspect?: [number, number]; crop?: boolean } = {}): Promise<Picked | null> {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: opts.video ? ['images', 'videos'] : ['images'],
    allowsEditing: opts.crop ?? !opts.video,
    aspect: opts.aspect ?? [1, 1],
    quality: 0.6,
    videoMaxDuration: 60,
  });
  if (result.canceled) return null;
  const a = result.assets[0];
  const isVideo = a.type === 'video';
  return {
    uri: a.uri,
    mimeType: a.mimeType ?? (isVideo ? 'video/mp4' : 'image/jpeg'),
    name: a.fileName ?? `media.${isVideo ? 'mp4' : 'jpg'}`,
    kind: isVideo ? 'video' : 'image',
  };
}

/** Kept for existing screens: pick an image and return its local uri. */
export async function pickImage(aspect: [number, number] = [1, 1]) {
  return (await pickMedia({ aspect }))?.uri ?? null;
}

/** Picks an ID, COR or CV: a photo or a PDF. */
export async function pickDocument(): Promise<Picked | null> {
  const result = await DocumentPicker.getDocumentAsync({ type: ['image/*', 'application/pdf'], copyToCacheDirectory: true });
  if (result.canceled) return null;
  const a = result.assets[0];
  const mime = a.mimeType ?? (a.name.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'image/jpeg');
  return { uri: a.uri, mimeType: mime, name: a.name, kind: mime === 'application/pdf' ? 'pdf' : 'image' };
}

async function put(bucket: string, path: string, uri: string, mimeType: string) {
  const body = await readBytes(uri);
  const { error } = await supabase.storage.from(bucket).upload(path, body, { contentType: mimeType, upsert: true });
  if (error) throw error;
  return path;
}

/** Public photo (profile picture, listing photo). Returns its public URL. */
export async function uploadImage(uri: string, userId: string, mimeType = 'image/jpeg') {
  const path = await put('photos', `${userId}/${Date.now()}.${extFor(mimeType)}`, uri, mimeType);
  return supabase.storage.from('photos').getPublicUrl(path).data.publicUrl;
}

/** Private verification document. Returns its storage path (viewable by the owner and admins only). */
export async function uploadDocument(file: Picked, userId: string, label: 'id' | 'cor' | 'cv') {
  return put('documents', `${userId}/${label}-${Date.now()}.${extFor(file.mimeType)}`, file.uri, file.mimeType);
}

/** Private chat photo or video, stored under the conversation. Returns its storage path. */
export async function uploadChatMedia(file: Picked, conversationId: string) {
  return put('chat', `${conversationId}/${Date.now()}.${extFor(file.mimeType)}`, file.uri, file.mimeType);
}

/** Temporary links (1 hour) for private files. */
export async function signedUrls(bucket: 'documents' | 'chat', paths: string[]) {
  if (!paths.length) return {} as Record<string, string>;
  const { data } = await supabase.storage.from(bucket).createSignedUrls(paths, 3600);
  const urls: Record<string, string> = {};
  for (const d of data ?? []) if (d.path && d.signedUrl) urls[d.path] = d.signedUrl;
  return urls;
}
