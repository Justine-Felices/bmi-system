import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Uploads a student photo to Supabase Storage.
 * @param file The file object to upload.
 * @param studentId The unique ID of the student.
 * @returns The public URL of the uploaded image.
 */
export async function uploadStudentPhoto(file: File, studentId: string): Promise<string> {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Supabase configuration is missing. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
  }

  const fileExt = file.name.split('.').pop();
  const fileName = `${studentId}-${Math.random().toString(36).substring(2, 10)}.${fileExt}`;
  const filePath = `student-photos/${fileName}`;

  const { error: uploadError } = await supabase.storage
    .from('student-photos')
    .upload(filePath, file, {
      upsert: true,
      contentType: file.type,
    });

  if (uploadError) {
    // If bucket doesn't exist, this might fail. We assume the bucket is set up as 'student-photos'.
    throw uploadError;
  }

  const { data } = supabase.storage.from('student-photos').getPublicUrl(filePath);

  return data.publicUrl;
}

/**
 * Deletes a student photo from Supabase Storage.
 * @param photoUrl The public URL of the photo to delete.
 */
export async function deleteStudentPhoto(photoUrl: string): Promise<void> {
  if (!photoUrl) return;
  
  try {
    const url = new URL(photoUrl);
    const pathParts = url.pathname.split('/');
    // Extract the relative path from the URL. 
    // Format is usually /storage/v1/object/public/bucket/path
    const bucket = 'student-photos';
    const filePath = pathParts.slice(pathParts.indexOf(bucket) + 1).join('/');
    
    if (filePath) {
      await supabase.storage.from(bucket).remove([filePath]);
    }
  } catch (e) {
    console.error('Failed to parse photo URL for deletion', e);
  }
}
