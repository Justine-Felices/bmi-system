import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { TrendingUp, Loader2 } from 'lucide-react';
import type { DashboardData } from '../../types';
import { Card } from '../ui/Card';

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
            <TrendingUp className="w-4 h-4 text-teal-600" />
            <h3 className="font-bold text-slate-900">BMI Trend (All Students)</h3>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">Last {data.trendData.length || 10} Days</p>
        </div>
      </div>

      {loading ? (
        <div className="h-[260px] flex items-center justify-center text-slate-400">
          <Loader2 className="w-8 h-8 animate-spin opacity-30" />
        </div>
      ) : data.trendData.length === 0 ? (
        <div className="h-[260px] flex items-center justify-center text-slate-400 text-sm">
          No trend data for the selected period
        </div>
      ) : (
        <div className="h-[260px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data.trendData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#94a3b8' }} />
              <YAxis domain={['dataMin - 1', 'dataMax + 1']} axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#94a3b8' }} />
              <Tooltip
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                formatter={(value: number) => [`${value}`, 'Average BMI']}
              />
              <Line
                type="monotone"
                dataKey="bmi"
                stroke="#14b8a6"
                strokeWidth={2.5}
                dot={{ r: 4, fill: '#14b8a6', strokeWidth: 2, stroke: '#fff' }}
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
