"use client"

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts"
import {
  ChartConfig,
  ChartContainer,
  ChartTooltipContent,
} from "@/components/ui/chart"

interface HoleDistributionChartProps {
    data: {
        holes9: number;
        holes18: number;
        holes27: number;
    };
}

const COLORS = {
  holes9: "hsl(var(--chart-1))",
  holes18: "hsl(var(--chart-2))", 
  holes27: "hsl(var(--chart-3))"
};

const chartConfig = {
  holes9: {
    label: "9 Holes",
    color: COLORS.holes9,
  },
  holes18: {
    label: "18 Holes", 
    color: COLORS.holes18,
  },
  holes27: {
    label: "27 Holes",
    color: COLORS.holes27,
  },
} satisfies ChartConfig

export function HoleDistributionChart({ data }: HoleDistributionChartProps) {
  const chartData = [
    { name: "9 Holes", value: data.holes9, fill: COLORS.holes9 },
    { name: "18 Holes", value: data.holes18, fill: COLORS.holes18 },
    { name: "27 Holes", value: data.holes27, fill: COLORS.holes27 },
  ].filter(item => item.value > 0); // Only show segments with data

  if (chartData.length === 0) {
    return (
      <div className="flex items-center justify-center h-[200px] text-muted-foreground">
        No booking data available
      </div>
    );
  }

  return (
    <ChartContainer config={chartConfig} className="min-h-[200px] w-full">
      <ResponsiveContainer width="100%" height={200}>
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            innerRadius={40}
            outerRadius={80}
            paddingAngle={2}
            dataKey="value"
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.fill} />
            ))}
          </Pie>
          <Tooltip
            content={<ChartTooltipContent 
              formatter={(value, name) => [`${value} bookings`, name]}
            />}
          />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </ChartContainer>
  )
}