import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

let supabaseClient: SupabaseClient | null = null;

export function getSupabase() {
  if (!supabaseUrl || !supabaseAnonKey) {
    return null;
  }
  if (!supabaseClient) {
    supabaseClient = createClient(supabaseUrl, supabaseAnonKey);
  }
  return supabaseClient;
}

/**
 * Uploads a student photo to Supabase Storage.
 * @param file The file object to upload.
 * @param studentId The unique ID of the student.
 * @returns The public URL of the uploaded image.
 */
export async function uploadStudentPhoto(file: File, studentId: string): Promise<string> {
  const client = getSupabase();
  if (!client) {
    throw new Error('Supabase configuration is missing. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in the Secrets panel.');
  }

  const fileExt = file.name.split('.').pop();
  const fileName = `${studentId}-${Math.random().toString(36).substring(2, 10)}.${fileExt}`;
  const filePath = `student-photos/${fileName}`;

  const { error: uploadError } = await client.storage
    .from('student-photos')
    .upload(filePath, file, {
      upsert: true,
      contentType: file.type,
    });

  if (uploadError) {
    throw uploadError;
  }

  const { data } = client.storage.from('student-photos').getPublicUrl(filePath);

  return data.publicUrl;
}

/**
 * Deletes a student photo from Supabase Storage.
 * @param photoUrl The public URL of the photo to delete.
 */
export async function deleteStudentPhoto(photoUrl: string): Promise<void> {
  if (!photoUrl) return;
  const client = getSupabase();
  if (!client) return;
  
  try {
    const url = new URL(photoUrl);
    const pathParts = url.pathname.split('/');
    const bucket = 'student-photos';
    const filePath = pathParts.slice(pathParts.indexOf(bucket) + 1).join('/');
    
    if (filePath) {
      await client.storage.from(bucket).remove([filePath]);
    }
  } catch (e) {
    console.error('Failed to parse photo URL for deletion', e);
  }
}
