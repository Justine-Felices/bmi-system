import { TrendingUp, Users, Activity, ClipboardList } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, ResponsiveContainer } from 'recharts';
import type { DashboardData } from '../../types';
import { Card } from '../ui/Card';

interface StatCardsRowProps {
  data: DashboardData;
}

function MiniSparkline({ data, color }: { data: { value: number }[]; color: string }) {
  return (
    <div className="h-10 w-20">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <Line type="monotone" dataKey="value" stroke={color} strokeWidth={2} dot={false} isAnimationActive={false} />
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
          <Bar dataKey="value" fill="#14b8a6" radius={[2, 2, 0, 0]} isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function StatCardsRow({ data }: StatCardsRowProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <Card className="p-5">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 text-slate-500 mb-2">
              <Users className="w-4 h-4" />
              <span className="text-xs font-semibold uppercase tracking-wide">Total Students</span>
            </div>
            <p className="text-3xl font-bold text-slate-900">{data.totalStudents}</p>
            {data.studentGrowthPercent !== null && (
              <p className="text-xs font-semibold text-emerald-600 mt-1 flex items-center gap-1">
                <TrendingUp className="w-3 h-3" />
                {data.studentGrowthPercent >= 0 ? '+' : ''}{data.studentGrowthPercent}% this month
              </p>
            )}
          </div>
          <MiniSparkline data={data.studentSparkline} color="#14b8a6" />
        </div>
      </Card>

      <Card className="p-5">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 text-slate-500 mb-2">
              <Activity className="w-4 h-4 text-teal-600" />
              <span className="text-xs font-semibold uppercase tracking-wide">Healthy BMI</span>
            </div>
            <p className="text-3xl font-bold text-slate-900">{data.healthyCount}</p>
            <p className="text-xs text-slate-500 mt-1">{data.healthyPercent}% of population</p>
            <div className="mt-3 h-2 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-teal-500 rounded-full transition-all"
                style={{ width: `${data.healthyPercent}%` }}
              />
            </div>
          </div>
        </div>
      </Card>

      <Card className="p-5">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 text-slate-500 mb-2">
              <Activity className="w-4 h-4 text-amber-500" />
              <span className="text-xs font-semibold uppercase tracking-wide">At Risk</span>
            </div>
            <p className="text-3xl font-bold text-slate-900">{data.atRiskCount}</p>
            <p className="text-xs text-slate-500 mt-1">Needs monitoring</p>
            <div className="mt-3 h-2 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-amber-500 rounded-full transition-all"
                style={{ width: `${data.atRiskPercent}%` }}
              />
            </div>
          </div>
        </div>
      </Card>

      <Card className="p-5">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 text-slate-500 mb-2">
              <ClipboardList className="w-4 h-4" />
              <span className="text-xs font-semibold uppercase tracking-wide">Latest Evaluations</span>
            </div>
            <p className="text-3xl font-bold text-slate-900">{data.totalRecords}</p>
            <p className="text-xs text-slate-500 mt-1">
              {data.evaluationsToday > 0 ? `${data.evaluationsToday} updated today` : 'Updated today'}
            </p>
          </div>
          <MiniBarChart data={data.evaluationSparkline} />
        </div>
      </Card>
    </div>
  );
}
