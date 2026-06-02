import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { BarChart3, Loader2 } from 'lucide-react';
import type { DashboardData } from '../../types';
import { Card } from '../ui/Card';

interface GradeDistributionCardProps {
  data: DashboardData;
  loading?: boolean;
}

export function GradeDistributionCard({ data, loading }: GradeDistributionCardProps) {
  return (
    <Card className="p-5 h-full" id="chart-grade-dist">
      <div className="flex items-center gap-2 mb-4">
        <BarChart3 className="w-4 h-4 text-teal-600" />
        <h3 className="font-bold text-slate-900">Grade Distribution</h3>
      </div>

      {loading ? (
        <div className="h-[180px] flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin opacity-30" />
        </div>
      ) : data.gradeData.length === 0 ? (
        <div className="h-[180px] flex items-center justify-center text-slate-400 text-sm">
          No grade data
        </div>
      ) : (
        <div className="h-[180px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.gradeData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#94a3b8' }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#94a3b8' }} allowDecimals={false} />
              <Tooltip
                cursor={{ fill: '#f8fafc' }}
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
              />
              <Bar dataKey="value" fill="#14b8a6" radius={[4, 4, 0, 0]} isAnimationActive={false} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  );
}
