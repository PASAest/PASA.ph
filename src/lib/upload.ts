import * as ImagePicker from 'expo-image-picker';
import { supabase } from './supabase';

/** Opens the photo library and returns a local image uri, or null if cancelled. */
export async function pickImage(aspect: [number, number] = [1, 1]) {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect,
    quality: 0.6,
  });
  return result.canceled ? null : result.assets[0].uri;
}

/** Uploads a local image to the public "photos" bucket and returns its public URL. */
export async function uploadImage(uri: string, userId: string) {
  const body = await (await fetch(uri)).arrayBuffer();
  const path = `${userId}/${Date.now()}.jpg`;
  const { error } = await supabase.storage.from('photos').upload(path, body, { contentType: 'image/jpeg' });
  if (error) throw error;
  return supabase.storage.from('photos').getPublicUrl(path).data.publicUrl;
}
