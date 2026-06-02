import { Activity, ClipboardList, TrendingUp, Users } from 'lucide-react';
import type { StudentDirectoryStats } from '../../hooks/useStudentDirectory';
import { Card } from '../ui/Card';

interface StudentsStatCardsProps {
  stats: StudentDirectoryStats;
}

export function StudentsStatCards({ stats }: StudentsStatCardsProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <Card className="p-5">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 text-slate-500 mb-2">
              <Users className="w-4 h-4 text-teal-600" />
              <span className="text-xs font-semibold uppercase tracking-wide">Total Students</span>
            </div>
            <p className="text-3xl font-bold text-slate-900">{stats.totalStudents}</p>
            {stats.studentGrowthPercent !== null && (
              <p className="text-xs font-semibold text-emerald-600 mt-1 flex items-center gap-1">
                <TrendingUp className="w-3 h-3" />
                {stats.studentGrowthPercent >= 0 ? '+' : ''}{stats.studentGrowthPercent}% this month
              </p>
            )}
          </div>
        </div>
      </Card>

      <Card className="p-5">
        <div className="flex items-center gap-2 text-slate-500 mb-2">
          <Activity className="w-4 h-4 text-teal-600" />
          <span className="text-xs font-semibold uppercase tracking-wide">Active Monitoring</span>
        </div>
        <p className="text-3xl font-bold text-slate-900">{stats.activeMonitoring}</p>
        <p className="text-xs text-slate-500 mt-1">{stats.activeMonitoringPercent}% of students</p>
        <div className="mt-3 h-2 bg-slate-100 rounded-full overflow-hidden">
          <div className="h-full bg-teal-500 rounded-full" style={{ width: `${stats.activeMonitoringPercent}%` }} />
        </div>
      </Card>

      <Card className="p-5">
        <div className="flex items-center gap-2 text-slate-500 mb-2">
          <ClipboardList className="w-4 h-4 text-blue-600" />
          <span className="text-xs font-semibold uppercase tracking-wide">Total Evaluations</span>
        </div>
        <p className="text-3xl font-bold text-slate-900">{stats.totalEvaluationsThisMonth}</p>
        <p className="text-xs text-slate-500 mt-1">This month</p>
      </Card>

      <Card className="p-5">
        <div className="flex items-center gap-2 text-slate-500 mb-2">
          <Activity className="w-4 h-4 text-amber-500" />
          <span className="text-xs font-semibold uppercase tracking-wide">At Risk Students</span>
        </div>
        <p className="text-3xl font-bold text-slate-900">{stats.atRiskCount}</p>
        <p className="text-xs text-slate-500 mt-1">Needs attention</p>
      </Card>
    </div>
  );
}
