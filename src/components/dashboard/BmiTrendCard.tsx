import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Send, TrendingUp, Loader2 } from "lucide-react";
import type { DashboardData } from "../../types";
import { Card } from "../ui/Card";

interface BmiTrendCardProps {
  data: DashboardData;
  loading?: boolean;
}

export function BmiTrendCard({ data, loading }: BmiTrendCardProps) {
  return (
    <Card className="p-5 h-full" id="chart-bmi-trend">
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-primary" />
            <h3 className="font-bold text-text">BMI Trend (All Students)</h3>
          </div>
          <p className="text-xs text-text-muted mt-0.5">
            Last {data.trendData.length || 10} Days
          </p>
        </div>
        <Send className="w-4 h-4 text-primary/70" />
      </div>

      {loading ? (
        <div className="h-[260px] flex items-center justify-center text-text-muted">
          <Loader2 className="w-8 h-8 animate-spin opacity-30" />
        </div>
      ) : data.trendData.length === 0 ? (
        <div className="h-[260px] flex items-center justify-center text-text-muted text-sm">
          No trend data for the selected period
        </div>
      ) : (
        <div className="h-[260px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data.trendData}>
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="var(--color-border)"
              />
              <XAxis
                dataKey="date"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 11, fill: "var(--color-text-muted)" }}
              />
              <YAxis
                domain={["dataMin - 1", "dataMax + 1"]}
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 11, fill: "var(--color-text-muted)" }}
              />
              <Tooltip
                contentStyle={{
                  borderRadius: "12px",
                  border: "none",
                  boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)",
                }}
                formatter={(value: number) => [`${value}`, "Average BMI"]}
              />
              <Line
                type="monotone"
                dataKey="bmi"
                stroke="#4A8CF7"
                strokeWidth={2.5}
                dot={{ r: 4, fill: "#4A8CF7", strokeWidth: 2, stroke: "#fff" }}
                activeDot={{ r: 6 }}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  );
}
