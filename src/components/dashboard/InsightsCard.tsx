import { Sparkles, TrendingUp, AlertCircle, Users, Smile } from "lucide-react";
import type { DashboardData } from "../../types";
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
  const [primaryInsight] = data.insights;

  return (
    <Card className="p-5 h-full">
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="w-4 h-4 text-primary" />
        <h3 className="font-bold text-text">Insights</h3>
      </div>

      {primaryInsight &&
        (() => {
          const style = insightStyles[primaryInsight.type];
          const Icon = style.icon;
          return (
            <div
              className={cn(
                "flex items-start gap-4 p-4 rounded-2xl border",
                style.bg,
                style.border,
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
        })()}
    </Card>
  );
}
