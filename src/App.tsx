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
  testFirestoreConnection,
  collectionGroup,
  where,
  updateDoc
} from './firebase';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Legend,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar
} from 'recharts';
import { 
  Plus, 
  LogOut, 
  User as UserIcon, 
  Activity, 
  TrendingUp, 
  TrendingDown, 
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
  Settings,
  Filter,
  BarChart3,
  PieChart as PieChartIcon,
  Users,
  LayoutDashboard,
  Info,
  Cpu,
  FileText,
  Download,
  Sparkles,
  Printer,
  Camera,
  Image as ImageIcon,
  Upload,
  Crosshair,
  ShieldCheck,
  ClipboardList,
  Edit3,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format, differenceInYears, parseISO, subDays, startOfDay } from 'date-fns';
import { GoogleGenAI } from "@google/genai";
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import html2canvas from 'html2canvas';
import { uploadStudentPhoto, deleteStudentPhoto } from './lib/supabase';

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
  allergies?: string[];
  photoUrl?: string;
  createdAt: Timestamp;
}

interface BMIRecord {
  id: string;
  studentId: string;
  height: number;
  weight: number;
  bmi: number;
  healthIssues?: string[];
  timestamp: Timestamp;
  recordedBy: string;
}

// --- Error Handling ---
enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  // We don't throw here to avoid crashing the whole app, but we log it for the agent to see
  return errInfo;
}

// --- AI Service ---
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

async function generateAIReport(data: any, type: 'general' | 'individual') {
  const prompt = type === 'general' 
    ? `Analyze this school health data and provide a concise summary report (max 300 words). 
       Include: 
       1. Overall health status of the student population.
       2. Key trends (e.g., most common BMI category).
       3. Recommendations for school health programs.
       Data: ${JSON.stringify(data)}`
    : `Analyze this student's BMI history and provide a personalized health summary (max 200 words).
       Include:
       1. Current status and progress.
       2. Specific health advice for the student/parents.
       Student Data: ${JSON.stringify(data)}`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
    });
    return response.text;
  } catch (error) {
    console.error("AI Generation failed:", error);
    return "Unable to generate AI analysis at this time.";
  }
}

// --- Components ---

const Button = React.forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline' }>(
  ({ className, variant = 'primary', ...props }, ref) => {
    const variants = {
      primary: 'bg-teal-600 text-teal-50 hover:bg-teal-700 shadow-sm shadow-teal-100',
      secondary: 'bg-slate-100 text-slate-900 hover:bg-slate-200',
      ghost: 'bg-transparent text-slate-500 hover:bg-slate-100 hover:text-teal-600',
      danger: 'bg-rose-500 text-white hover:bg-rose-600 shadow-sm shadow-rose-100',
      outline: 'bg-transparent border border-slate-200 text-slate-600 hover:bg-slate-50',
    };
    return (
      <button
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-semibold transition-all active:scale-95 focus:outline-none focus:ring-2 focus:ring-teal-400 disabled:opacity-50 disabled:pointer-events-none',
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
        'flex h-10 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 disabled:cursor-not-allowed disabled:opacity-50 transition-all',
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
        'flex h-10 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 disabled:cursor-not-allowed disabled:opacity-50 transition-all cursor-pointer',
        className
      )}
      {...props}
    />
  )
);

const Card = ({ children, className, id }: { children: React.ReactNode; className?: string; id?: string }) => (
  <div id={id} className={cn('bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden transition-all', className)}>
    {children}
  </div>
);

const InfoTooltip = ({ content }: { content: string }) => (
  <div className="group relative inline-block">
    <Info className="w-4 h-4 text-slate-400 cursor-help hover:text-teal-600 transition-colors" />
    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 w-56 p-3 bg-slate-900/95 backdrop-blur-sm text-white text-[11px] font-medium leading-relaxed rounded-xl opacity-0 group-hover:opacity-100 pointer-events-none transition-all z-50 shadow-2xl border border-white/10 translate-y-1 group-hover:translate-y-0 text-center">
      {content}
      <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-900/95" />
    </div>
  </div>
);

// --- Analytics Components ---

function AnalyticsDashboard({ 
  data, 
  dateFilter, 
  setDateFilter,
  genderFilter,
  setGenderFilter,
  ageFilter,
  setAgeFilter,
  loading,
  error
}: { 
  data: any; 
  dateFilter: string; 
  setDateFilter: (v: any) => void;
  genderFilter: string;
  setGenderFilter: (v: any) => void;
  ageFilter: string;
  setAgeFilter: (v: any) => void;
  loading?: boolean;
  error?: string | null;
}) {
  const COLORS = ['#3b82f6', '#22c55e', '#eab308', '#ef4444', '#0ea5e9', '#ec4899', '#64748b'];

  const [isGeneratingReport, setIsGeneratingReport] = useState(false);

  const handleDownloadPDF = async () => {
    setIsGeneratingReport(true);
    try {
      const doc = new jsPDF('p', 'mm', 'a4');
      const pageWidth = doc.internal.pageSize.getWidth();
      
      // Header
      doc.setFillColor(24, 24, 27);
      doc.rect(0, 0, pageWidth, 40, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(22);
      doc.text("School Health Analytics Report", 15, 25);
      doc.setFontSize(10);
      doc.text(`Generated on: ${format(new Date(), 'PPP p')}`, 15, 33);
      doc.text(`Filters: Date=${dateFilter}, Gender=${genderFilter}, Age=${ageFilter}`, 15, 37);
      
      // AI Analysis Section
      doc.setTextColor(24, 24, 27);
      doc.setFontSize(16);
      doc.text("AI Health Insights", 15, 55);
      
      const aiSummary = await generateAIReport(data, 'general');
      doc.setFontSize(10);
      const splitText = doc.splitTextToSize(aiSummary || "No analysis available.", pageWidth - 30);
      doc.text(splitText, 15, 65);
      
      let currentY = 65 + (splitText.length * 5) + 10;

      // Stats Table
      autoTable(doc, {
        startY: currentY,
        head: [['Metric', 'Value']],
        body: [
          ['Total Students', data.totalStudents.toString()],
          ['Total Measurements', data.totalRecords.toString()],
          ['Avg. BMI', data.avgBMI.toFixed(1)],
          ['Normal Weight %', `${data.pieData.find((d: any) => d.name === 'Normal')?.value || 0}%`],
          ['Overweight %', `${data.pieData.find((d: any) => d.name === 'Overweight')?.value || 0}%`],
        ],
        theme: 'striped',
        headStyles: { fillColor: [24, 24, 27] }
      });

      currentY = (doc as any).lastAutoTable.finalY + 20;

      // Capture Charts
      const chartIds = [
        { id: 'chart-bmi-dist', title: 'BMI Distribution' },
        { id: 'chart-bmi-trend', title: 'Global BMI Trend' },
        { id: 'chart-gender-dist', title: 'Gender Demographics' },
        { id: 'chart-grade-dist', title: 'Grade Population' }
      ];

      for (const chart of chartIds) {
        const element = document.getElementById(chart.id);
        if (element) {
          try {
            const canvas = await html2canvas(element, { 
              scale: 2,
              useCORS: true,
              logging: false,
              backgroundColor: '#ffffff'
            });
            const imgData = canvas.toDataURL('image/png');
            
            if (currentY + 80 > doc.internal.pageSize.getHeight() - 20) {
              doc.addPage();
              currentY = 20;
            }
            
            doc.setFontSize(12);
            doc.text(chart.title, 15, currentY - 5);
            doc.addImage(imgData, 'PNG', 15, currentY, 180, 70);
            currentY += 85;
          } catch (e) {
            console.error(`Failed to capture chart ${chart.id}`, e);
          }
        }
      }

      doc.save(`School_Health_Report_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
    } catch (error) {
      console.error("PDF Generation failed:", error);
    } finally {
      setIsGeneratingReport(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Analytics Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-2 h-2 rounded-full bg-teal-500 animate-pulse" />
            <span className="text-teal-600 text-[10px] font-bold uppercase tracking-widest">Real-time Health Data</span>
          </div>
          <h2 className="text-3xl font-bold tracking-tight text-slate-900 font-sans">Population Analytics</h2>
          <p className="text-slate-500 text-sm">BMI overview and health metrics.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3 bg-slate-100 p-1 rounded-2xl border border-slate-200">
          {/* Filters grouped for cleaner look */}
          <div className="flex items-center gap-1 pr-2 border-r border-slate-200 mr-2">
             <Filter className="w-3.5 h-3.5 text-slate-400 ml-2" />
          </div>
          
          <div className="flex gap-1 overflow-x-auto">
             {(['7d', '30d', '90d', 'all'] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setDateFilter(f)}
                  className={cn(
                    "px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-xl transition-all whitespace-nowrap",
                    dateFilter === f 
                      ? "bg-white text-teal-600 shadow-sm" 
                      : "text-slate-500 hover:text-slate-900"
                  )}
                >
                  {f === 'all' ? 'Chronic' : `${f.replace('d', '')} Days`}
                </button>
             ))}
          </div>

          <Button 
            onClick={handleDownloadPDF} 
            disabled={isGeneratingReport || loading || !data}
            className="bg-teal-600 text-white hover:bg-teal-700 shadow-lg shadow-teal-100 h-10 px-6 rounded-xl border-none"
          >
            {isGeneratingReport ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4 mr-2 text-white/50" />
            )}
            {isGeneratingReport ? 'Synthesizing...' : 'Health Report'}
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="h-[60vh] flex flex-col items-center justify-center text-zinc-400 bg-white rounded-2xl border border-zinc-200">
          <Loader2 className="w-12 h-12 mb-4 animate-spin opacity-20" />
          <p className="text-lg font-medium">Loading analytics...</p>
        </div>
      ) : error ? (
        <div className="h-[60vh] flex flex-col items-center justify-center text-red-400 bg-white rounded-2xl border border-red-100 p-8 text-center">
          <AlertCircle className="w-12 h-12 mb-4 opacity-20" />
          <p className="text-lg font-medium">Failed to load analytics</p>
          <p className="text-sm text-zinc-500 max-w-md mt-2">
            {error.includes('index') 
              ? "A Firestore index is required for this view. If you are the developer, check the browser console for a link to create it."
              : error}
          </p>
        </div>
      ) : !data ? (
        <div className="h-[60vh] flex flex-col items-center justify-center text-zinc-400 bg-white rounded-2xl border border-dashed border-zinc-200">
          <Activity className="w-12 h-12 mb-4 opacity-20" />
          <p className="text-lg font-medium">No data available for the selected period</p>
          <p className="text-sm">Try changing the date filter or adding more records.</p>
        </div>
      ) : (
        <>
          {/* Top Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card className="p-6 border-l-4 border-l-teal-500">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-teal-50 rounded-2xl flex items-center justify-center text-teal-600 shadow-sm">
                  <Users className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Student Total</p>
                  <p className="text-3xl font-bold text-slate-900 font-mono">{data.totalStudents}</p>
                </div>
              </div>
            </Card>
            <Card className="p-6 border-l-4 border-l-blue-500">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 shadow-sm">
                  <Activity className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Active Monitoring</p>
                  <p className="text-3xl font-bold text-slate-900 font-mono">{data.activeStudents}</p>
                </div>
              </div>
            </Card>
            <Card className="p-6 border-l-4 border-l-amber-500">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-600 shadow-sm">
                  <History className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total Evaluations</p>
                  <p className="text-3xl font-bold text-slate-900 font-mono">{data.totalRecords}</p>
                </div>
              </div>
            </Card>
            <Card className="p-6 border-l-4 border-l-teal-600">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-teal-50 rounded-2xl flex items-center justify-center text-teal-700 shadow-sm">
                  <Activity className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Median BMI</p>
                  <p className="text-3xl font-bold text-slate-900 font-mono">{data.avgBMI}</p>
                </div>
              </div>
            </Card>
          </div>

          {/* Charts Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* BMI Distribution */}
            <Card className="p-6" id="chart-bmi-dist">
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-bold flex items-center gap-2">
                  <PieChartIcon className="w-4 h-4 text-zinc-400" /> BMI Distribution
                  <InfoTooltip content="Shows the percentage of students in each BMI category (Underweight, Normal, Overweight, Obese) based on their latest records." />
                </h3>
              </div>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={data.pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={5}
                      dataKey="value"
                      isAnimationActive={false}
                    >
                      {data.pieData.map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                    />
                    <Legend verticalAlign="bottom" height={36}/>
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </Card>

            {/* Global BMI Trend */}
            <Card className="p-6" id="chart-bmi-trend">
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-bold flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-zinc-400" /> Global BMI Trend
                  <InfoTooltip content="Tracks the average BMI of all students over time. Helps identify if the overall student population's health is improving or declining." />
                </h3>
              </div>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data.trendData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                    <XAxis 
                      dataKey="date" 
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 12, fill: '#888' }}
                    />
                    <YAxis 
                      domain={['dataMin - 1', 'dataMax + 1']}
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 12, fill: '#888' }}
                    />
                    <Tooltip 
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="bmi" 
                      stroke="#18181b" 
                      strokeWidth={3} 
                      dot={{ r: 4, fill: '#18181b', strokeWidth: 2, stroke: '#fff' }}
                      activeDot={{ r: 6, strokeWidth: 0 }}
                      isAnimationActive={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Card>

            {/* Gender Distribution */}
            <Card className="p-6" id="chart-gender-dist">
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-bold flex items-center gap-2">
                  <Users className="w-4 h-4 text-zinc-400" /> Gender Demographics
                  <InfoTooltip content="Breakdown of student population by gender. Useful for identifying gender-specific health trends." />
                </h3>
              </div>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={data.genderData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={5}
                      dataKey="value"
                      isAnimationActive={false}
                    >
                      {data.genderData.map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                    />
                    <Legend verticalAlign="bottom" height={36}/>
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </Card>

            {/* Grade Distribution */}
            <Card className="p-6" id="chart-grade-dist">
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-bold flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-zinc-400" /> Grade Population
                  <InfoTooltip content="Number of students recorded in each grade level. Helps ensure all grades are being monitored equally." />
                </h3>
              </div>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.gradeData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                    <XAxis 
                      dataKey="name" 
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 12, fill: '#888' }}
                    />
                    <YAxis 
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 12, fill: '#888' }}
                    />
                    <Tooltip 
                      cursor={{ fill: '#f8f8f8' }}
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                    />
                    <Bar dataKey="value" fill="#18181b" radius={[4, 4, 0, 0]} isAnimationActive={false} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>

            {/* Avg BMI by Grade */}
            <Card className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-bold flex items-center gap-2">
                  <Activity className="w-4 h-4 text-zinc-400" /> Avg. BMI by Grade
                  <InfoTooltip content="Compares the average BMI across different grade levels. Useful for identifying specific age groups that may need health interventions." />
                </h3>
              </div>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.gradeBMIData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                    <XAxis 
                      dataKey="name" 
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 12, fill: '#888' }}
                    />
                    <YAxis 
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 12, fill: '#888' }}
                      domain={['dataMin - 1', 'dataMax + 1']}
                    />
                    <Tooltip 
                      cursor={{ fill: '#f8f8f8' }}
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                    />
                    <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}

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
  const [globalRecords, setGlobalRecords] = useState<BMIRecord[]>([]);
  const [analyticsLoading, setAnalyticsLoading] = useState(true);
  const [analyticsError, setAnalyticsError] = useState<string | null>(null);
  const [dateFilter, setDateFilter] = useState<'7d' | '30d' | '90d' | 'all'>('all');
  const [genderFilter, setGenderFilter] = useState<'all' | 'male' | 'female' | 'other'>('all');
  const [ageFilter, setAgeFilter] = useState<'all' | 'under10' | '10-15' | 'over15'>('all');
  const [activeTab, setActiveTab] = useState<'dashboard' | 'students'>('dashboard');

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
      if (currentUser) {
        // Reset isAdmin to null while we check their status
        setIsAdmin(null);
        setUser(currentUser);
        
        try {
          // Check if admin
          const adminDoc = await getDoc(doc(db, 'admins', currentUser.uid));
          const adminEmail = import.meta.env.VITE_ADMIN_EMAIL || 'newroskoto@gmail.com';
          const isDefaultAdmin = currentUser.email === adminEmail || currentUser.email === 'admin@gmail.com';
          
          const hasAdminDoc = adminDoc.exists() && adminDoc.data()?.role === 'admin';
          setIsAdmin(hasAdminDoc || isDefaultAdmin);
          
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
          console.error("Auth check failed:", error);
          if (error.message?.includes('the client is offline')) {
            setConfigError('the client is offline');
          } else {
            setIsAdmin(false);
          }
        }
      } else {
        setUser(null);
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
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'students');
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
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, `students/${selectedStudent.id}/records`);
    });
    return unsubscribe;
  }, [selectedStudent?.id]);

  // Global Records Listener for Analytics
  useEffect(() => {
    if (!isAdmin) return;
    
    let q = query(collectionGroup(db, 'records'));
    
    setAnalyticsLoading(true);
    setAnalyticsError(null);
    const unsubscribe = onSnapshot(q, (snapshot) => {
      console.log(`Global records fetched: ${snapshot.docs.length} documents`);
      const recordData = snapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id
      })) as BMIRecord[];
      
      // Sort in memory to avoid needing a composite index
      recordData.sort((a, b) => {
        const timeA = a.timestamp?.toMillis() || 0;
        const timeB = b.timestamp?.toMillis() || 0;
        return timeB - timeA;
      });

      setGlobalRecords(recordData);
      setAnalyticsLoading(false);
    }, (error) => {
      console.error("Global records fetch error:", error);
      const err = handleFirestoreError(error, OperationType.LIST, 'records (collectionGroup)');
      setAnalyticsError(err.error);
      setAnalyticsLoading(false);
    });
    return unsubscribe;
  }, [isAdmin]);

  const filteredGlobalRecords = useMemo(() => {
    let filtered = globalRecords;
    
    // Date Filter
    if (dateFilter !== 'all') {
      const days = dateFilter === '7d' ? 7 : dateFilter === '30d' ? 30 : 90;
      const cutoff = subDays(new Date(), days);
      filtered = filtered.filter(r => r.timestamp && r.timestamp.toDate() >= cutoff);
    }

    // Gender & Age Filter (requires student data)
    return filtered.filter(r => {
      const student = students.find(s => s.id === r.studentId);
      if (!student) return false;

      // Gender Filter
      if (genderFilter !== 'all' && student.gender !== genderFilter) return false;

      // Age Filter
      if (ageFilter !== 'all') {
        const age = differenceInYears(new Date(), parseISO(student.dob));
        if (ageFilter === 'under10' && age >= 10) return false;
        if (ageFilter === '10-15' && (age < 10 || age > 15)) return false;
        if (ageFilter === 'over15' && age <= 15) return false;
      }

      return true;
    });
  }, [globalRecords, dateFilter, genderFilter, ageFilter, students]);

  const analyticsData = useMemo(() => {
    const totalStudents = students.length;
    const totalRecords = filteredGlobalRecords.length;
    
    if (totalRecords === 0) return null;

    const avgBMI = filteredGlobalRecords.reduce((acc, r) => acc + r.bmi, 0) / totalRecords;
    
    // BMI Distribution
    const categories = {
      underweight: 0,
      normal: 0,
      overweight: 0,
      obese: 0
    };
    
    filteredGlobalRecords.forEach(r => {
      if (r.bmi < 18.5) categories.underweight++;
      else if (r.bmi < 25) categories.normal++;
      else if (r.bmi < 30) categories.overweight++;
      else categories.obese++;
    });

    const pieData = [
      { name: 'Underweight', value: categories.underweight, color: '#3b82f6' },
      { name: 'Normal', value: categories.normal, color: '#22c55e' },
      { name: 'Overweight', value: categories.overweight, color: '#eab308' },
      { name: 'Obese', value: categories.obese, color: '#ef4444' }
    ].filter(d => d.value > 0);

    // Demography population (students who had records in this period)
    const activeStudentIds = new Set(filteredGlobalRecords.map(r => r.studentId));
    const demographyPopulation = students.filter(s => activeStudentIds.has(s.id));

    // Gender Distribution
    const genders = { male: 0, female: 0, other: 0 };
    demographyPopulation.forEach(s => {
      if (s.gender in genders) {
        genders[s.gender as keyof typeof genders]++;
      }
    });
    
    const genderData = [
      { name: 'Male', value: genders.male, color: '#0ea5e9' },
      { name: 'Female', value: genders.female, color: '#ec4899' },
      { name: 'Other', value: genders.other, color: '#64748b' }
    ].filter(d => d.value > 0);

    // Grade Distribution
    const gradeMap: Record<string, number> = {};
    demographyPopulation.forEach(s => {
      const grade = s.grade || 'Unknown';
      gradeMap[grade] = (gradeMap[grade] || 0) + 1;
    });
    
    const gradeData = Object.entries(gradeMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([name, value]) => ({ name, value }));

    // Avg BMI by Grade
    const gradeBMIMap: Record<string, { sum: number, count: number }> = {};
    filteredGlobalRecords.forEach(r => {
      const student = students.find(s => s.id === r.studentId);
      const grade = student?.grade || 'Unknown';
      if (!gradeBMIMap[grade]) gradeBMIMap[grade] = { sum: 0, count: 0 };
      gradeBMIMap[grade].sum += r.bmi;
      gradeBMIMap[grade].count++;
    });
    
    const gradeBMIData = Object.entries(gradeBMIMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([name, data]) => ({
        name,
        value: parseFloat((data.sum / data.count).toFixed(2))
      }));

    // Trend Data (Average BMI per day)
    const dailyMap: Record<string, { sum: number, count: number, rawDate: Date }> = {};
    filteredGlobalRecords.forEach(r => {
      if (!r.timestamp) return;
      const dateObj = r.timestamp.toDate();
      const dateKey = format(dateObj, 'yyyy-MM-dd');
      if (!dailyMap[dateKey]) dailyMap[dateKey] = { sum: 0, count: 0, rawDate: dateObj };
      dailyMap[dateKey].sum += r.bmi;
      dailyMap[dateKey].count++;
    });

    const trendData = Object.entries(dailyMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([_, data]) => ({
        date: format(data.rawDate, 'MMM dd'),
        bmi: parseFloat((data.sum / data.count).toFixed(2))
      }));

    return {
      totalStudents,
      activeStudents: demographyPopulation.length,
      totalRecords,
      avgBMI: parseFloat(avgBMI.toFixed(2)),
      pieData,
      genderData,
      gradeData,
      gradeBMIData,
      trendData
    };
  }, [students, filteredGlobalRecords]);

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

  const handleDelete = async () => {
    if (!showDeleteConfirm) return;
    const { type, id } = showDeleteConfirm;
    
    try {
      if (type === 'student') {
        const studentToDelete = students.find(s => s.id === id);
        if (studentToDelete?.photoUrl) {
          try {
            await deleteStudentPhoto(studentToDelete.photoUrl);
          } catch (e) {
            console.error("Photo Removal Error:", e);
          }
        }
        await deleteDoc(doc(db, 'students', id));
        if (selectedStudent?.id === id) setSelectedStudent(null);
      } else if (type === 'record' && selectedStudent) {
        await deleteDoc(doc(db, `students/${selectedStudent.id}/records`, id));
      }
      setShowDeleteConfirm(null);
    } catch (error) {
      console.error('Removal Failure', error);
      alert('Security Protocol: Failed to remove record');
    }
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
            <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mx-auto shadow-lg overflow-hidden border border-zinc-100">
              <img 
                src="https://gjfwrphhhgodjhtgwmum.supabase.co/storage/v1/object/public/Logos/bmi-logo.jpg" 
                alt="BMI Tracker Logo" 
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
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

  if (isAdmin === false) {
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
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-teal-600 rounded-xl flex items-center justify-center overflow-hidden shadow-lg shadow-teal-100">
              <Activity className="w-6 h-6 text-white" />
            </div>
            <div className="flex flex-col mr-8 whitespace-nowrap">
              <span className="font-bold text-lg leading-tight text-slate-800">BMI Monitor</span>
              <span className="text-[10px] font-bold text-teal-600 uppercase tracking-tighter">BMI Tracking System</span>
            </div>
            
            <nav className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
              <button 
                onClick={() => setActiveTab('dashboard')}
                className={cn(
                  "px-3 md:px-5 py-2 text-xs md:text-sm font-bold rounded-lg transition-all flex items-center gap-2",
                  activeTab === 'dashboard' 
                    ? "bg-white text-teal-600 shadow-sm" 
                    : "text-slate-500 hover:text-slate-700 hover:bg-white/50"
                )}
              >
                <LayoutDashboard className="w-4 h-4" />
                <span className="hidden xs:inline">Dashboard</span>
              </button>
              <button 
                onClick={() => setActiveTab('students')}
                className={cn(
                  "px-3 md:px-5 py-2 text-xs md:text-sm font-bold rounded-lg transition-all flex items-center gap-2",
                  activeTab === 'students' 
                    ? "bg-white text-teal-600 shadow-sm" 
                    : "text-slate-500 hover:text-slate-700 hover:bg-white/50"
                )}
              >
                <ClipboardList className="w-4 h-4" />
                <span className="hidden xs:inline">Student List</span>
              </button>
            </nav>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden md:flex flex-col items-end">
              <span className="text-sm font-bold text-slate-700">{user.displayName || user.email}</span>
              <span className="text-[10px] font-bold text-teal-600 uppercase tracking-widest flex items-center gap-1">
                <ShieldCheck className="w-3 h-3" /> Authorized Staff
              </span>
            </div>
            <Button variant="ghost" onClick={handleLogout} className="p-2 h-10 w-10 text-slate-400 hover:text-rose-500">
              <LogOut className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto p-4">
        {activeTab === 'dashboard' ? (
          <AnalyticsDashboard 
            data={analyticsData} 
            dateFilter={dateFilter} 
            setDateFilter={setDateFilter}
            genderFilter={genderFilter}
            setGenderFilter={setGenderFilter}
            ageFilter={ageFilter}
            setAgeFilter={setAgeFilter}
            loading={analyticsLoading}
            error={analyticsError}
          />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pb-20">
            {/* Sidebar: Student List */}
        <div className="lg:col-span-4 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex flex-col">
              <h2 className="text-lg font-bold text-slate-800">Student Directory</h2>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total: {filteredStudents.length} Records</span>
            </div>
            <Button variant="primary" onClick={() => setShowAddStudent(true)} className="p-2 h-10 w-10 rounded-xl">
              <Plus className="w-5 h-5" />
            </Button>
          </div>

          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-teal-500 transition-colors" />
            <Input 
              placeholder="Filter by name or ID..." 
              className="pl-9 bg-slate-100/50 border-transparent focus:bg-white"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="space-y-2 overflow-y-auto max-h-[calc(100vh-250px)] pr-2 scrollbar-thin">
            {filteredStudents.map(student => (
              <button
                key={student.id}
                onClick={() => setSelectedStudent(student)}
                className={cn(
                  "w-full text-left p-4 rounded-2xl border-2 transition-all flex items-center justify-between group overflow-hidden relative",
                  selectedStudent?.id === student.id 
                    ? "bg-white border-teal-500 shadow-lg shadow-teal-100/50 ring-4 ring-teal-50" 
                    : "bg-white border-transparent hover:border-slate-200"
                )}
              >
                <div className="flex items-center gap-3 relative z-10">
                  <div className={cn(
                    "w-12 h-12 rounded-xl flex items-center justify-center overflow-hidden transition-all",
                    selectedStudent?.id === student.id ? "bg-teal-50 text-teal-600 scale-110" : "bg-slate-100 text-slate-400"
                  )}>
                    {student.photoUrl ? (
                      <img src={student.photoUrl} alt={student.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      <UserIcon className="w-6 h-6" />
                    )}
                  </div>
                  <div>
                    <div className={cn(
                      "font-bold transition-colors",
                      selectedStudent?.id === student.id ? "text-slate-900" : "text-slate-700"
                    )}>{student.name}</div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] font-mono bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded uppercase tracking-tighter">
                        ID: {student.id}
                      </span>
                      <span className="text-[10px] font-bold text-teal-600 uppercase tracking-widest opacity-60">
                        {student.grade || 'N/A'}
                      </span>
                    </div>
                  </div>
                </div>
                <ChevronRight className={cn(
                  "w-5 h-5 transition-all",
                  selectedStudent?.id === student.id ? "text-teal-500 translate-x-1" : "text-slate-300 group-hover:translate-x-1"
                )} />
                {selectedStudent?.id === student.id && (
                  <motion.div 
                    layoutId="active-indicator"
                    className="absolute left-0 top-0 bottom-0 w-1.5 bg-teal-500"
                  />
                )}
              </button>
            ))}
            {filteredStudents.length === 0 && (
              <div className="text-center py-20 bg-slate-50 rounded-[2rem] border-2 border-dashed border-slate-200">
                <Search className="w-12 h-12 mx-auto mb-3 text-slate-300 opacity-50" />
                <h4 className="text-slate-800 font-bold">No Records Found</h4>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Check registry query terms</p>
                <Button variant="ghost" onClick={() => setSearchQuery('')} className="mt-4 text-xs font-bold text-teal-600 hover:text-teal-700">Clear Search</Button>
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
                <Card className="p-8 bg-slate-900 border-none shadow-2xl relative overflow-hidden ring-1 ring-white/10">
                  {/* Decorative Pulse Wave */}
                  <div className="absolute right-0 top-0 bottom-0 w-1/3 opacity-10 pointer-events-none text-teal-400">
                    <svg viewBox="0 0 100 100" className="w-full h-full opacity-20" fill="none" stroke="currentColor" strokeWidth="0.5">
                      <path d="M0 50 Q25 40 50 50 T100 50" />
                    </svg>
                  </div>

                  <div className="relative z-10 flex flex-col md:flex-row md:items-start justify-between gap-8">
                    <div className="flex flex-col md:flex-row gap-8">
                      {/* Student Photo */}
                      <div className="relative">
                        <div className="w-32 h-32 rounded-3xl bg-white/5 border-2 border-white/10 flex items-center justify-center overflow-hidden shrink-0 shadow-inner">
                          {selectedStudent.photoUrl ? (
                            <img src={selectedStudent.photoUrl} alt={selectedStudent.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                          ) : (
                            <UserIcon className="w-12 h-12 text-white/20" />
                          )}
                        </div>
                        <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-teal-500 rounded-lg flex items-center justify-center border-2 border-slate-900 shadow-lg">
                          <ShieldCheck className="w-4 h-4 text-white" />
                        </div>
                      </div>

                      <div className="space-y-6">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                             <div className="w-2 h-2 rounded-full bg-teal-500 animate-pulse" />
                             <span className="text-teal-400 text-[10px] font-bold uppercase tracking-[0.2em]">Record Active</span>
                          </div>
                          <h1 className="text-4xl font-bold text-white tracking-tight">{selectedStudent.name}</h1>
                        </div>
                        
                        <div className="flex flex-wrap items-center gap-3 text-slate-300">
                          <div className="flex items-center gap-2 bg-white/5 px-3 py-1.5 rounded-xl border border-white/5 text-xs font-mono">
                            <ImageIcon className="w-3.5 h-3.5 text-teal-400" /> REF: {selectedStudent.id}
                          </div>
                          <div className="flex items-center gap-2 bg-white/5 px-3 py-1.5 rounded-xl border border-white/5 text-xs font-bold uppercase tracking-wider">
                            <GraduationCap className="w-3.5 h-3.5 text-teal-400" /> {selectedStudent.grade || 'General'}
                          </div>
                          <div className="flex items-center gap-2 bg-white/5 px-3 py-1.5 rounded-xl border border-white/5 text-xs font-bold uppercase tracking-wider">
                            <CalendarIcon className="w-3.5 h-3.5 text-teal-400" /> {calculateAge(selectedStudent.dob)}y
                          </div>
                          <div className="flex items-center gap-2 bg-white/5 px-3 py-1.5 rounded-xl border border-white/5 text-xs font-bold uppercase tracking-wider">
                            <UserCircle className="w-3.5 h-3.5 text-teal-400" /> {selectedStudent.gender}
                          </div>
                        </div>

                        {selectedStudent.allergies && selectedStudent.allergies.length > 0 && (
                          <div className="flex flex-wrap items-center gap-2 pt-2">
                            <div className="flex items-center gap-1.5 text-rose-400 mr-2">
                               <AlertCircle className="w-4 h-4" />
                               <span className="text-[10px] font-bold uppercase tracking-widest">Health Alerts:</span>
                            </div>
                            {selectedStudent.allergies.map(a => (
                              <span key={a} className="px-3 py-1 bg-rose-500/10 text-rose-300 text-[10px] font-bold rounded-lg border border-rose-500/20 uppercase tracking-wide">
                                {a}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex flex-col gap-4 min-w-[200px]">
                      <div className="space-y-3 p-4 bg-white/5 rounded-2xl border border-white/5 backdrop-blur-sm">
                        <div className="text-[10px] font-bold text-teal-400 uppercase tracking-widest text-center">Record Actions</div>
                        <Button 
                          onClick={async () => {
                             const doc = new jsPDF();
                             doc.setFontSize(20);
                             doc.text(`Health Report: ${selectedStudent.name}`, 15, 20);
                             
                             doc.setFontSize(12);
                             doc.text(`ID Reference: ${selectedStudent.id}`, 15, 30);
                             doc.text(`Grade/Class: ${selectedStudent.grade}`, 15, 37);
                             doc.text(`Gender: ${selectedStudent.gender}`, 15, 44);
                             doc.text(`Recorded Allergies: ${selectedStudent.allergies?.join(', ') || 'None'}`, 15, 51);
                             
                             doc.setFontSize(16);
                             doc.text("AI Health Summary", 15, 65);
                             
                             const aiAnalysis = await generateAIReport({
                               student: selectedStudent,
                               history: records
                             }, 'individual');
                             
                             doc.setFontSize(10);
                             const splitText = doc.splitTextToSize(aiAnalysis || "No analysis available.", 180);
                             doc.text(splitText, 15, 70);

                             let currentY = 70 + (splitText.length * 5) + 10;

                             // Capture Individual Chart
                             const chartElement = document.getElementById('student-bmi-trend');
                             if (chartElement) {
                               try {
                                 const canvas = await html2canvas(chartElement, { scale: 2, backgroundColor: '#ffffff' });
                                 const imgData = canvas.toDataURL('image/png');
                                 doc.setFontSize(14);
                                 doc.text("BMI Trend", 15, currentY);
                                 doc.addImage(imgData, 'PNG', 15, currentY + 5, 180, 60);
                                 currentY += 75;
                               } catch (e) {
                                 console.error("Failed to capture record screenshot", e);
                               }
                             }

                             autoTable(doc, {
                               startY: currentY,
                               head: [['Date', 'Height', 'Weight', 'BMI', 'Health Issues']],
                               body: records.map(r => [
                                 r.timestamp ? format(r.timestamp.toDate(), 'PPP') : 'N/A',
                                 `${r.height}cm`,
                                 `${r.weight}kg`,
                                 r.bmi.toString(),
                                 r.healthIssues?.join(', ') || 'None'
                               ])
                             });

                             doc.save(`${selectedStudent.name}_Health_Report.pdf`);
                          }}
                          variant="outline" 
                          className="w-full border-white/10 text-white hover:bg-white/10 h-10 rounded-xl text-xs"
                        >
                          <FileText className="w-3.5 h-3.5 mr-2" /> BMI Report
                        </Button>
                        <Button 
                          onClick={() => setShowAddRecord(true)} 
                          className="w-full bg-teal-500 text-white hover:bg-teal-400 h-10 rounded-xl shadow-lg shadow-teal-500/20 text-xs"
                        >
                          <Plus className="w-4 h-4 mr-2" /> New BMI Record
                        </Button>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="ghost" onClick={() => setShowEditStudent(true)} className="flex-1 text-slate-400 hover:text-white h-9 text-xs">
                          <Edit2 className="w-3.5 h-3.5 mr-2" /> Edit Profile
                        </Button>
                        <Button variant="ghost" onClick={() => setShowDeleteConfirm({ type: 'student', id: selectedStudent.id })} className="h-9 w-9 p-0 text-slate-500 hover:text-rose-400">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                  <Activity className="absolute -right-8 -bottom-8 w-48 h-48 text-teal-400/5 rotate-12" />
                </Card>

                {/* BMI Trend Chart */}
                {records.length > 1 && (
                  <Card className="p-8 shadow-xl shadow-slate-200/50 border-slate-100" id="student-bmi-trend">
                    <div className="flex items-center justify-between mb-8">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-teal-50 rounded-xl flex items-center justify-center text-teal-600">
                          <TrendingUp className="w-5 h-5" />
                        </div>
                        <div>
                          <h3 className="font-bold text-slate-800">BMI Trend</h3>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mt-1">Weight & Height Correlation</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                         <div className="flex items-center gap-1.5">
                            <div className="w-2.5 h-2.5 rounded-full bg-teal-500" />
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">BMI Data Points</span>
                         </div>
                      </div>
                    </div>
                    <div className="h-[280px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={[...records].reverse().map(r => ({
                          date: r.timestamp ? format(r.timestamp.toDate(), 'MMM d') : '',
                          bmi: r.bmi
                        }))}>
                          <CartesianGrid strokeDasharray="6 6" vertical={false} stroke="#f1f5f9" />
                          <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b', fontWeight: 600 }} dy={10} />
                          <YAxis domain={['dataMin - 1', 'dataMax + 1']} axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b', fontWeight: 600 }} dx={-10} />
                          <Tooltip 
                            contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', padding: '12px' }}
                            itemStyle={{ fontSize: '12px', fontWeight: 'bold' }}
                          />
                          <Line 
                            type="monotone" 
                            dataKey="bmi" 
                            stroke="#0d9488" 
                            strokeWidth={4} 
                            dot={{ r: 6, fill: '#0d9488', strokeWidth: 3, stroke: '#fff' }} 
                            activeDot={{ r: 8, fill: '#0d9488', strokeWidth: 4, stroke: '#f0fdfa' }}
                            isAnimationActive={false} 
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </Card>
                )}

                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <Card className="p-5 flex items-center gap-4 bg-white border-slate-100 shadow-sm transition-all hover:shadow-md active:scale-[0.98]">
                    <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 shrink-0">
                      <Ruler className="w-7 h-7" />
                    </div>
                    <div>
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Height</div>
                      <div className="text-2xl font-bold text-slate-800 font-mono tracking-tighter">
                        {records[0]?.height || '--'} 
                        <span className="text-sm font-bold text-slate-300 ml-1">cm</span>
                      </div>
                    </div>
                  </Card>
                  <Card className="p-5 flex items-center gap-4 bg-white border-slate-100 shadow-sm transition-all hover:shadow-md active:scale-[0.98]">
                    <div className="w-14 h-14 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-600 shrink-0">
                      <Scale className="w-7 h-7" />
                    </div>
                    <div>
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Mass (Weight)</div>
                      <div className="text-2xl font-bold text-slate-800 font-mono tracking-tighter">
                        {records[0]?.weight || '--'} 
                        <span className="text-sm font-bold text-slate-300 ml-1">kg</span>
                      </div>
                    </div>
                  </Card>
                  <Card className="p-5 flex items-center gap-4 bg-white border-slate-100 shadow-sm transition-all hover:shadow-md active:scale-[0.98]">
                    <div className="w-14 h-14 bg-teal-50 rounded-2xl flex items-center justify-center text-teal-600 shrink-0">
                      <Activity className="w-7 h-7" />
                    </div>
                    <div className="flex-1">
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Evaluation (BMI)</div>
                      <div className="flex items-center justify-between">
                         <div className="text-2xl font-bold text-slate-800 font-mono tracking-tighter">
                           {records[0]?.bmi || '--'}
                         </div>
                         {records[0] && (
                           <div className={cn("px-2 py-1 rounded-lg text-[9px] font-bold uppercase tracking-wider border flex items-center gap-1 shadow-sm", getBMICategory(records[0].bmi).color)}>
                             {React.createElement(getBMICategory(records[0].bmi).icon, { className: "w-3 h-3" })}
                             {getBMICategory(records[0].bmi).label}
                           </div>
                         )}
                      </div>
                    </div>
                  </Card>
                </div>

                {/* History Table */}
                <Card className="shadow-lg border-slate-100 overflow-hidden">
                  <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center text-slate-400 shadow-sm border border-slate-100">
                        <History className="w-4 h-4" />
                      </div>
                      <h3 className="font-bold text-slate-800">Longitudinal History</h3>
                    </div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{records.length} Evaluations Found</span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                      <thead>
                        <tr className="bg-slate-50/80 text-slate-500 font-bold border-b border-slate-100 uppercase text-[10px] tracking-widest">
                          <th className="px-6 py-4">Record Date</th>
                          <th className="px-6 py-4 text-center">Height</th>
                          <th className="px-6 py-4 text-center">Mass</th>
                          <th className="px-6 py-4 text-center">Metric (BMI)</th>
                          <th className="px-6 py-4">Alerts/Issues</th>
                          <th className="px-6 py-4 text-center">Status</th>
                          <th className="px-6 py-4 text-right">Records</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {records.map(record => (
                          <tr key={record.id} className="hover:bg-slate-50/50 transition-colors group">
                            <td className="px-6 py-4 font-bold text-slate-700">
                              <div className="flex items-center gap-2">
                                <CalendarIcon className="w-3.5 h-3.5 text-slate-300" />
                                {record.timestamp ? format(record.timestamp.toDate(), 'PPP') : 'Processing...'}
                              </div>
                            </td>
                            <td className="px-6 py-4 text-center font-mono text-slate-600">{record.height}<span className="text-[10px] text-slate-400 ml-0.5">cm</span></td>
                            <td className="px-6 py-4 text-center font-mono text-slate-600">{record.weight}<span className="text-[10px] text-slate-400 ml-0.5">kg</span></td>
                            <td className="px-6 py-4 text-center">
                               <span className="text-base font-black text-slate-800 tracking-tighter">{record.bmi}</span>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex flex-wrap gap-1.5">
                                {record.healthIssues && record.healthIssues.length > 0 ? (
                                  record.healthIssues.map(i => (
                                    <span key={i} className="px-2 py-0.5 bg-rose-50 text-rose-600 text-[9px] font-bold rounded-md border border-rose-100 uppercase tracking-wide">
                                      {i}
                                    </span>
                                  ))
                                ) : (
                                  <div className="flex items-center gap-1.5 text-teal-600 text-[10px] font-bold uppercase tracking-tight">
                                     <ShieldCheck className="w-3.5 h-3.5" />
                                     Nominal
                                  </div>
                                )}
                              </div>
                            </td>
                            <td className="px-6 py-4 text-center">
                              <div className={cn("inline-flex items-center gap-1 py-1 px-3 rounded-full text-[10px] font-bold border uppercase tracking-wider shadow-sm", getBMICategory(record.bmi).color)}>
                                {record.bmi}
                              </div>
                            </td>
                            <td className="px-6 py-4 text-right">
                              <Button 
                                variant="ghost" 
                                onClick={() => setShowDeleteConfirm({ type: 'record', id: record.id })}
                                className="h-8 w-8 p-0 text-slate-300 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {records.length === 0 && (
                      <div className="p-16 text-center bg-white">
                        <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-dashed border-slate-200">
                           <FileText className="w-8 h-8 text-slate-300" />
                        </div>
                        <h4 className="text-slate-800 font-bold">No Records Found</h4>
                        <p className="text-slate-400 text-sm mt-1">This student does not have any recorded BMI data.</p>
                        <Button onClick={() => setShowAddRecord(true)} variant="outline" className="mt-6 border-teal-200 text-teal-600 hover:bg-teal-50">
                           Add First Record
                        </Button>
                      </div>
                    )}
                  </div>
                </Card>
              </motion.div>
            </AnimatePresence>
          ) : (
            <div className="h-[80vh] flex flex-col items-center justify-center text-center p-12 bg-white rounded-[2rem] border border-slate-100 shadow-sm relative overflow-hidden">
               <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-teal-500 via-blue-500 to-rose-500" />
               <div className="relative">
                  <div className="w-24 h-24 bg-slate-50 rounded-3xl flex items-center justify-center mb-6 border border-slate-100 shadow-inner group-hover:scale-110 transition-transform">
                    <UserCircle className="w-12 h-12 text-slate-200" />
                  </div>
                  <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-white rounded-2xl shadow-xl flex items-center justify-center border border-slate-50 text-teal-500">
                    <Crosshair className="w-5 h-5" />
                  </div>
               </div>
               <h2 className="text-2xl font-black text-slate-800 tracking-tight">No Student Selected</h2>
               <p className="text-slate-400 text-sm max-w-sm mt-3 leading-relaxed font-medium">
                 Select a student from the list to review BMI records, trends, and history.
               </p>
               <Button onClick={() => setShowAddStudent(true)} variant="outline" className="mt-8 border-slate-200 text-slate-500 hover:text-teal-600 hover:border-teal-200 hover:bg-teal-50/50 rounded-xl px-8">
                  <Plus className="w-4 h-4 mr-2" /> Add New Student
               </Button>
            </div>
          )}
        </div>
      </div>
          )}
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
          <Modal onClose={() => setShowDeleteConfirm(null)} title="System Deletion Authority">
            <div className="p-6 space-y-6">
              <div className="flex items-center gap-4 text-rose-600 bg-rose-50 p-4 rounded-3xl border border-rose-100">
                 <div className="w-12 h-12 bg-rose-600 rounded-2xl flex items-center justify-center text-white shrink-0 shadow-lg shadow-rose-200">
                    <AlertCircle className="w-6 h-6" />
                 </div>
                 <div>
                    <h4 className="font-bold">Permanent Delete</h4>
                    <p className="text-[10px] uppercase font-bold tracking-widest opacity-70">Security Protocol Alpha-6</p>
                 </div>
              </div>
              
              <p className="text-slate-600 text-sm leading-relaxed px-2 text-center font-medium">
                You are about to permanently remove this record from the system. 
                This action is <span className="text-rose-600 font-bold underline decoration-rose-200">irreversible</span>.
              </p>

              <div className="flex gap-3">
                <Button 
                  variant="ghost" 
                  onClick={() => setShowDeleteConfirm(null)} 
                  className="flex-1 h-12 rounded-2xl border-slate-200 font-bold uppercase tracking-widest text-xs"
                >
                  Go Back
                </Button>
                <Button 
                  onClick={handleDelete}
                  className="flex-1 h-12 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-bold uppercase tracking-widest text-xs shadow-xl shadow-rose-100"
                >
                  Confirm Removal
                </Button>
              </div>
            </div>
          </Modal>
        )}
      </AnimatePresence>
    </div>
  );
}

// --- Sub-components ---

const getBMICategory = (bmi: number) => {
  if (bmi < 18.5) return { label: 'Underweight', color: 'text-blue-600 bg-blue-50 border-blue-100', icon: TrendingDown };
  if (bmi < 25) return { label: 'Healthy', color: 'text-teal-600 bg-teal-50 border-teal-100', icon: ShieldCheck };
  if (bmi < 30) return { label: 'Overweight', color: 'text-amber-600 bg-amber-50 border-amber-100', icon: AlertCircle };
  return { label: 'Obese', color: 'text-rose-600 bg-rose-50 border-rose-100', icon: TrendingUp };
};

const calculateBMI = (h: number, w: number) => {
  const heightInMeters = h / 100;
  return parseFloat((w / (heightInMeters * heightInMeters)).toFixed(2));
};

const calculateAge = (dob: string) => {
  try {
    return differenceInYears(new Date(), parseISO(dob));
  } catch {
    return 0;
  }
};

function Modal({ children, onClose, title }: { children: React.ReactNode; onClose: () => void; title: string }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }} 
        animate={{ opacity: 1 }} 
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" 
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="bg-white rounded-3xl shadow-2xl w-full max-w-md relative z-10 overflow-hidden border border-slate-200"
      >
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-3">
             <div className="w-8 h-8 bg-white rounded-lg border border-slate-200 flex items-center justify-center text-teal-600 shadow-sm">
                <Crosshair className="w-4 h-4" />
             </div>
             <h3 className="text-lg font-bold text-slate-800 tracking-tight">{title}</h3>
          </div>
          <Button variant="ghost" onClick={onClose} className="p-1 h-8 w-8 rounded-lg hover:bg-slate-200 text-slate-400">
            <X className="w-4 h-4" />
          </Button>
        </div>
        <div className="p-8 max-h-[85vh] overflow-y-auto scrollbar-thin">
          {children}
        </div>
      </motion.div>
    </div>
  );
}

function StudentForm({ student, onSuccess }: { student?: Student; onSuccess: () => void }) {
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
    const gender = formData.get('gender') as 'male' | 'female' | 'other';

    try {
      let photoUrl = student?.photoUrl || '';
      if (photoFile) {
        photoUrl = await uploadStudentPhoto(photoFile, id);
      }

      await setDoc(doc(db, 'students', id), {
        id,
        name,
        grade,
        dob,
        gender,
        allergies,
        photoUrl,
        createdAt: student ? student.createdAt : serverTimestamp()
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
      {/* Student Photo ID */}
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
          <Input name="id" required placeholder="REF-0000" defaultValue={student?.id} readOnly={!!student} className={cn(student && "bg-slate-50 cursor-not-allowed")} />
        </div>
        <div className="space-y-1.5">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Assigned Grade</label>
          <Input name="grade" placeholder="e.g. 10-Alpha" defaultValue={student?.grade} />
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Student Name</label>
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

  // Auto-calculate BMI when height or weight changes, but allow manual override
  useEffect(() => {
    const h = parseFloat(height);
    const w = parseFloat(weight);
    if (h > 0 && w > 0) {
      const calculated = calculateBMI(h, w);
      setBmi(calculated.toString());
    }
  }, [height, weight, calculateBMI]);

  // Listen for ESP32 data when in automatic mode
  useEffect(() => {
    if (mode !== 'automatic' || !isWaiting) return;

    const deviceRef = doc(db, 'devices', 'esp32');
    
    // Trigger the request
    setDoc(deviceRef, { 
      requestBMI: true,
      lastUpdate: serverTimestamp()
    }, { merge: true }).catch(err => {
      console.error("Failed to trigger ESP32", err);
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
      // Reset request if modal closes or mode changes
      setDoc(deviceRef, { requestBMI: false }, { merge: true }).catch(() => {});
    };
  }, [mode, isWaiting]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    
    const finalHeight = parseFloat(height);
    const finalWeight = parseFloat(weight);
    const finalBmi = parseFloat(bmi);

    try {
      await addDoc(collection(db, `students/${studentId}/records`), {
        studentId,
        height: finalHeight,
        weight: finalWeight,
        bmi: finalBmi,
        healthIssues,
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
    <div className="space-y-6">
      {/* Scanning Mode Selection */}
      <div className="flex bg-slate-100 p-1 rounded-2xl border border-slate-200">
        <button
          onClick={() => { setMode('manual'); setIsWaiting(false); }}
          className={cn(
            "flex-1 flex items-center justify-center gap-2 py-2 text-[10px] font-bold uppercase tracking-widest rounded-xl transition-all",
            mode === 'manual' ? "bg-white text-teal-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
          )}
        >
          <Edit3 className="w-4 h-4" /> Manual Log
        </button>
        <button
          onClick={() => setMode('automatic')}
          className={cn(
            "flex-1 flex items-center justify-center gap-2 py-2 text-[10px] font-bold uppercase tracking-widest rounded-xl transition-all",
            mode === 'automatic' ? "bg-white text-teal-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
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
                   className={cn("pl-10 font-mono", mode === 'automatic' && "bg-slate-50")}
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
                   className={cn("pl-10 font-mono", mode === 'automatic' && "bg-slate-50")}
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
                   <div className={cn("px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider shadow-sm border", getBMICategory(parseFloat(bmi)).color)}>
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

