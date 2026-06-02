import { useState } from 'react';
import { format, subDays } from 'date-fns';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import html2canvas from 'html2canvas';
import { BarChart3, Calendar, Loader2 } from 'lucide-react';
import { generateAIReport } from '../../services/ai';
import type { DashboardData, DateFilter } from '../../types';
import { cn } from '../../lib/utils';
import { Button } from '../ui/Button';
import { StatCardsRow } from './StatCardsRow';
import { BmiTrendCard } from './BmiTrendCard';
import { HealthStatusCard } from './HealthStatusCard';
import { RecentEvaluationsCard } from './RecentEvaluationsCard';
import { GenderDistributionCard } from './GenderDistributionCard';
import { GradeDistributionCard } from './GradeDistributionCard';
import { InsightsCard } from './InsightsCard';

interface DashboardPageProps {
  data: DashboardData;
  dateFilter: DateFilter;
  setDateFilter: (v: DateFilter) => void;
  loading?: boolean;
  error?: string | null;
  onViewAllEvaluations?: () => void;
}

const dateFilterLabels: Record<DateFilter, string> = {
  '7d': 'Last 7 Days',
  '30d': 'Last 30 Days',
  '90d': 'Last 90 Days',
  all: 'All Time',
};

function getDateRangeLabel(filter: DateFilter): string {
  const end = new Date();
  if (filter === 'all') return 'All Time';
  const days = filter === '7d' ? 7 : filter === '30d' ? 30 : 90;
  const start = subDays(end, days);
  return `${format(start, 'MMM d')} – ${format(end, 'MMM d, yyyy')}`;
}

export function DashboardPage({
  data,
  dateFilter,
  setDateFilter,
  loading,
  error,
  onViewAllEvaluations,
}: DashboardPageProps) {
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [showDateMenu, setShowDateMenu] = useState(false);

  const handleDownloadPDF = async () => {
    setIsGeneratingReport(true);
    try {
      const doc = new jsPDF('p', 'mm', 'a4');
      const pageWidth = doc.internal.pageSize.getWidth();

      doc.setFillColor(20, 184, 166);
      doc.rect(0, 0, pageWidth, 40, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(22);
      doc.text('Population Health Overview', 15, 25);
      doc.setFontSize(10);
      doc.text(`Generated on: ${format(new Date(), 'PPP p')}`, 15, 33);
      doc.text(`Period: ${getDateRangeLabel(dateFilter)}`, 15, 37);

      doc.setTextColor(24, 24, 27);
      doc.setFontSize(16);
      doc.text('AI Health Insights', 15, 55);

      const aiSummary = await generateAIReport(data, 'general');
      doc.setFontSize(10);
      const splitText = doc.splitTextToSize(aiSummary || 'No analysis available.', pageWidth - 30);
      doc.text(splitText, 15, 65);

      let currentY = 65 + splitText.length * 5 + 10;

      autoTable(doc, {
        startY: currentY,
        head: [['Metric', 'Value']],
        body: [
          ['Total Students', data.totalStudents.toString()],
          ['Healthy BMI', `${data.healthyCount} (${data.healthyPercent}%)`],
          ['At Risk', `${data.atRiskCount} (${data.atRiskPercent}%)`],
          ['Total Evaluations', data.totalRecords.toString()],
          ['Avg. BMI', data.avgBMI.toFixed(1)],
        ],
        theme: 'striped',
        headStyles: { fillColor: [20, 184, 166] },
      });

      currentY = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 20;

      const chartIds = [
        { id: 'chart-bmi-trend', title: 'BMI Trend' },
        { id: 'chart-bmi-dist', title: 'Health Status Breakdown' },
        { id: 'chart-gender-dist', title: 'Gender Distribution' },
        { id: 'chart-grade-dist', title: 'Grade Distribution' },
      ];

      for (const chart of chartIds) {
        const element = document.getElementById(chart.id);
        if (element) {
          try {
            const canvas = await html2canvas(element, {
              scale: 2,
              useCORS: true,
              logging: false,
              backgroundColor: '#ffffff',
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

      doc.save(`Health_Report_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
    } catch (err) {
      console.error('PDF Generation failed:', err);
    } finally {
      setIsGeneratingReport(false);
    }
  };

  return (
    <div className="space-y-6 w-full">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Population Health Overview</h1>
          <p className="text-sm text-slate-500 mt-0.5">Real-time insights from student BMI evaluations.</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <button
              onClick={() => setShowDateMenu(!showDateMenu)}
              className="flex items-center gap-2 h-10 px-4 rounded-xl border border-slate-200 bg-white text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
            >
              <Calendar className="w-4 h-4 text-slate-400" />
              {getDateRangeLabel(dateFilter)}
            </button>
            {showDateMenu && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowDateMenu(false)} />
                <div className="absolute right-0 top-full mt-1 z-20 bg-white border border-slate-200 rounded-xl shadow-lg py-1 min-w-[160px]">
                  {(Object.keys(dateFilterLabels) as DateFilter[]).map(key => (
                    <button
                      key={key}
                      onClick={() => { setDateFilter(key); setShowDateMenu(false); }}
                      className={cn(
                        'w-full text-left px-4 py-2 text-sm hover:bg-slate-50 transition-colors',
                        dateFilter === key ? 'text-teal-600 font-semibold' : 'text-slate-700'
                      )}
                    >
                      {dateFilterLabels[key]}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          <Button
            onClick={handleDownloadPDF}
            disabled={isGeneratingReport || loading}
            className="h-10 px-5 rounded-xl bg-teal-600 hover:bg-teal-700 shadow-sm"
          >
            {isGeneratingReport ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <BarChart3 className="w-4 h-4 mr-2" />
            )}
            {isGeneratingReport ? 'Generating...' : 'Health Report'}
          </Button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-100 text-rose-600 text-sm">
          Failed to load analytics: {error.includes('index') ? 'A Firestore index may be required. Check the browser console.' : error}
        </div>
      )}

      <StatCardsRow data={data} />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className="lg:col-span-5">
          <BmiTrendCard data={data} loading={loading} />
        </div>
        <div className="lg:col-span-4">
          <HealthStatusCard data={data} loading={loading} />
        </div>
        <div className="lg:col-span-3">
          <RecentEvaluationsCard data={data} onViewAll={onViewAllEvaluations} />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <GenderDistributionCard data={data} loading={loading} />
        <GradeDistributionCard data={data} loading={loading} />
        <InsightsCard data={data} />
      </div>
    </div>
  );
}
