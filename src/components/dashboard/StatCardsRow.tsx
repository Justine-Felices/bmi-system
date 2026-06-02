import {
  TrendingUp,
  Users,
  Smile,
  AlertTriangle,
  ClipboardList,
} from "lucide-react";
import { LineChart, Line, BarChart, Bar, ResponsiveContainer } from "recharts";
import type { DashboardData } from "../../types";
import { Card } from "../ui/Card";

interface StatCardsRowProps {
  data: DashboardData;
}

function MiniSparkline({
  data,
  color,
}: {
  data: { value: number }[];
  color: string;
}) {
  return (
    <div className="h-10 w-20">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <Line
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

function MiniBarChart({ data }: { data: { value: number }[] }) {
  return (
    <div className="h-10 w-16">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <Bar
            dataKey="value"
            fill="#4A8CF7"
            radius={[2, 2, 0, 0]}
            isAnimationActive={false}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function StatCardsRow({ data }: StatCardsRowProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 dash-stagger">
      <Card className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-primary-light text-primary flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">
                Total Students
              </p>
              <p className="text-3xl font-bold text-text mt-1">
                {data.totalStudents}
              </p>
              {data.studentGrowthPercent !== null && (
                <p className="text-xs font-semibold text-success mt-1 flex items-center gap-1">
                  <TrendingUp className="w-3 h-3" />
                  {data.studentGrowthPercent >= 0 ? "+" : ""}
                  {data.studentGrowthPercent}% this month
                </p>
              )}
            </div>
          </div>
          <MiniSparkline data={data.studentSparkline} color="#4A8CF7" />
        </div>
      </Card>

      <Card className="p-5">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-success-light text-success flex items-center justify-center">
            <Smile className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">
              Healthy BMI
            </p>
            <p className="text-3xl font-bold text-text mt-1">
              {data.healthyCount}
            </p>
            <p className="text-xs text-text-muted mt-1">
              {data.healthyPercent}% of population
            </p>
            <div className="mt-3 h-2 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-success rounded-full transition-all"
                style={{ width: `${data.healthyPercent}%` }}
              />
            </div>
          </div>
        </div>
      </Card>

      <Card className="p-5">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-accent-light text-accent flex items-center justify-center">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">
              At Risk
            </p>
            <p className="text-3xl font-bold text-text mt-1">
              {data.atRiskCount}
            </p>
            <p className="text-xs text-text-muted mt-1">Needs monitoring</p>
            <div className="mt-3 h-2 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-accent rounded-full transition-all"
                style={{ width: `${data.atRiskPercent}%` }}
              />
            </div>
          </div>
        </div>
      </Card>

      <Card className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-info-light text-info flex items-center justify-center">
              <ClipboardList className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">
                Latest Evaluations
              </p>
              <p className="text-3xl font-bold text-text mt-1">
                {data.totalRecords}
              </p>
              <p className="text-xs text-text-muted mt-1">
                {data.evaluationsToday > 0
                  ? `${data.evaluationsToday} updated today`
                  : "Updated today"}
              </p>
            </div>
          </div>
          <MiniBarChart data={data.evaluationSparkline} />
        </div>
      </Card>
    </div>
  );
}
