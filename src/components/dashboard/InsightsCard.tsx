import { Loader2, Sparkles, TrendingUp, AlertCircle, Users, Smile } from "lucide-react";
import type { DashboardData } from "../../types";
import { useDashboardInsights } from "../../hooks/useDashboardInsights";
import { cn } from "../../lib/utils";
import { Card } from "../ui/Card";

interface InsightsCardProps {
  data: DashboardData;
}

const insightStyles = {
  trend: {
    icon: TrendingUp,
    bg: "bg-success-light",
    iconColor: "text-success",
    border: "border-success/25",
  },
  alert: {
    icon: AlertCircle,
    bg: "bg-accent-light",
    iconColor: "text-accent",
    border: "border-accent/25",
  },
  success: {
    icon: Users,
    bg: "bg-info-light",
    iconColor: "text-info",
    border: "border-info/25",
  },
};

export function InsightsCard({ data }: InsightsCardProps) {
  const { insights, loading, isAiPowered } = useDashboardInsights(data);
  const primaryInsight = insights[0];

  return (
    <Card className="p-5 h-full">
      <div className="flex items-center justify-between gap-2 mb-4">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary" />
          <h3 className="font-bold text-text">Insights</h3>
        </div>
        {loading ? (
          <span className="flex items-center gap-1.5 text-[10px] font-semibold text-text-muted uppercase tracking-wide">
            <Loader2 className="w-3 h-3 animate-spin" />
            Generating
          </span>
        ) : isAiPowered ? (
          <span className="text-[10px] font-semibold text-primary uppercase tracking-wide">
            AI powered
          </span>
        ) : null}
      </div>

      {loading && !primaryInsight ? (
        <div className="flex items-center justify-center py-10 text-text-muted">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      ) : primaryInsight ? (
        (() => {
          const style = insightStyles[primaryInsight.type];
          const Icon = style.icon;
          return (
            <div
              className={cn(
                "flex items-start gap-4 p-4 rounded-2xl border transition-opacity",
                style.bg,
                style.border,
                loading && "opacity-70",
              )}
            >
              <div
                className={cn(
                  "p-2 rounded-xl bg-card/80 shrink-0",
                  style.iconColor,
                )}
              >
                <Icon className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-text">
                  {primaryInsight.title}
                </p>
                <p className="text-xs text-text-muted mt-1 leading-relaxed">
                  {primaryInsight.description}
                </p>
              </div>
              <div className="hidden sm:flex w-14 h-14 rounded-2xl bg-card/80 items-center justify-center text-success">
                <Smile className="w-7 h-7" />
              </div>
            </div>
          );
        })()
      ) : (
        <p className="text-sm text-text-muted text-center py-8">
          No insights available for this period.
        </p>
      )}
    </Card>
  );
}
