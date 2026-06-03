import { useState } from "react";
import { format, subDays } from "date-fns";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { BarChart3, Calendar, Cloud, Sparkles, Loader2 } from "lucide-react";
import { generateAIReport } from "../../services/ai";
import type { DashboardData, DateFilter } from "../../types";
import { cn } from "../../lib/utils";
import { Button } from "../ui/Button";
import { PdfPreviewModal } from "../ui/PdfPreviewModal";
import { StatCardsRow } from "./StatCardsRow";
import { BmiTrendCard } from "./BmiTrendCard";
import { HealthStatusCard } from "./HealthStatusCard";
import { RecentEvaluationsCard } from "./RecentEvaluationsCard";
import { GenderDistributionCard } from "./GenderDistributionCard";
import { GradeDistributionCard } from "./GradeDistributionCard";
import { InsightsCard } from "./InsightsCard";

interface DashboardPageProps {
  data: DashboardData;
  dateFilter: DateFilter;
  setDateFilter: (v: DateFilter) => void;
  loading?: boolean;
  error?: string | null;
  onViewAllEvaluations?: () => void;
}

const dateFilterLabels: Record<DateFilter, string> = {
  "7d": "Last 7 Days",
  "30d": "Last 30 Days",
  "90d": "Last 90 Days",
  all: "All Time",
};

function getDateRangeLabel(filter: DateFilter): string {
  const end = new Date();
  if (filter === "all") return "All Time";
  const days = filter === "7d" ? 7 : filter === "30d" ? 30 : 90;
  const start = subDays(end, days);
  return `${format(start, "MMM d")} – ${format(end, "MMM d, yyyy")}`;
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
  const [pdfPreview, setPdfPreview] = useState<{ url: string; fileName: string } | null>(null);

  const closePdfPreview = () => {
    if (pdfPreview?.url) {
      URL.revokeObjectURL(pdfPreview.url);
    }
    setPdfPreview(null);
  };

  const handleDownloadPDF = async () => {
    setIsGeneratingReport(true);
    try {
      const doc = new jsPDF("p", "mm", "a4");
      const pageWidth = doc.internal.pageSize.getWidth();

      doc.setFillColor(20, 184, 166);
      doc.rect(0, 0, pageWidth, 40, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(22);
      doc.text("Population Health Overview", 15, 25);
      doc.setFontSize(10);
      doc.text(`Generated on: ${format(new Date(), "PPP p")}`, 15, 33);
      doc.text(`Period: ${getDateRangeLabel(dateFilter)}`, 15, 37);

      doc.setTextColor(24, 24, 27);
      doc.setFontSize(16);
      doc.text("AI Health Insights", 15, 55);

      const aiSummary = await generateAIReport(data, "general");
      doc.setFontSize(10);
      const splitText = doc.splitTextToSize(
        aiSummary || "No analysis available.",
        pageWidth - 30,
      );
      doc.text(splitText, 15, 65);

      let currentY = 65 + splitText.length * 5 + 10;

      autoTable(doc, {
        startY: currentY,
        head: [["Metric", "Value"]],
        body: [
          ["Total Students", data.totalStudents.toString()],
          ["Healthy BMI", `${data.healthyCount} (${data.healthyPercent}%)`],
          ["At Risk", `${data.atRiskCount} (${data.atRiskPercent}%)`],
          ["Total Evaluations", data.totalRecords.toString()],
          ["Avg. BMI", Number.isFinite(data.avgBMI) ? data.avgBMI.toFixed(1) : "—"],
        ],
        theme: "striped",
        headStyles: { fillColor: [20, 184, 166] },
      });

      type DocWithTable = jsPDF & { lastAutoTable?: { finalY: number } };
      let tableY =
        ((doc as DocWithTable).lastAutoTable?.finalY ?? currentY) + 14;

      const addSectionTable = (
        title: string,
        rows: string[][],
      ) => {
        if (rows.length === 0) return;
        if (tableY > doc.internal.pageSize.getHeight() - 40) {
          doc.addPage();
          tableY = 20;
        }
        doc.setFontSize(14);
        doc.setTextColor(24, 24, 27);
        doc.text(title, 15, tableY);
        autoTable(doc, {
          startY: tableY + 6,
          head: [["Category", "Value"]],
          body: rows,
          theme: "striped",
          headStyles: { fillColor: [20, 184, 166] },
        });
        tableY = ((doc as DocWithTable).lastAutoTable?.finalY ?? tableY) + 14;
      };

      addSectionTable(
        "Health Status Breakdown",
        data.healthStatusBreakdown.map((d) => [d.name, d.value.toString()]),
      );
      addSectionTable(
        "Gender Distribution",
        data.genderData.map((d) => [d.name, d.value.toString()]),
      );
      addSectionTable(
        "Grade Distribution",
        data.gradeData.map((d) => [d.name, d.value.toString()]),
      );
      addSectionTable(
        "BMI Trend (recent)",
        data.trendData.map((d) => [d.date, d.bmi.toString()]),
      );

      const fileName = `Health_Report_${format(new Date(), "yyyy-MM-dd")}.pdf`;
      const blob = doc.output("blob");
      const url = URL.createObjectURL(blob);
      setPdfPreview((prev) => {
        if (prev?.url) URL.revokeObjectURL(prev.url);
        return { url, fileName };
      });
    } catch (err) {
      console.error("PDF Generation failed:", err);
    } finally {
      setIsGeneratingReport(false);
    }
  };

  return (
    <>
    <div className="space-y-6 w-full min-w-0 max-w-full dash-fade">
      <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="pointer-events-none absolute inset-0 hidden sm:block">
          <Cloud className="absolute -top-2 left-40 w-8 h-8 text-info/30" />
          <Cloud className="absolute top-1 right-40 w-10 h-10 text-info/20" />
          <Sparkles className="absolute top-2 left-80 w-4 h-4 text-accent/70" />
        </div>

        <div className="relative">
          <div className="flex items-center gap-2">

            <h1 className="text-xl sm:text-2xl font-bold text-text">Welcome Back!</h1>
          </div>
          <p className="text-sm text-text-muted mt-0.5">
            Let's keep our students healthy and growing.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 w-full sm:w-auto">
          <div className="relative w-full sm:w-auto">
            <button
              onClick={() => setShowDateMenu(!showDateMenu)}
              className="flex items-center justify-center sm:justify-start gap-2 h-10 px-4 rounded-xl border border-accent/40 bg-accent-light/80 text-sm font-semibold text-text hover:bg-accent-light transition-colors w-full sm:w-auto"
            >
              <Calendar className="w-4 h-4 text-accent shrink-0" />
              <span className="truncate">{getDateRangeLabel(dateFilter)}</span>
            </button>
            {showDateMenu && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setShowDateMenu(false)}
                />
                <div className="absolute left-0 right-0 sm:left-auto sm:right-0 top-full mt-2 z-20 bg-white border border-border rounded-2xl soft-card-shadow py-1 min-w-[170px] sm:max-w-none">
                  {(Object.keys(dateFilterLabels) as DateFilter[]).map(
                    (key) => (
                      <button
                        key={key}
                        onClick={() => {
                          setDateFilter(key);
                          setShowDateMenu(false);
                        }}
                        className={cn(
                          "w-full text-left px-4 py-2 text-sm hover:bg-surface transition-colors",
                          dateFilter === key
                            ? "text-primary font-semibold"
                            : "text-text",
                        )}
                      >
                        {dateFilterLabels[key]}
                      </button>
                    ),
                  )}
                </div>
              </>
            )}
          </div>

          <Button
            onClick={handleDownloadPDF}
            disabled={isGeneratingReport || loading}
            className="h-10 px-5 rounded-full w-full sm:w-auto"
          >
            {isGeneratingReport ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <BarChart3 className="w-4 h-4 mr-2" />
            )}
            {isGeneratingReport ? "Generating..." : "Health Report"}
          </Button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-100 text-rose-600 text-sm">
          Failed to load analytics:{" "}
          {error.includes("index")
            ? "A Firestore index may be required. Check the browser console."
            : error}
        </div>
      )}

      <StatCardsRow data={data} />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 dash-stagger">
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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 dash-stagger">
        <GenderDistributionCard data={data} loading={loading} />
        <GradeDistributionCard data={data} loading={loading} />
        <InsightsCard data={data} />
      </div>
    </div>
    {pdfPreview && (
      <PdfPreviewModal
        previewUrl={pdfPreview.url}
        fileName={pdfPreview.fileName}
        title="Population Health Report"
        subtitle={`Generated ${format(new Date(), "PPP")}`}
        onClose={closePdfPreview}
      />
    )}
    </>
  );
}
