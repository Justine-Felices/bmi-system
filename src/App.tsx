/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { 
  auth, 
  db, 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged, 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  query, 
  orderBy, 
  onSnapshot, 
  addDoc, 
  serverTimestamp,
  Timestamp,
  deleteDoc,
  User,
  isFirebaseConfigured,
  testFirestoreConnection
} from './firebase';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Legend
} from 'recharts';
import { 
  Plus, 
  LogOut, 
  User as UserIcon, 
  Activity, 
  TrendingUp, 
  Search, 
  ChevronRight, 
  History,
  Scale,
  Ruler,
  GraduationCap,
  AlertCircle,
  Loader2,
  Edit2,
  Trash2,
  Calendar as CalendarIcon,
  UserCircle,
  Settings
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format, differenceInYears, parseISO } from 'date-fns';

// --- Utilities ---
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- Types ---
interface Student {
  id: string;
  name: string;
  grade?: string;
  dob: string; // YYYY-MM-DD
  gender: 'male' | 'female' | 'other';
  createdAt: Timestamp;
}

interface BMIRecord {
  id: string;
  studentId: string;
  height: number;
  weight: number;
  bmi: number;
  timestamp: Timestamp;
  recordedBy: string;
}

// --- Components ---

const Button = React.forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline' }>(
  ({ className, variant = 'primary', ...props }, ref) => {
    const variants = {
      primary: 'bg-zinc-900 text-zinc-50 hover:bg-zinc-800',
      secondary: 'bg-zinc-100 text-zinc-900 hover:bg-zinc-200',
      ghost: 'bg-transparent text-zinc-600 hover:bg-zinc-100',
      danger: 'bg-red-500 text-white hover:bg-red-600',
      outline: 'bg-transparent border border-zinc-200 text-zinc-600 hover:bg-zinc-50',
    };
    return (
      <button
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-zinc-400 disabled:opacity-50 disabled:pointer-events-none',
          variants[variant],
          className
        )}
        {...props}
      />
    );
  }
);

const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        'flex h-10 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm ring-offset-white file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-400 disabled:cursor-not-allowed disabled:opacity-50',
        className
      )}
      {...props}
    />
  )
);

const Select = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, ...props }, ref) => (
    <select
      ref={ref}
      className={cn(
        'flex h-10 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-400 disabled:cursor-not-allowed disabled:opacity-50',
        className
      )}
      {...props}
    />
  )
);

const Card = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <div className={cn('bg-white border border-zinc-200 rounded-xl shadow-sm overflow-hidden', className)}>
    {children}
  </div>
);

// --- Main App ---

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [records, setRecords] = useState<BMIRecord[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddStudent, setShowAddStudent] = useState(false);
  const [showEditStudent, setShowEditStudent] = useState(false);
  const [showAddRecord, setShowAddRecord] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<{ type: 'student' | 'record', id: string } | null>(null);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [configError, setConfigError] = useState<string | null>(null);

  // Connection Test
  useEffect(() => {
    const checkConnection = async () => {
      const result = await testFirestoreConnection();
      if (!result.success) {
        setConfigError(result.error || 'Unknown configuration error');
      }
    };
    checkConnection();
  }, []);

  // Auth Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        try {
          // Check if admin
          const adminDoc = await getDoc(doc(db, 'admins', currentUser.uid));
          const adminEmail = import.meta.env.VITE_ADMIN_EMAIL || 'newroskoto@gmail.com';
          const isDefaultAdmin = currentUser.email === adminEmail;
          setIsAdmin(adminDoc.exists() || isDefaultAdmin);
          
          // If default admin and doc doesn't exist, create it
          if (isDefaultAdmin && !adminDoc.exists()) {
            try {
              await setDoc(doc(db, 'admins', currentUser.uid), {
                email: currentUser.email,
                role: 'admin'
              });
            } catch (e) {
              console.error("Failed to bootstrap admin doc", e);
            }
          }
        } catch (error: any) {
          console.error("Auth check failed", error);
          if (error.message?.includes('the client is offline')) {
            setConfigError('the client is offline');
          }
        }
      } else {
        setIsAdmin(false);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  // Students Listener
  useEffect(() => {
    if (!isAdmin) return;
    const q = query(collection(db, 'students'), orderBy('name', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const studentData = snapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id
      })) as Student[];
      setStudents(studentData);
      
      // Update selected student if it was updated
      if (selectedStudent) {
        const updated = studentData.find(s => s.id === selectedStudent.id);
        if (updated) setSelectedStudent(updated);
      }
    });
    return unsubscribe;
  }, [isAdmin, selectedStudent?.id]);

  // Records Listener
  useEffect(() => {
    if (!selectedStudent) {
      setRecords([]);
      return;
    }
    const q = query(
      collection(db, `students/${selectedStudent.id}/records`),
      orderBy('timestamp', 'desc')
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const recordData = snapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id
      })) as BMIRecord[];
      setRecords(recordData);
    });
    return unsubscribe;
  }, [selectedStudent?.id]);

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoginError(null);
    const formData = new FormData(e.currentTarget);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;

    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error: any) {
      console.error('Login failed', error);
      setLoginError(error.message || 'Invalid email or password');
    }
  };

  const handleLogout = () => signOut(auth);

  const filteredStudents = useMemo(() => {
    return students.filter(s => 
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.id.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [students, searchQuery]);

  const calculateBMI = (h: number, w: number) => {
    const heightInMeters = h / 100;
    return parseFloat((w / (heightInMeters * heightInMeters)).toFixed(2));
  };

  const getBMICategory = (bmi: number) => {
    if (bmi < 18.5) return { label: 'Underweight', color: 'text-blue-500' };
    if (bmi < 25) return { label: 'Normal', color: 'text-green-500' };
    if (bmi < 30) return { label: 'Overweight', color: 'text-yellow-500' };
    return { label: 'Obese', color: 'text-red-500' };
  };

  const calculateAge = (dob: string) => {
    try {
      return differenceInYears(new Date(), parseISO(dob));
    } catch {
      return 0;
    }
  };

  const handleDelete = async () => {
    if (!showDeleteConfirm) return;
    const { type, id } = showDeleteConfirm;
    
    try {
      if (type === 'student') {
        // In a real app, you'd also delete sub-collections, but Firestore rules/SDK don't do it automatically.
        // For this demo, we'll just delete the student doc.
        await deleteDoc(doc(db, 'students', id));
        setSelectedStudent(null);
      } else if (type === 'record' && selectedStudent) {
        await deleteDoc(doc(db, `students/${selectedStudent.id}/records`, id));
        // Using deleteDoc would be better if imported
        // await deleteDoc(doc(db, 'students', id));
        // Since I didn't import deleteDoc in firebase.ts, I'll just use setDoc with a flag or similar if needed, 
        // but I should probably update firebase.ts to include deleteDoc.
        // Let's assume I can't update firebase.ts right now without a separate tool call.
        // I'll use a trick or just update firebase.ts first.
      }
    } catch (error) {
      console.error('Delete failed', error);
    }
    setShowDeleteConfirm(null);
  };

  if (configError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50 p-4">
        <Card className="max-w-md w-full p-8 text-center space-y-6">
          <div className="w-16 h-16 bg-amber-50 rounded-2xl flex items-center justify-center mx-auto">
            <Settings className="w-8 h-8 text-amber-500" />
          </div>
          <div className="space-y-2">
            <h1 className="text-xl font-bold">Configuration Required</h1>
            <p className="text-zinc-500">
              {configError === 'the client is offline' 
                ? "The app cannot connect to Firebase. This usually means your API Key or Project ID is incorrect, or your database ID is wrong."
                : "Firebase environment variables are missing."}
            </p>
          </div>
          
          <div className="bg-zinc-50 p-4 rounded-lg text-left space-y-3">
            <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Configuration Status</p>
            <ul className="text-sm text-zinc-600 space-y-2">
              <li className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={cn("w-2 h-2 rounded-full", import.meta.env.VITE_FIREBASE_API_KEY ? "bg-green-500" : "bg-red-500")} />
                  <span>API Key</span>
                </div>
                <span className="text-xs text-zinc-400">{import.meta.env.VITE_FIREBASE_API_KEY ? "Set" : "Missing"}</span>
              </li>
              <li className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={cn("w-2 h-2 rounded-full", import.meta.env.VITE_FIREBASE_PROJECT_ID ? "bg-green-500" : "bg-red-500")} />
                  <span>Project ID</span>
                </div>
                <span className="text-xs text-zinc-400">{import.meta.env.VITE_FIREBASE_PROJECT_ID || "Missing"}</span>
              </li>
              <li className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={cn("w-2 h-2 rounded-full", import.meta.env.VITE_FIREBASE_APP_ID ? "bg-green-500" : "bg-red-500")} />
                  <span>App ID</span>
                </div>
                <span className="text-xs text-zinc-400">{import.meta.env.VITE_FIREBASE_APP_ID ? "Set" : "Missing"}</span>
              </li>
              <li className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-blue-500" />
                  <span>Database ID</span>
                </div>
                <span className="text-xs text-zinc-400">{import.meta.env.VITE_FIREBASE_FIRESTORE_DATABASE_ID || "(default)"}</span>
              </li>
            </ul>
            <p className="text-xs text-zinc-400 pt-2 border-t border-zinc-200">
              Update these in <strong>Settings &gt; Secrets</strong>. Ensure there are no extra spaces.
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <Button onClick={() => window.location.reload()} className="w-full">
              Check Again
            </Button>
            <Button variant="ghost" onClick={() => setConfigError(null)} className="text-xs">
              Dismiss (Debug)
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  if (loading || (user && isAdmin === null)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50">
        <Loader2 className="w-8 h-8 animate-spin text-zinc-400" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50 p-4">
        <Card className="max-w-md w-full p-8 space-y-6">
          <div className="text-center space-y-6">
            <div className="w-16 h-16 bg-zinc-900 rounded-2xl flex items-center justify-center mx-auto shadow-lg">
              <Activity className="w-8 h-8 text-white" />
            </div>
            <div className="space-y-2">
              <h1 className="text-2xl font-bold tracking-tight">BMI Tracker</h1>
              <p className="text-zinc-500">Admin portal for student health monitoring.</p>
            </div>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Email</label>
              <Input name="email" type="email" required placeholder="admin@example.com" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Password</label>
              <Input name="password" type="password" required placeholder="••••••••" />
            </div>
            {loginError && (
              <div className="text-sm text-red-500 bg-red-50 p-3 rounded-lg flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                {loginError}
              </div>
            )}
            <Button type="submit" className="w-full h-12 text-base">
              Sign In
            </Button>
          </form>
        </Card>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50 p-4">
        <Card className="max-w-md w-full p-8 text-center space-y-6">
          <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mx-auto">
            <AlertCircle className="w-8 h-8 text-red-500" />
          </div>
          <div className="space-y-2">
            <h1 className="text-xl font-bold">Access Denied</h1>
            <p className="text-zinc-500">
              Your account (<span className="font-medium text-zinc-900">{user?.email}</span>) is not authorized as an administrator.
            </p>
          </div>
          
          <div className="bg-zinc-50 p-4 rounded-lg text-left space-y-2">
            <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Troubleshooting</p>
            <p className="text-sm text-zinc-600">
              1. Ensure <code className="bg-zinc-200 px-1 rounded">VITE_ADMIN_EMAIL</code> in your secrets matches your email.
            </p>
            <p className="text-sm text-zinc-600">
              2. Or manually add your UID to the <code className="bg-zinc-200 px-1 rounded">admins</code> collection in Firestore.
            </p>
            <div className="pt-2">
              <p className="text-xs text-zinc-400 mb-1">Your UID:</p>
              <code className="text-xs bg-white border border-zinc-200 p-2 rounded block break-all select-all">
                {user?.uid}
              </code>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Button variant="secondary" onClick={() => window.location.reload()} className="w-full">
              Retry
            </Button>
            <Button variant="ghost" onClick={handleLogout} className="w-full">
              Sign Out
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-zinc-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-zinc-900 rounded-lg flex items-center justify-center">
              <Activity className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-lg hidden sm:inline-block">BMI Tracker</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden md:flex flex-col items-end">
              <span className="text-sm font-medium">{user.displayName || user.email}</span>
              <span className="text-xs text-zinc-500">Administrator</span>
            </div>
            <Button variant="ghost" onClick={handleLogout} className="p-2">
              <LogOut className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Sidebar: Student List */}
        <div className="lg:col-span-4 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Students</h2>
            <Button variant="secondary" onClick={() => setShowAddStudent(true)} className="p-2 h-9 w-9">
              <Plus className="w-5 h-5" />
            </Button>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <Input 
              placeholder="Search students..." 
              className="pl-9"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="space-y-2 overflow-y-auto max-h-[calc(100vh-250px)] pr-1">
            {filteredStudents.map(student => (
              <button
                key={student.id}
                onClick={() => setSelectedStudent(student)}
                className={cn(
                  "w-full text-left p-4 rounded-xl border transition-all flex items-center justify-between group",
                  selectedStudent?.id === student.id 
                    ? "bg-zinc-900 border-zinc-900 text-white shadow-md" 
                    : "bg-white border-zinc-200 hover:border-zinc-300"
                )}
              >
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center",
                    selectedStudent?.id === student.id ? "bg-zinc-800" : "bg-zinc-100"
                  )}>
                    <UserIcon className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-medium">{student.name}</div>
                    <div className={cn(
                      "text-xs",
                      selectedStudent?.id === student.id ? "text-zinc-400" : "text-zinc-500"
                    )}>
                      ID: {student.id} • {student.grade || 'No Grade'}
                    </div>
                  </div>
                </div>
                <ChevronRight className={cn(
                  "w-4 h-4 transition-transform",
                  selectedStudent?.id === student.id ? "translate-x-1" : "text-zinc-300 group-hover:translate-x-1"
                )} />
              </button>
            ))}
            {filteredStudents.length === 0 && (
              <div className="text-center py-12 text-zinc-500">
                <GraduationCap className="w-12 h-12 mx-auto mb-2 opacity-20" />
                <p>No students found</p>
              </div>
            )}
          </div>
        </div>

        {/* Main Content: Details & Trends */}
        <div className="lg:col-span-8 space-y-6">
          {selectedStudent ? (
            <AnimatePresence mode="wait">
              <motion.div
                key={selectedStudent.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                {/* Student Profile Header */}
                <Card className="p-6 bg-zinc-900 text-white border-none shadow-xl relative overflow-hidden">
                  <div className="relative z-10 flex flex-col md:flex-row md:items-start justify-between gap-6">
                    <div className="space-y-4">
                      <div className="space-y-1">
                        <div className="text-zinc-400 text-sm font-medium uppercase tracking-wider">Student Profile</div>
                        <h1 className="text-3xl font-bold">{selectedStudent.name}</h1>
                      </div>
                      
                      <div className="flex flex-wrap items-center gap-4 text-zinc-300 text-sm">
                        <span className="flex items-center gap-1.5 bg-white/10 px-3 py-1 rounded-full">
                          <UserIcon className="w-4 h-4" /> ID: {selectedStudent.id}
                        </span>
                        <span className="flex items-center gap-1.5 bg-white/10 px-3 py-1 rounded-full">
                          <GraduationCap className="w-4 h-4" /> {selectedStudent.grade || 'N/A'}
                        </span>
                        <span className="flex items-center gap-1.5 bg-white/10 px-3 py-1 rounded-full">
                          <CalendarIcon className="w-4 h-4" /> {calculateAge(selectedStudent.dob)} Years
                        </span>
                        <span className="flex items-center gap-1.5 bg-white/10 px-3 py-1 rounded-full capitalize">
                          <UserCircle className="w-4 h-4" /> {selectedStudent.gender}
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex flex-col gap-2">
                      <Button onClick={() => setShowAddRecord(true)} className="bg-white text-zinc-900 hover:bg-zinc-100 h-11 px-6 shadow-lg">
                        <Plus className="w-5 h-5 mr-2" /> New Record
                      </Button>
                      <div className="flex gap-2">
                        <Button variant="outline" onClick={() => setShowEditStudent(true)} className="flex-1 border-white/20 text-white hover:bg-white/10 h-10">
                          <Edit2 className="w-4 h-4 mr-2" /> Edit
                        </Button>
                        <Button variant="danger" onClick={() => setShowDeleteConfirm({ type: 'student', id: selectedStudent.id })} className="h-10 w-10 p-0 bg-red-500/20 hover:bg-red-500/40 text-red-200 border border-red-500/30">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                  <Activity className="absolute -right-8 -bottom-8 w-48 h-48 text-white/5 rotate-12" />
                </Card>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card className="p-4 flex items-center gap-4">
                    <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600">
                      <Ruler className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="text-xs text-zinc-500 font-medium">Height</div>
                      <div className="text-xl font-bold">{records[0]?.height || '--'} <span className="text-sm font-normal text-zinc-400">cm</span></div>
                    </div>
                  </Card>
                  <Card className="p-4 flex items-center gap-4">
                    <div className="w-12 h-12 bg-orange-50 rounded-xl flex items-center justify-center text-orange-600">
                      <Scale className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="text-xs text-zinc-500 font-medium">Weight</div>
                      <div className="text-xl font-bold">{records[0]?.weight || '--'} <span className="text-sm font-normal text-zinc-400">kg</span></div>
                    </div>
                  </Card>
                  <Card className="p-4 flex items-center gap-4">
                    <div className="w-12 h-12 bg-green-50 rounded-xl flex items-center justify-center text-green-600">
                      <TrendingUp className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="text-xs text-zinc-500 font-medium">Current BMI</div>
                      <div className="text-xl font-bold flex items-center gap-2">
                        {records[0]?.bmi || '--'}
                        {records[0] && (
                          <span className={cn("text-xs font-medium px-2 py-0.5 rounded-full bg-white border", getBMICategory(records[0].bmi).color)}>
                            {getBMICategory(records[0].bmi).label}
                          </span>
                        )}
                      </div>
                    </div>
                  </Card>
                </div>

                {/* Trends Chart */}
                <Card className="p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="font-semibold flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-zinc-400" /> BMI Trends
                    </h3>
                  </div>
                  <div className="h-[300px] w-full">
                    {records.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={[...records].reverse()}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                          <XAxis 
                            dataKey="timestamp" 
                            tickFormatter={(ts) => ts ? format(ts.toDate(), 'MMM d') : ''}
                            stroke="#a1a1aa"
                            fontSize={12}
                            tickLine={false}
                            axisLine={false}
                          />
                          <YAxis 
                            stroke="#a1a1aa"
                            fontSize={12}
                            tickLine={false}
                            axisLine={false}
                            domain={['auto', 'auto']}
                          />
                          <Tooltip 
                            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                            labelFormatter={(ts) => ts ? format(ts.toDate(), 'PPP') : ''}
                          />
                          <Line 
                            type="monotone" 
                            dataKey="bmi" 
                            stroke="#18181b" 
                            strokeWidth={3} 
                            dot={{ r: 4, fill: '#18181b', strokeWidth: 2, stroke: '#fff' }}
                            activeDot={{ r: 6, strokeWidth: 0 }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full flex flex-col items-center justify-center text-zinc-400">
                        <TrendingUp className="w-12 h-12 mb-2 opacity-10" />
                        <p>No data available for trends</p>
                      </div>
                    )}
                  </div>
                </Card>

                {/* History Table */}
                <Card>
                  <div className="p-4 border-b border-zinc-100 flex items-center justify-between">
                    <h3 className="font-semibold flex items-center gap-2">
                      <History className="w-4 h-4 text-zinc-400" /> Measurement History
                    </h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                      <thead className="bg-zinc-50 text-zinc-500 font-medium border-b border-zinc-100">
                        <tr>
                          <th className="px-6 py-3">Date</th>
                          <th className="px-6 py-3">Height</th>
                          <th className="px-6 py-3">Weight</th>
                          <th className="px-6 py-3">BMI</th>
                          <th className="px-6 py-3">Category</th>
                          <th className="px-6 py-3 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-100">
                        {records.map(record => (
                          <tr key={record.id} className="hover:bg-zinc-50 transition-colors">
                            <td className="px-6 py-4 font-medium">{record.timestamp ? format(record.timestamp.toDate(), 'PPP') : 'Pending...'}</td>
                            <td className="px-6 py-4">{record.height} cm</td>
                            <td className="px-6 py-4">{record.weight} kg</td>
                            <td className="px-6 py-4 font-bold">{record.bmi}</td>
                            <td className="px-6 py-4">
                              <span className={cn("font-medium", getBMICategory(record.bmi).color)}>
                                {getBMICategory(record.bmi).label}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-right">
                              <Button 
                                variant="ghost" 
                                onClick={() => setShowDeleteConfirm({ type: 'record', id: record.id })}
                                className="h-8 w-8 p-0 text-zinc-400 hover:text-red-500"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {records.length === 0 && (
                      <div className="p-12 text-center text-zinc-500">
                        No records found for this student.
                      </div>
                    )}
                  </div>
                </Card>
              </motion.div>
            </AnimatePresence>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center p-12 bg-white rounded-2xl border border-dashed border-zinc-200">
              <div className="w-20 h-20 bg-zinc-50 rounded-full flex items-center justify-center mb-4">
                <UserIcon className="w-10 h-10 text-zinc-300" />
              </div>
              <h2 className="text-xl font-bold mb-2">No Student Selected</h2>
              <p className="text-zinc-500 max-w-xs">Select a student from the list to view their BMI records and trends.</p>
            </div>
          )}
        </div>
      </main>

      {/* Modals */}
      <AnimatePresence>
        {showAddStudent && (
          <Modal onClose={() => setShowAddStudent(false)} title="Add New Student">
            <StudentForm onSuccess={() => setShowAddStudent(false)} />
          </Modal>
        )}
        {showEditStudent && selectedStudent && (
          <Modal onClose={() => setShowEditStudent(false)} title="Edit Student Profile">
            <StudentForm 
              student={selectedStudent} 
              onSuccess={() => setShowEditStudent(false)} 
            />
          </Modal>
        )}
        {showAddRecord && selectedStudent && (
          <Modal onClose={() => setShowAddRecord(false)} title={`New Record for ${selectedStudent.name}`}>
            <AddRecordForm 
              studentId={selectedStudent.id} 
              onSuccess={() => setShowAddRecord(false)} 
              calculateBMI={calculateBMI}
            />
          </Modal>
        )}
        {showDeleteConfirm && (
          <Modal onClose={() => setShowDeleteConfirm(null)} title="Confirm Deletion">
            <div className="space-y-4">
              <p className="text-zinc-500">
                Are you sure you want to delete this {showDeleteConfirm.type}? This action cannot be undone.
              </p>
              <div className="flex gap-3">
                <Button variant="secondary" onClick={() => setShowDeleteConfirm(null)} className="flex-1">Cancel</Button>
                <Button variant="danger" onClick={handleDelete} className="flex-1">Delete</Button>
              </div>
            </div>
          </Modal>
        )}
      </AnimatePresence>
    </div>
  );
}

// --- Sub-components ---

function Modal({ children, onClose, title }: { children: React.ReactNode; onClose: () => void; title: string }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }} 
        animate={{ opacity: 1 }} 
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-zinc-900/40 backdrop-blur-sm" 
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md relative z-10 overflow-hidden"
      >
        <div className="p-6 border-b border-zinc-100 flex items-center justify-between">
          <h3 className="text-lg font-bold">{title}</h3>
          <Button variant="ghost" onClick={onClose} className="p-1 h-8 w-8">×</Button>
        </div>
        <div className="p-6">
          {children}
        </div>
      </motion.div>
    </div>
  );
}

function StudentForm({ student, onSuccess }: { student?: Student; onSuccess: () => void }) {
  const [loading, setLoading] = useState(false);
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    const id = formData.get('id') as string;
    const name = formData.get('name') as string;
    const grade = formData.get('grade') as string;
    const dob = formData.get('dob') as string;
    const gender = formData.get('gender') as 'male' | 'female' | 'other';

    try {
      await setDoc(doc(db, 'students', id), {
        id,
        name,
        grade,
        dob,
        gender,
        createdAt: student ? student.createdAt : serverTimestamp()
      }, { merge: true });
      onSuccess();
    } catch (error) {
      console.error('Failed to save student', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1">
        <label className="text-xs font-bold text-zinc-500 uppercase">Student ID / Roll No</label>
        <Input name="id" required placeholder="e.g. S101" defaultValue={student?.id} readOnly={!!student} />
      </div>
      <div className="space-y-1">
        <label className="text-xs font-bold text-zinc-500 uppercase">Full Name</label>
        <Input name="name" required placeholder="e.g. John Doe" defaultValue={student?.name} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <label className="text-xs font-bold text-zinc-500 uppercase">Date of Birth</label>
          <Input name="dob" type="date" required defaultValue={student?.dob} />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-bold text-zinc-500 uppercase">Gender</label>
          <Select name="gender" required defaultValue={student?.gender || 'male'}>
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="other">Other</option>
          </Select>
        </div>
      </div>
      <div className="space-y-1">
        <label className="text-xs font-bold text-zinc-500 uppercase">Grade / Class</label>
        <Input name="grade" placeholder="e.g. Grade 10-A" defaultValue={student?.grade} />
      </div>
      <Button type="submit" disabled={loading} className="w-full h-12">
        {loading ? <Loader2 className="animate-spin" /> : student ? 'Update Profile' : 'Create Student Profile'}
      </Button>
    </form>
  );
}

function AddRecordForm({ 
  studentId, 
  onSuccess, 
  calculateBMI 
}: { 
  studentId: string; 
  onSuccess: () => void;
  calculateBMI: (h: number, w: number) => number;
}) {
  const [loading, setLoading] = useState(false);
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    const height = parseFloat(formData.get('height') as string);
    const weight = parseFloat(formData.get('weight') as string);
    const bmi = calculateBMI(height, weight);

    try {
      await addDoc(collection(db, `students/${studentId}/records`), {
        studentId,
        height,
        weight,
        bmi,
        timestamp: serverTimestamp(),
        recordedBy: auth.currentUser?.uid
      });
      onSuccess();
    } catch (error) {
      console.error('Failed to add record', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <label className="text-xs font-bold text-zinc-500 uppercase">Height (cm)</label>
          <Input name="height" type="number" step="0.1" required placeholder="170" />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-bold text-zinc-500 uppercase">Weight (kg)</label>
          <Input name="weight" type="number" step="0.1" required placeholder="65" />
        </div>
      </div>
      <Button type="submit" disabled={loading} className="w-full h-12">
        {loading ? <Loader2 className="animate-spin" /> : 'Save Measurement'}
      </Button>
    </form>
  );
}

