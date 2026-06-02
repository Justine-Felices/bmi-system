import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { Users, Loader2 } from "lucide-react";
import type { DashboardData } from "../../types";
import { Card } from "../ui/Card";

interface GenderDistributionCardProps {
  data: DashboardData;
  loading?: boolean;
}

export function GenderDistributionCard({
  data,
  loading,
}: GenderDistributionCardProps) {
  const total = data.genderData.reduce((s, d) => s + d.value, 0);

  return (
    <Card className="p-5 h-full overflow-visible" id="chart-gender-dist">
      <div className="flex items-center gap-2 mb-4">
        <Users className="w-4 h-4 text-primary" />
        <h3 className="font-bold text-text">Gender Distribution</h3>
      </div>

      {loading ? (
        <div className="h-[200px] flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin opacity-30" />
        </div>
      ) : data.genderData.length === 0 ? (
        <div className="h-[200px] flex items-center justify-center text-text-muted text-sm">
          No gender data
        </div>
      ) : (
        <>
          <div className="flex items-center gap-4">
            <div className="h-[160px] w-[160px] shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
                  <Pie
                    data={data.genderData}
                    cx="50%"
                    cy="50%"
                    innerRadius={36}
                    outerRadius={56}
                    paddingAngle={3}
                    dataKey="value"
                    isAnimationActive={false}
                  >
                    {data.genderData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex-1 space-y-2">
              {data.genderData.map((item) => (
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
        </>
      )}
    </Card>
  );
}
