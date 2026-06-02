import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import html2canvas from 'html2canvas';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import {
  X, Plus, FileText, Stethoscope, Calendar, User as UserIcon,
  GraduationCap, AlertCircle, Edit2, Trash2, TrendingUp, History, UtensilsCrossed,
} from 'lucide-react';
import { generateAIReport } from '../../services/ai';
import { cn } from '../../lib/utils';
import { getBMICategory, calculateAge } from '../../utils/bmi';
import type { Student, BMIRecord } from '../../types';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { StatusBadge } from './StatusBadge';

type DetailTab = 'overview' | 'evaluations' | 'history' | 'notes';

interface StudentDetailPanelProps {
  student: Student;
  records: BMIRecord[];
  onClose: () => void;
  onAddRecord: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onDeleteRecord: (recordId: string) => void;
  onViewMealPlan?: () => void;
}

export function StudentDetailPanel({
  student,
  records,
  onClose,
  onAddRecord,
  onEdit,
  onDelete,
  onDeleteRecord,
  onViewMealPlan,
}: StudentDetailPanelProps) {
  const [activeTab, setActiveTab] = useState<DetailTab>('overview');
  const latest = records[0];
  const category = latest ? getBMICategory(latest.bmi) : null;

  const handleGenerateReport = async () => {
    const pdfDoc = new jsPDF();
    pdfDoc.setFontSize(20);
    pdfDoc.text(`Health Report: ${student.name}`, 15, 20);
    pdfDoc.setFontSize(12);
    pdfDoc.text(`ID: ${student.id}`, 15, 30);
    pdfDoc.text(`Grade: ${student.grade || 'N/A'}`, 15, 37);
    pdfDoc.text(`Gender: ${student.gender}`, 15, 44);

    pdfDoc.setFontSize(16);
    pdfDoc.text('AI Health Summary', 15, 58);
    const aiAnalysis = await generateAIReport({ student, history: records }, 'individual');
    pdfDoc.setFontSize(10);
    const splitText = pdfDoc.splitTextToSize(aiAnalysis || 'No analysis available.', 180);
    pdfDoc.text(splitText, 15, 65);

    let currentY = 65 + splitText.length * 5 + 10;
    const chartElement = document.getElementById('student-detail-bmi-trend');
    if (chartElement) {
      try {
        const canvas = await html2canvas(chartElement, { scale: 2, backgroundColor: '#ffffff' });
        pdfDoc.addImage(canvas.toDataURL('image/png'), 'PNG', 15, currentY, 180, 60);
        currentY += 70;
      } catch (e) {
        console.error('Chart capture failed', e);
      }
    }

    autoTable(pdfDoc, {
      startY: currentY,
      head: [['Date', 'Height', 'Weight', 'BMI', 'Issues']],
      body: records.map(r => [
        r.timestamp ? format(r.timestamp.toDate(), 'PPP') : 'N/A',
        `${r.height}cm`, `${r.weight}kg`, r.bmi.toString(),
        r.healthIssues?.join(', ') || 'None',
      ]),
    });
    pdfDoc.save(`${student.name}_Health_Report.pdf`);
  };

  const tabs: { id: DetailTab; label: string }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'evaluations', label: 'Evaluations' },
    { id: 'history', label: 'History' },
    { id: 'notes', label: 'Notes' },
  ];

  const recommendation = category?.label === 'Overweight' || category?.label === 'Obese'
    ? 'Encourage balanced meals, regular physical activity, and follow-up evaluations.'
    : category?.label === 'Underweight'
      ? 'Monitor nutrition intake and consult with school health staff if needed.'
      : 'Maintain current healthy habits and schedule routine check-ups.';

  return (
    <Card className="flex flex-col h-full overflow-hidden border-slate-200 shadow-lg">
      <div className="p-5 border-b border-slate-100 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex flex-col items-center text-center pt-2">
          <div className="w-20 h-20 rounded-2xl bg-slate-100 overflow-hidden mb-3 flex items-center justify-center">
            {student.photoUrl ? (
              <img src={student.photoUrl} alt={student.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            ) : (
              <UserIcon className="w-10 h-10 text-slate-300" />
            )}
          </div>
          <h2 className="text-lg font-bold text-slate-900">{student.name}</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {student.id} · {student.grade || 'N/A'} · {calculateAge(student.dob)} yrs · {student.gender}
          </p>
        </div>

        <div className="flex mt-4 border-b border-slate-100 -mb-px overflow-x-auto">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'px-4 py-2 text-sm font-medium whitespace-nowrap border-b-2 transition-colors',
                activeTab === tab.id
                  ? 'border-teal-600 text-teal-700'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-5 scrollbar-thin">
        {activeTab === 'overview' && (
          <>
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-center">
                <p className="text-[10px] font-semibold text-slate-400 uppercase">BMI (Latest)</p>
                <p className="text-xl font-bold text-slate-900 mt-1">{latest?.bmi ?? '—'}</p>
                {category && <StatusBadge label={category.label} className="mt-1" />}
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-center">
                <p className="text-[10px] font-semibold text-slate-400 uppercase">Height</p>
                <p className="text-xl font-bold text-slate-900 mt-1">{latest?.height ?? '—'}<span className="text-xs text-slate-400 ml-0.5">cm</span></p>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-center">
                <p className="text-[10px] font-semibold text-slate-400 uppercase">Weight</p>
                <p className="text-xl font-bold text-slate-900 mt-1">{latest?.weight ?? '—'}<span className="text-xs text-slate-400 ml-0.5">kg</span></p>
              </div>
            </div>

            {category && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-bold text-slate-800">Health Status</h3>
                  <StatusBadge label={category.label} />
                </div>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Current BMI is {latest?.bmi}. Category: {category.label}.
                </p>
                <div className="mt-3 p-3 rounded-xl bg-teal-50 border border-teal-100 flex gap-3">
                  <Stethoscope className="w-5 h-5 text-teal-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-semibold text-teal-800">Recommendation</p>
                    <p className="text-xs text-teal-700 mt-0.5 leading-relaxed">{recommendation}</p>
                  </div>
                </div>
              </div>
            )}

            {onViewMealPlan && (
              <Button variant="outline" onClick={onViewMealPlan} className="w-full h-10 rounded-xl text-sm">
                <UtensilsCrossed className="w-4 h-4 mr-2" /> View Meal Plan
              </Button>
            )}

            <div>
              <h3 className="text-sm font-bold text-slate-800 mb-3">Personal Information</h3>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { icon: Calendar, label: 'Date of Birth', value: format(new Date(student.dob), 'MMM d, yyyy') },
                  { icon: UserIcon, label: 'Gender', value: student.gender },
                  { icon: GraduationCap, label: 'Grade Level', value: student.grade || '—' },
                  { icon: AlertCircle, label: 'Health Alerts', value: student.allergies?.length ? `${student.allergies.length} alert(s)` : 'None' },
                ].map(({ icon: Icon, label, value }) => (
                  <div key={label} className="flex items-start gap-2 p-2 rounded-lg bg-slate-50">
                    <Icon className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-[10px] text-slate-400 font-medium">{label}</p>
                      <p className="text-xs font-semibold text-slate-800 capitalize">{value}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {activeTab === 'evaluations' && (
          <div className="space-y-2">
            {records.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-8">No evaluations yet</p>
            ) : (
              records.map(record => (
                <div key={record.id} className="flex items-center justify-between p-3 rounded-xl border border-slate-100 hover:bg-slate-50 group">
                  <div>
                    <p className="text-sm font-semibold text-slate-800">
                      {record.timestamp ? format(record.timestamp.toDate(), 'MMM d, yyyy') : 'Pending'}
                    </p>
                    <p className="text-xs text-slate-500">
                      BMI {record.bmi} · {record.height}cm · {record.weight}kg
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge label={getBMICategory(record.bmi).label} />
                    <button
                      onClick={() => onDeleteRecord(record.id)}
                      className="p-1 text-slate-300 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'history' && (
          <>
            {records.length > 1 ? (
              <div id="student-detail-bmi-trend" className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={[...records].reverse().map(r => ({
                    date: r.timestamp ? format(r.timestamp.toDate(), 'MMM d') : '',
                    bmi: r.bmi,
                  }))}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 10 }} />
                    <YAxis domain={['dataMin - 1', 'dataMax + 1']} axisLine={false} tickLine={false} tick={{ fontSize: 10 }} />
                    <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgb(0 0 0 / 0.1)' }} />
                    <Line type="monotone" dataKey="bmi" stroke="#14b8a6" strokeWidth={2.5} dot={{ r: 4, fill: '#14b8a6' }} isAnimationActive={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="text-center py-8 text-slate-400">
                <TrendingUp className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">Need at least 2 evaluations for trend chart</p>
              </div>
            )}
            <div className="space-y-2 mt-4">
              {records.map(record => (
                <div key={record.id} className="flex items-center gap-2 text-xs text-slate-600 p-2 rounded-lg bg-slate-50">
                  <History className="w-3.5 h-3.5 text-slate-400" />
                  {record.timestamp ? format(record.timestamp.toDate(), 'PPP') : 'N/A'} — BMI {record.bmi}
                </div>
              ))}
            </div>
          </>
        )}

        {activeTab === 'notes' && (
          <div>
            <h3 className="text-sm font-bold text-slate-800 mb-3">Health Alerts / Allergies</h3>
            {student.allergies && student.allergies.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {student.allergies.map(a => (
                  <span key={a} className="px-3 py-1.5 bg-rose-50 text-rose-700 text-xs font-semibold rounded-lg border border-rose-100">
                    {a}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-400">No health alerts recorded</p>
            )}
            <Button variant="outline" onClick={onEdit} className="mt-4 w-full text-xs">
              <Edit2 className="w-3.5 h-3.5 mr-2" /> Edit Profile & Notes
            </Button>
          </div>
        )}
      </div>

      <div className="p-4 border-t border-slate-100 flex gap-2 shrink-0">
        <Button onClick={onAddRecord} className="flex-1 h-10 rounded-xl bg-teal-600 hover:bg-teal-700 text-sm">
          <Plus className="w-4 h-4 mr-1.5" /> New Evaluation
        </Button>
        <Button variant="outline" onClick={handleGenerateReport} className="flex-1 h-10 rounded-xl text-sm">
          <FileText className="w-4 h-4 mr-1.5" /> Generate Report
        </Button>
      </div>

      <div className="px-4 pb-4 flex gap-2">
        <Button variant="ghost" onClick={onEdit} className="flex-1 h-9 text-xs text-slate-500">
          <Edit2 className="w-3.5 h-3.5 mr-1" /> Edit
        </Button>
        <Button variant="ghost" onClick={onDelete} className="h-9 w-9 p-0 text-slate-400 hover:text-rose-500">
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>
    </Card>
  );
}
