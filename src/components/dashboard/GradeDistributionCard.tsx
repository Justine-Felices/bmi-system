import {
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { BarChart3, Loader2 } from "lucide-react";
import type { DashboardData } from "../../types";
import { Card } from "../ui/Card";

interface GradeDistributionCardProps {
  data: DashboardData;
  loading?: boolean;
}

export function GradeDistributionCard({
  data,
  loading,
}: GradeDistributionCardProps) {
  const barColors = [
    "#F7B84B",
    "#4BA3FF",
    "#F472B6",
    "#7BD389",
    "#60A5FA",
    "#FDBA74",
  ];

  return (
    <Card className="p-5 h-full" id="chart-grade-dist">
      <div className="flex items-center gap-2 mb-4">
        <BarChart3 className="w-4 h-4 text-primary" />
        <h3 className="font-bold text-text">Grade Distribution</h3>
      </div>

      {loading ? (
        <div className="h-[180px] flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin opacity-30" />
        </div>
      ) : data.gradeData.length === 0 ? (
        <div className="h-[180px] flex items-center justify-center text-text-muted text-sm">
          No grade data
        </div>
      ) : (
        <div className="h-[180px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.gradeData}>
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="var(--color-border)"
              />
              <XAxis
                dataKey="name"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 11, fill: "var(--color-text-muted)" }}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 11, fill: "var(--color-text-muted)" }}
                allowDecimals={false}
              />
              <Tooltip
                cursor={{ fill: "var(--color-surface)" }}
                contentStyle={{
                  borderRadius: "12px",
                  border: "none",
                  boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)",
                }}
              />
              <Bar
                dataKey="value"
                radius={[4, 4, 0, 0]}
                isAnimationActive={false}
              >
                {data.gradeData.map((entry, index) => (
                  <Cell
                    key={`${entry.name}-${index}`}
                    fill={barColors[index % barColors.length]}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  );
}
