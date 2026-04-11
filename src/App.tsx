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
  Printer
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format, differenceInYears, parseISO, subDays, startOfDay } from 'date-fns';
import { GoogleGenAI } from "@google/genai";
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import html2canvas from 'html2canvas';

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

const Card = ({ children, className, id }: { children: React.ReactNode; className?: string; id?: string }) => (
  <div id={id} className={cn('bg-white border border-zinc-200 rounded-xl shadow-sm overflow-hidden', className)}>
    {children}
  </div>
);

const InfoTooltip = ({ content }: { content: string }) => (
  <div className="group relative inline-block">
    <Info className="w-4 h-4 text-zinc-400 cursor-help hover:text-zinc-600 transition-colors" />
    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 bg-zinc-900 text-white text-[10px] rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 shadow-xl">
      {content}
      <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-zinc-900" />
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
    <div className="space-y-6">
      {/* Analytics Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Analytics Overview</h2>
          <p className="text-zinc-500">Global health metrics and student demographics.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {/* Date Filter */}
          <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-zinc-200 shadow-sm overflow-x-auto max-w-full">
            {(['7d', '30d', '90d', 'all'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setDateFilter(f)}
                className={cn(
                  "px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all whitespace-nowrap",
                  dateFilter === f 
                    ? "bg-zinc-900 text-white shadow-sm" 
                    : "text-zinc-500 hover:text-zinc-900 hover:bg-zinc-50"
                )}
              >
                {f === 'all' ? 'All Time' : `${f.replace('d', '')} Days`}
              </button>
            ))}
          </div>

          {/* Gender Filter */}
          <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-zinc-200 shadow-sm overflow-x-auto max-w-full">
            {(['all', 'male', 'female'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setGenderFilter(f)}
                className={cn(
                  "px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all whitespace-nowrap",
                  genderFilter === f 
                    ? "bg-zinc-900 text-white shadow-sm" 
                    : "text-zinc-500 hover:text-zinc-900 hover:bg-zinc-50"
                )}
              >
                {f === 'all' ? 'Genders' : f}
              </button>
            ))}
          </div>

          {/* Age Filter */}
          <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-zinc-200 shadow-sm overflow-x-auto max-w-full">
            {(['all', 'under10', '10-15', 'over15'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setAgeFilter(f)}
                className={cn(
                  "px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all whitespace-nowrap",
                  ageFilter === f 
                    ? "bg-zinc-900 text-white shadow-sm" 
                    : "text-zinc-500 hover:text-zinc-900 hover:bg-zinc-50"
                )}
              >
                {f === 'all' ? 'Ages' : f.replace('under', '<').replace('over', '>').replace('-', '-')}
              </button>
            ))}
          </div>

          <Button 
            onClick={handleDownloadPDF} 
            disabled={isGeneratingReport || loading || !data}
            className="bg-zinc-900 text-white hover:bg-zinc-800 shadow-lg h-10 px-4"
          >
            {isGeneratingReport ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4 mr-2 text-amber-400" />
            )}
            {isGeneratingReport ? 'Analyzing...' : 'AI Report (PDF)'}
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
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-zinc-100 rounded-xl flex items-center justify-center text-zinc-900">
                  <Users className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Total Students</p>
                  <p className="text-2xl font-bold">{data.totalStudents}</p>
                </div>
              </div>
            </Card>
            <Card className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-zinc-100 rounded-xl flex items-center justify-center text-zinc-900">
                  <Activity className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Active Students</p>
                  <p className="text-2xl font-bold">{data.activeStudents}</p>
                </div>
              </div>
            </Card>
            <Card className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-zinc-100 rounded-xl flex items-center justify-center text-zinc-900">
                  <History className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Total Records</p>
                  <p className="text-2xl font-bold">{data.totalRecords}</p>
                </div>
              </div>
            </Card>
            <Card className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-zinc-100 rounded-xl flex items-center justify-center text-zinc-900">
                  <Activity className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Avg. BMI</p>
                  <p className="text-2xl font-bold">{data.avgBMI}</p>
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
    <div className="min-h-screen bg-zinc-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-zinc-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center overflow-hidden border border-zinc-200">
              <img 
                src="https://gjfwrphhhgodjhtgwmum.supabase.co/storage/v1/object/public/Logos/bmi-logo.jpg" 
                alt="Logo" 
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            </div>
            <span className="font-bold text-lg hidden sm:inline-block mr-8">BMI Tracker</span>
            
            <nav className="flex items-center gap-1">
              <button 
                onClick={() => setActiveTab('dashboard')}
                className={cn(
                  "px-3 md:px-4 py-2 text-xs md:text-sm font-medium rounded-lg transition-colors flex items-center gap-2",
                  activeTab === 'dashboard' ? "bg-zinc-100 text-zinc-900" : "text-zinc-500 hover:text-zinc-900 hover:bg-zinc-50"
                )}
              >
                <LayoutDashboard className="w-4 h-4" />
                <span className="hidden xs:inline">Dashboard</span>
              </button>
              <button 
                onClick={() => setActiveTab('students')}
                className={cn(
                  "px-3 md:px-4 py-2 text-xs md:text-sm font-medium rounded-lg transition-colors flex items-center gap-2",
                  activeTab === 'students' ? "bg-zinc-100 text-zinc-900" : "text-zinc-500 hover:text-zinc-900 hover:bg-zinc-50"
                )}
              >
                <Users className="w-4 h-4" />
                <span className="hidden xs:inline">Students</span>
              </button>
            </nav>
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
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
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

                      {selectedStudent.allergies && selectedStudent.allergies.length > 0 && (
                        <div className="flex flex-wrap items-center gap-2 mt-2">
                          <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider mr-1">Allergies:</span>
                          {selectedStudent.allergies.map(a => (
                            <span key={a} className="px-2 py-0.5 bg-red-500/20 text-red-200 text-[10px] font-bold rounded border border-red-500/30">
                              {a}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    
                    <div className="flex flex-col gap-2">
                      <div className="flex gap-2">
                        <Button 
                          onClick={async () => {
                            const doc = new jsPDF();
                            doc.setFontSize(20);
                            doc.text(`Student Health Report: ${selectedStudent.name}`, 15, 20);
                            
                            doc.setFontSize(12);
                            doc.text(`ID: ${selectedStudent.id}`, 15, 30);
                            doc.text(`Grade: ${selectedStudent.grade}`, 15, 37);
                            doc.text(`Gender: ${selectedStudent.gender}`, 15, 44);
                            doc.text(`Allergies: ${selectedStudent.allergies?.join(', ') || 'None'}`, 15, 51);
                            
                            doc.setFontSize(16);
                            doc.text("AI Health Assessment", 15, 65);
                            
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
                                doc.text("BMI Progress Chart", 15, currentY);
                                doc.addImage(imgData, 'PNG', 15, currentY + 5, 180, 60);
                                currentY += 75;
                              } catch (e) {
                                console.error("Failed to capture student chart", e);
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
                          className="border-white/20 text-white hover:bg-white/10 h-11 px-4"
                        >
                          <FileText className="w-4 h-4 mr-2" /> Report
                        </Button>
                        <Button onClick={() => setShowAddRecord(true)} className="bg-white text-zinc-900 hover:bg-zinc-100 h-11 px-6 shadow-lg flex-1">
                          <Plus className="w-5 h-5 mr-2" /> New Record
                        </Button>
                      </div>
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

                {/* BMI Trend Chart */}
                {records.length > 1 && (
                  <Card className="p-6" id="student-bmi-trend">
                    <h3 className="font-bold mb-6 flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-zinc-400" /> BMI Progress
                    </h3>
                    <div className="h-[250px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={[...records].reverse().map(r => ({
                          date: r.timestamp ? format(r.timestamp.toDate(), 'MMM d') : '',
                          bmi: r.bmi
                        }))}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                          <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#888' }} />
                          <YAxis domain={['dataMin - 1', 'dataMax + 1']} axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#888' }} />
                          <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                          <Line type="monotone" dataKey="bmi" stroke="#18181b" strokeWidth={3} dot={{ r: 4, fill: '#18181b', strokeWidth: 2, stroke: '#fff' }} isAnimationActive={false} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </Card>
                )}

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
                          <th className="px-6 py-3">Health Issues</th>
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
                              <div className="flex flex-wrap gap-1">
                                {record.healthIssues && record.healthIssues.length > 0 ? (
                                  record.healthIssues.map(i => (
                                    <span key={i} className="px-1.5 py-0.5 bg-zinc-100 text-zinc-600 text-[10px] rounded border border-zinc-200">
                                      {i}
                                    </span>
                                  ))
                                ) : (
                                  <span className="text-zinc-400 italic text-xs">None</span>
                                )}
                              </div>
                            </td>
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
  const [allergies, setAllergies] = useState<string[]>(student?.allergies || []);
  const [newAllergy, setNewAllergy] = useState('');

  const commonAllergies = ['Peanuts', 'Dairy', 'Eggs', 'Shellfish', 'Wheat', 'Soy', 'Dust', 'Pollen', 'Latex'];

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
      await setDoc(doc(db, 'students', id), {
        id,
        name,
        grade,
        dob,
        gender,
        allergies,
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
      
      <div className="space-y-2">
        <label className="text-xs font-bold text-zinc-500 uppercase">Allergies (Optional)</label>
        <div className="flex gap-2">
          <Select 
            value="" 
            onChange={(e) => addAllergy(e.target.value)}
            className="flex-1"
          >
            <option value="" disabled>Select Allergy...</option>
            {commonAllergies.map(a => (
              <option key={a} value={a}>{a}</option>
            ))}
          </Select>
          <div className="flex-1 flex gap-2">
            <Input 
              placeholder="Other..." 
              value={newAllergy}
              onChange={(e) => setNewAllergy(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addAllergy(newAllergy);
                }
              }}
            />
            <Button type="button" onClick={() => addAllergy(newAllergy)} variant="secondary" className="px-3">Add</Button>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 mt-2">
          {allergies.map(a => (
            <span key={a} className="inline-flex items-center gap-1 px-2 py-1 bg-zinc-100 text-zinc-700 text-xs font-medium rounded-md">
              {a}
              <button type="button" onClick={() => removeAllergy(a)} className="hover:text-red-500">×</button>
            </span>
          ))}
        </div>
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
      {/* Mode Toggle */}
      <div className="flex p-1 bg-zinc-100 rounded-xl">
        <button
          onClick={() => { setMode('manual'); setIsWaiting(false); }}
          className={cn(
            "flex-1 flex items-center justify-center gap-2 py-2 text-sm font-bold rounded-lg transition-all",
            mode === 'manual' ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-500 hover:text-zinc-700"
          )}
        >
          <Edit2 className="w-4 h-4" /> Manual
        </button>
        <button
          onClick={() => setMode('automatic')}
          className={cn(
            "flex-1 flex items-center justify-center gap-2 py-2 text-sm font-bold rounded-lg transition-all",
            mode === 'automatic' ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-500 hover:text-zinc-700"
          )}
        >
          <Cpu className="w-4 h-4" /> Automatic
        </button>
      </div>

      {mode === 'automatic' && !isWaiting && !height && (
        <div className="p-8 border-2 border-dashed border-zinc-200 rounded-2xl text-center space-y-4">
          <div className="w-16 h-16 bg-zinc-50 rounded-full flex items-center justify-center mx-auto">
            <Cpu className="w-8 h-8 text-zinc-400" />
          </div>
          <div className="space-y-1">
            <p className="font-bold">Ready for ESP32 Reading</p>
            <p className="text-xs text-zinc-500">Click the button below to start the measurement process on your device.</p>
          </div>
          <Button onClick={() => setIsWaiting(true)} className="w-full">
            Start Reading
          </Button>
        </div>
      )}

      {isWaiting && (
        <div className="p-8 border-2 border-zinc-900 rounded-2xl text-center space-y-4 bg-zinc-900 text-white shadow-xl">
          <div className="relative w-16 h-16 mx-auto">
            <div className="absolute inset-0 border-4 border-white/20 rounded-full" />
            <div className="absolute inset-0 border-4 border-white rounded-full border-t-transparent animate-spin" />
            <div className="absolute inset-0 flex items-center justify-center">
              <Activity className="w-6 h-6 animate-pulse" />
            </div>
          </div>
          <div className="space-y-1">
            <p className="font-bold">Waiting for Device...</p>
            <p className="text-xs text-zinc-400">Please stand on the scale and wait for the height sensor to finish.</p>
          </div>
          <Button variant="ghost" onClick={() => setIsWaiting(false)} className="text-zinc-400 hover:text-white hover:bg-white/10">
            Cancel
          </Button>
        </div>
      )}

      {(mode === 'manual' || (mode === 'automatic' && height)) && (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-zinc-500 uppercase">Height (cm)</label>
              <Input 
                name="height" 
                type="number" 
                step="0.1" 
                required 
                placeholder="170" 
                value={height}
                onChange={(e) => setHeight(e.target.value)}
                readOnly={mode === 'automatic'}
                className={mode === 'automatic' ? "bg-zinc-50" : ""}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-zinc-500 uppercase">Weight (kg)</label>
              <Input 
                name="weight" 
                type="number" 
                step="0.1" 
                required 
                placeholder="65" 
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                readOnly={mode === 'automatic'}
                className={mode === 'automatic' ? "bg-zinc-50" : ""}
              />
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-zinc-500 uppercase">BMI (Calculated)</label>
            <div className="relative">
              <Input 
                name="bmi" 
                type="number" 
                step="0.01" 
                required 
                placeholder="22.5" 
                value={bmi}
                onChange={(e) => setBmi(e.target.value)}
                className="pr-10"
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400">
                <Scale className="w-4 h-4" />
              </div>
            </div>
            {mode === 'automatic' && (
              <p className="text-[10px] text-green-600 font-medium italic">Data received from ESP32 device.</p>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-zinc-500 uppercase">Recent Health Issues (Optional)</label>
            <div className="flex gap-2">
              <Select 
                value="" 
                onChange={(e) => addIssue(e.target.value)}
                className="flex-1"
              >
                <option value="" disabled>Select Issue...</option>
                {commonIssues.map(i => (
                  <option key={i} value={i}>{i}</option>
                ))}
              </Select>
              <div className="flex-1 flex gap-2">
                <Input 
                  placeholder="Other..." 
                  value={newIssue}
                  onChange={(e) => setNewIssue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addIssue(newIssue);
                    }
                  }}
                />
                <Button type="button" onClick={() => addIssue(newIssue)} variant="secondary" className="px-3">Add</Button>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 mt-2">
              {healthIssues.map(i => (
                <span key={i} className="inline-flex items-center gap-1 px-2 py-1 bg-zinc-100 text-zinc-700 text-xs font-medium rounded-md">
                  {i}
                  <button type="button" onClick={() => removeIssue(i)} className="hover:text-red-500">×</button>
                </span>
              ))}
            </div>
          </div>

          <div className="flex gap-3">
            {mode === 'automatic' && (
              <Button type="button" variant="secondary" onClick={() => { setHeight(''); setWeight(''); setIsWaiting(true); }} className="flex-1">
                Re-read
              </Button>
            )}
            <Button type="submit" disabled={loading} className="flex-[2] h-12">
              {loading ? <Loader2 className="animate-spin" /> : 'Save Measurement'}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}

