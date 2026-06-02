import type React from 'react';
import { useState } from 'react';
import { doc, setDoc, serverTimestamp, db } from '../../firebase';
import { uploadStudentPhoto } from '../../lib/supabase';
import { cn } from '../../lib/utils';
import type { Section, Student } from '../../types';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import {
  AlertCircle,
  Camera,
  Image as ImageIcon,
  Loader2,
  ShieldCheck,
  Upload,
  X,
} from 'lucide-react';

interface StudentFormProps {
  student?: Student;
  sections: Section[];
  onSuccess: () => void;
}

export function StudentForm({ student, sections, onSuccess }: StudentFormProps) {
  const [loading, setLoading] = useState(false);
  const [allergies, setAllergies] = useState<string[]>(student?.allergies || []);
  const [newAllergy, setNewAllergy] = useState('');
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(student?.photoUrl || null);

  const commonAllergies = ['Peanuts', 'Dairy', 'Eggs', 'Shellfish', 'Wheat', 'Soy', 'Dust', 'Pollen', 'Latex'];

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhotoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const addAllergy = (allergy: string) => {
    if (allergy && !allergies.includes(allergy)) {
      setAllergies([...allergies, allergy]);
      setNewAllergy('');
    }
  };

  const removeAllergy = (allergy: string) => {
    setAllergies(allergies.filter(a => a !== allergy));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    const id = formData.get('id') as string;
    const name = formData.get('name') as string;
    const grade = formData.get('grade') as string;
    const dob = formData.get('dob') as string;
    const sectionId = formData.get('sectionId') as string;
    const gender = formData.get('gender') as 'male' | 'female' | 'other';

    if (!sectionId) {
      alert('Please select a section. Create sections first via Manage Sections.');
      setLoading(false);
      return;
    }

    try {
      let photoUrl = student?.photoUrl || '';
      if (photoFile) {
        photoUrl = await uploadStudentPhoto(photoFile, id);
      }

      await setDoc(doc(db!, 'students', id), {
        id,
        name,
        grade,
        sectionId,
        dob,
        gender,
        allergies,
        photoUrl,
        createdAt: student ? student.createdAt : serverTimestamp(),
      }, { merge: true });
      onSuccess();
    } catch (error) {
      console.error('Failed to save student', error);
      alert(error instanceof Error ? error.message : 'Failed to save student and upload photo');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="flex flex-col items-center gap-4 py-2">
        <div className="relative group">
          <div className="w-28 h-28 rounded-3xl bg-slate-50 border-2 border-dashed border-slate-200 flex items-center justify-center overflow-hidden shadow-inner group-hover:border-teal-300 transition-colors">
            {photoPreview ? (
              <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            ) : (
              <div className="text-center group-hover:scale-110 transition-transform">
                <Camera className="w-8 h-8 text-slate-300 mx-auto" />
                <span className="text-[10px] font-bold text-slate-400 uppercase mt-1 block">Student Photo</span>
              </div>
            )}
          </div>
          <label className="absolute inset-0 flex items-center justify-center bg-teal-600/60 opacity-0 group-hover:opacity-100 rounded-3xl cursor-pointer transition-all backdrop-blur-[2px]">
            <Upload className="w-7 h-7 text-white" />
            <input type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
          </label>
          <div className="absolute -top-2 -right-2 w-7 h-7 bg-white rounded-lg shadow-md border border-slate-100 flex items-center justify-center text-teal-500">
            <ImageIcon className="w-4 h-4" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Student ID</label>
          <Input name="id" required placeholder="REF-0000" defaultValue={student?.id} readOnly={!!student} className={cn(student && 'bg-slate-50 cursor-not-allowed')} />
        </div>
        <div className="space-y-1.5">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Assigned Grade</label>
          <Input name="grade" placeholder="e.g. 10-Alpha" defaultValue={student?.grade} />
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest ml-1">Section</label>
        {sections.length === 0 ? (
          <p className="text-sm text-accent p-3 rounded-lg bg-accent-light border border-accent/20">
            No sections yet. Create sections via Manage Sections before adding students.
          </p>
        ) : (
          <Select name="sectionId" required defaultValue={student?.sectionId || ''}>
            <option value="" disabled>Select section...</option>
            {sections.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </Select>
        )}
      </div>

      <div className="space-y-1.5">
        <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest ml-1">Student Name</label>
        <Input name="name" required placeholder="Enter complete legal name" defaultValue={student?.name} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Date of Birth</label>
          <Input name="dob" type="date" required defaultValue={student?.dob} className="font-mono" />
        </div>
        <div className="space-y-1.5">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Gender</label>
          <Select name="gender" required defaultValue={student?.gender || 'male'}>
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="other">Other</option>
          </Select>
        </div>
      </div>

      <div className="space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-100">
        <div className="flex items-center gap-2 mb-1">
          <AlertCircle className="w-3.5 h-3.5 text-rose-500" />
          <label className="text-[10px] font-bold text-slate-800 uppercase tracking-widest">Health Alerts / Notes</label>
        </div>
        <div className="flex gap-3">
          <Select
            value=""
            onChange={(e) => addAllergy(e.target.value)}
            className="flex-1 bg-white"
          >
            <option value="" disabled>Predefined List...</option>
            {commonAllergies.map(a => (
              <option key={a} value={a}>{a}</option>
            ))}
          </Select>
          <div className="flex-1 flex gap-2">
            <Input
              placeholder="Custom alert..."
              value={newAllergy}
              className="bg-white"
              onChange={(e) => setNewAllergy(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addAllergy(newAllergy);
                }
              }}
            />
            <Button type="button" onClick={() => addAllergy(newAllergy)} variant="secondary" className="px-4 text-xs font-bold uppercase">Add</Button>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {allergies.map(a => (
            <span key={a} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-500/10 text-rose-600 text-[10px] font-bold rounded-lg border border-rose-200 uppercase tracking-wide group/tag">
              {a}
              <button type="button" onClick={() => removeAllergy(a)} className="hover:text-rose-800 transition-colors">
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
          {allergies.length === 0 && (
            <div className="text-[10px] text-slate-400 italic py-1">No health alerts reported</div>
          )}
        </div>
      </div>

      <Button type="submit" disabled={loading} className="w-full h-12 rounded-2xl bg-teal-600 hover:bg-teal-700 shadow-xl shadow-teal-100 transition-all active:scale-[0.98]">
        {loading ? <Loader2 className="animate-spin w-5 h-5" /> : (
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5" />
            <span className="font-bold uppercase tracking-widest">
              {student ? 'Update Profile' : 'Add Student'}
            </span>
          </div>
        )}
      </Button>
    </form>
  );
}
