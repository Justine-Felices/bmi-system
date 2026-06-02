import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { Heart, PieChart as PieChartIcon, Loader2 } from "lucide-react";
import type { DashboardData } from "../../types";
import { Card } from "../ui/Card";

interface HealthStatusCardProps {
  data: DashboardData;
  loading?: boolean;
}

export function HealthStatusCard({ data, loading }: HealthStatusCardProps) {
  const total = data.healthStatusBreakdown.reduce((s, d) => s + d.value, 0);

  return (
    <Card className="p-5 h-full" id="chart-bmi-dist">
      <div className="flex items-center gap-2 mb-4">
        <PieChartIcon className="w-4 h-4 text-primary" />
        <h3 className="font-bold text-text">Health Status Breakdown</h3>
      </div>

      {loading ? (
        <div className="h-[200px] flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin opacity-30" />
        </div>
      ) : data.healthStatusBreakdown.length === 0 ? (
        <div className="h-[200px] flex items-center justify-center text-text-muted text-sm">
          No health data available
        </div>
      ) : (
        <>
          <div className="flex items-center gap-4">
            <div className="h-[160px] w-[160px] shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data.healthStatusBreakdown}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={70}
                    paddingAngle={3}
                    dataKey="value"
                    isAnimationActive={false}
                  >
                    {data.healthStatusBreakdown.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="flex-1 space-y-2">
              {data.healthStatusBreakdown.map((item) => (
                <div
                  key={item.name}
                  className="flex items-center justify-between text-sm"
                >
                  <div className="flex items-center gap-2">
                    <div
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="text-text-muted">{item.name}</span>
                  </div>
                  <span className="font-semibold text-text">
                    {item.value} (
                    {total > 0 ? Math.round((item.value / total) * 100) : 0}%)
                  </span>
                </div>
              ))}
            </div>
          </div>

          <p className="text-xs text-text-muted mt-4 pt-3 border-t border-border flex items-center gap-1">
            Get to know student health and nurture a brighter tomorrow.
            <Heart className="w-3 h-3 text-danger" />
          </p>
        </>
      )}
    </Card>
  );
}
