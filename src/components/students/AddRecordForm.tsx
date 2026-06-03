import type React from 'react';
import { useState, useEffect } from 'react';
import {
  auth,
  db,
  doc,
  setDoc,
  onSnapshot,
  addDoc,
  collection,
  serverTimestamp,
} from '../../firebase';
import { calculateBMI, getBMICategory } from '../../utils/bmi';
import { cn } from '../../lib/utils';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import {
  Activity,
  AlertCircle,
  Cpu,
  Edit3,
  Loader2,
  Ruler,
  Scale,
  ShieldCheck,
  X,
} from 'lucide-react';

interface AddRecordFormProps {
  studentId: string;
  onSuccess: () => void;
}

export function AddRecordForm({ studentId, onSuccess }: AddRecordFormProps) {
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<'manual' | 'automatic'>('manual');
  const [height, setHeight] = useState<string>('');
  const [weight, setWeight] = useState<string>('');
  const [bmi, setBmi] = useState<string>('');
  const [isWaiting, setIsWaiting] = useState(false);
  const [healthIssues, setHealthIssues] = useState<string[]>([]);
  const [newIssue, setNewIssue] = useState('');

  const commonIssues = ['Fever', 'Cough', 'Cold', 'Headache', 'Stomach Ache', 'Asthma Flare-up', 'Skin Rash', 'Fatigue'];

  const addIssue = (issue: string) => {
    if (issue && !healthIssues.includes(issue)) {
      setHealthIssues([...healthIssues, issue]);
      setNewIssue('');
    }
  };

  const removeIssue = (issue: string) => {
    setHealthIssues(healthIssues.filter(i => i !== issue));
  };

  useEffect(() => {
    const h = parseFloat(height);
    const w = parseFloat(weight);
    if (h > 0 && w > 0) {
      const calculated = calculateBMI(h, w);
      setBmi(calculated.toString());
    }
  }, [height, weight]);

  useEffect(() => {
    if (mode !== 'automatic' || !isWaiting) return;

    const deviceRef = doc(db!, 'devices', 'esp32');

    setDoc(deviceRef, {
      requestBMI: true,
      lastUpdate: serverTimestamp(),
    }, { merge: true }).catch(err => {
      console.error('Failed to trigger ESP32', err);
      setIsWaiting(false);
    });

    const unsubscribe = onSnapshot(deviceRef, (snapshot) => {
      const data = snapshot.data();
      if (data && data.requestBMI === false && typeof data.height === 'number' && typeof data.weight === 'number') {
        setHeight(data.height.toString());
        setWeight(data.weight.toString());
        setIsWaiting(false);
      }
    });

    return () => {
      unsubscribe();
      setDoc(deviceRef, { requestBMI: false }, { merge: true }).catch(() => {});
    };
  }, [mode, isWaiting]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const finalHeight = parseFloat(height);
    const finalWeight = parseFloat(weight);
    const finalBmi = parseFloat(bmi);

    if (
      !Number.isFinite(finalHeight) ||
      !Number.isFinite(finalWeight) ||
      !Number.isFinite(finalBmi) ||
      finalHeight <= 0 ||
      finalWeight <= 0 ||
      finalBmi <= 0 ||
      finalBmi >= 100
    ) {
      alert('Please enter valid height, weight, and BMI before saving.');
      setLoading(false);
      return;
    }

    try {
      await addDoc(collection(db!, `students/${studentId}/records`), {
        studentId,
        height: finalHeight,
        weight: finalWeight,
        bmi: finalBmi,
        healthIssues,
        timestamp: serverTimestamp(),
        recordedBy: auth?.currentUser?.uid,
      });
      onSuccess();
    } catch (error) {
      console.error('Failed to add record', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex bg-slate-100 p-1 rounded-2xl border border-slate-200">
        <button
          type="button"
          onClick={() => { setMode('manual'); setIsWaiting(false); }}
          className={cn(
            'flex-1 flex items-center justify-center gap-2 py-2 text-[10px] font-bold uppercase tracking-widest rounded-xl transition-all',
            mode === 'manual' ? 'bg-white text-teal-600 shadow-sm' : 'text-slate-500 hover:text-slate-700',
          )}
        >
          <Edit3 className="w-4 h-4" /> Manual Log
        </button>
        <button
          type="button"
          onClick={() => setMode('automatic')}
          className={cn(
            'flex-1 flex items-center justify-center gap-2 py-2 text-[10px] font-bold uppercase tracking-widest rounded-xl transition-all',
            mode === 'automatic' ? 'bg-white text-teal-600 shadow-sm' : 'text-slate-500 hover:text-slate-700',
          )}
        >
          <Activity className="w-4 h-4" /> Device Sync
        </button>
      </div>

      {mode === 'automatic' && !isWaiting && !height && (
        <div className="p-10 border-2 border-dashed border-slate-200 rounded-[2rem] text-center space-y-6 group bg-slate-50/50">
          <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center mx-auto shadow-sm border border-slate-100 group-hover:scale-110 transition-transform">
            <Cpu className="w-10 h-10 text-slate-300" />
          </div>
          <div className="space-y-2">
            <h4 className="font-bold text-slate-800">Connection Ready</h4>
            <p className="text-xs text-slate-500 leading-relaxed max-w-[200px] mx-auto font-medium">Start scanning to receive real-time height and weight data.</p>
          </div>
          <Button onClick={() => setIsWaiting(true)} className="w-full bg-slate-900 text-white rounded-xl h-11">
            Start Scanning
          </Button>
        </div>
      )}

      {isWaiting && (
        <div className="p-10 border-none rounded-[2rem] text-center space-y-6 bg-slate-900 text-white shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4">
            <div className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
          </div>
          <div className="relative w-20 h-20 mx-auto">
            <div className="absolute inset-0 border-4 border-white/5 rounded-full" />
            <div className="absolute inset-0 border-4 border-teal-500 rounded-full border-t-transparent animate-spin" />
            <div className="absolute inset-0 flex items-center justify-center">
              <Activity className="w-8 h-8 text-teal-400 animate-pulse" />
            </div>
          </div>
          <div className="space-y-2">
            <h4 className="font-bold tracking-tight text-lg">Synchronizing...</h4>
            <p className="text-xs text-slate-400 leading-relaxed font-medium">Position student on the scale. Sensor alignment in progress.</p>
          </div>
          <Button variant="ghost" onClick={() => setIsWaiting(false)} className="text-slate-500 hover:text-white hover:bg-white/5 h-10 px-8">
            Cancel Scan
          </Button>
        </div>
      )}

      {(mode === 'manual' || (mode === 'automatic' && height)) && (
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Height (cm)</label>
              <div className="relative">
                <Ruler className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  name="height"
                  type="number"
                  step="0.1"
                  required
                  placeholder="0.0"
                  value={height}
                  onChange={(e) => setHeight(e.target.value)}
                  readOnly={mode === 'automatic'}
                  className={cn('pl-10 font-mono', mode === 'automatic' && 'bg-slate-50')}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Weight (kg)</label>
              <div className="relative">
                <Scale className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  name="weight"
                  type="number"
                  step="0.1"
                  required
                  placeholder="0.0"
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  readOnly={mode === 'automatic'}
                  className={cn('pl-10 font-mono', mode === 'automatic' && 'bg-slate-50')}
                />
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1 text-center block">Body Mass Index (BMI)</label>
            <div className="relative group">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
                <Activity className="w-5 h-5 text-teal-500" />
              </div>
              <Input
                name="bmi"
                type="number"
                step="0.01"
                required
                readOnly
                placeholder="--.-"
                value={bmi}
                className="pl-12 py-6 text-2xl font-black bg-teal-50/30 border-teal-100 text-teal-700 tracking-tighter"
              />
              {bmi && (
                <div className="absolute right-4 top-1/2 -translate-y-1/2">
                  <div className={cn('px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider shadow-sm border', getBMICategory(parseFloat(bmi)).color)}>
                    {getBMICategory(parseFloat(bmi)).label}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-3 bg-slate-50 p-5 rounded-2xl border border-slate-100">
            <div className="flex items-center gap-2 mb-1">
              <AlertCircle className="w-3.5 h-3.5 text-rose-500" />
              <label className="text-[10px] font-bold text-slate-800 uppercase tracking-widest">Health Issues</label>
            </div>
            <div className="flex gap-2">
              <Select
                value=""
                onChange={(e) => addIssue(e.target.value)}
                className="flex-1 bg-white"
              >
                <option value="" disabled>Common Issues...</option>
                {commonIssues.map(i => (
                  <option key={i} value={i}>{i}</option>
                ))}
              </Select>
              <div className="flex-1 flex gap-2">
                <Input
                  placeholder="Other..."
                  value={newIssue}
                  className="bg-white"
                  onChange={(e) => setNewIssue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addIssue(newIssue);
                    }
                  }}
                />
                <Button type="button" onClick={() => addIssue(newIssue)} variant="secondary" className="px-4 text-xs font-bold uppercase">Add</Button>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {healthIssues.map(i => (
                <span key={i} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-200 text-slate-700 text-[10px] font-bold rounded-lg border border-slate-300 uppercase tracking-wide">
                  {i}
                  <button type="button" onClick={() => removeIssue(i)} className="hover:text-rose-500 transition-colors">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
              {healthIssues.length === 0 && (
                <div className="text-[10px] text-slate-400 italic py-1">No health issues recorded</div>
              )}
            </div>
          </div>

          <div className="flex gap-3">
            {mode === 'automatic' && (
              <Button type="button" variant="secondary" onClick={() => { setHeight(''); setWeight(''); setIsWaiting(true); }} className="flex-1 h-12 rounded-2xl border-slate-200 text-slate-600 uppercase font-bold text-xs">
                Re-scan
              </Button>
            )}
            <Button type="submit" disabled={loading || !height || !weight} className="flex-[2] h-12 rounded-2xl bg-teal-600 hover:bg-teal-700 shadow-xl shadow-teal-100 transition-all active:scale-[0.98] flex items-center justify-center gap-2 group">
              {loading ? <Loader2 className="animate-spin w-5 h-5" /> : (
                <>
                  <ShieldCheck className="w-5 h-5 group-hover:scale-110 transition-transform" />
                  <span className="font-bold uppercase tracking-widest">Save Record</span>
                </>
              )}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
