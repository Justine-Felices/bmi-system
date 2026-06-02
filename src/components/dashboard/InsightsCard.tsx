import { TrendingUp, AlertCircle, Users } from 'lucide-react';
import type { DashboardData } from '../../types';
import { cn } from '../../lib/utils';
import { Card } from '../ui/Card';

interface InsightsCardProps {
  data: DashboardData;
}

const insightStyles = {
  trend: {
    icon: TrendingUp,
    bg: 'bg-success-light',
    iconColor: 'text-success',
    border: 'border-success/25',
  },
  alert: {
    icon: AlertCircle,
    bg: 'bg-accent-light',
    iconColor: 'text-accent',
    border: 'border-accent/25',
  },
  success: {
    icon: Users,
    bg: 'bg-info-light',
    iconColor: 'text-info',
    border: 'border-info/25',
  },
};

export function InsightsCard({ data }: InsightsCardProps) {
  return (
    <Card className="p-5 h-full">
      <h3 className="font-bold text-text mb-4">Insights</h3>
      <div className="space-y-3">
        {data.insights.map((insight, i) => {
          const style = insightStyles[insight.type];
          const Icon = style.icon;
          return (
            <div
              key={i}
              className={cn('flex items-start gap-3 p-3 rounded-xl border', style.bg, style.border)}
            >
              <div className={cn('p-1.5 rounded-lg bg-card shrink-0', style.iconColor)}>
                <Icon className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-text">{insight.title}</p>
                <p className="text-xs text-text-muted mt-0.5 leading-relaxed">{insight.description}</p>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
