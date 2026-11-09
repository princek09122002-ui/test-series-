"use client";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from "recharts";
const colors = ["#5b64dd", "#35ad91", "#e9ac52", "#a383d6"];
export function ScoreTrendChart({
  data,
}: {
  data: { name: string; score: number }[];
}) {
  return (
    <div
      className="h-56 min-w-0"
      role="img"
      aria-label="Raw marks across recent submitted tests"
    >
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={data}
          margin={{ top: 15, right: 10, left: -20, bottom: 0 }}
        >
          <CartesianGrid
            vertical={false}
            strokeDasharray="4 4"
            stroke="var(--border)"
          />
          <XAxis
            dataKey="name"
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
          />
          <YAxis
            domain={["auto", "auto"]}
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
          />
          <Tooltip
            contentStyle={{
              background: "var(--card)",
              borderRadius: 12,
              fontSize: 12,
            }}
          />
          <Area
            isAnimationActive={false}
            dataKey="score"
            name="Raw marks"
            stroke="#35ad91"
            fill="#35ad9115"
            strokeWidth={2}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
export function PacingChart({
  data,
}: {
  data: { name: string; seconds: number; accuracy: number; count: number }[];
}) {
  return (
    <div
      className="h-64 min-w-0"
      role="img"
      aria-label="Average active seconds versus accuracy for each subject"
    >
      <ResponsiveContainer width="100%" height="100%">
        <ScatterChart margin={{ top: 15, right: 20, left: -10, bottom: 15 }}>
          <CartesianGrid stroke="var(--border)" strokeDasharray="4 4" />
          <XAxis
            type="number"
            dataKey="seconds"
            name="Avg. active seconds"
            unit="s"
            tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
          />
          <YAxis
            type="number"
            dataKey="accuracy"
            name="Accuracy"
            unit="%"
            domain={[0, 100]}
            tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
          />
          <ZAxis dataKey="count" range={[70, 220]} name="Observed questions" />
          <Tooltip
            contentStyle={{
              background: "var(--card)",
              borderRadius: 12,
              fontSize: 12,
            }}
          />
          <Scatter isAnimationActive={false} data={data}>
            {data.map((d, i) => (
              <Cell key={d.name} fill={colors[i % colors.length]} />
            ))}
          </Scatter>
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
}
export function TrendChart({
  data,
}: {
  data: { name: string; accuracy: number; score: number }[];
}) {
  return (
    <div
      className="h-60 w-full min-w-0"
      role="img"
      aria-label="Accuracy trend across recent submitted tests"
    >
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={data}
          margin={{ top: 15, right: 10, bottom: 0, left: -25 }}
        >
          <defs>
            <linearGradient id="accuracy-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#5b64dd" stopOpacity={0.2} />
              <stop offset="100%" stopColor="#5b64dd" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid
            strokeDasharray="4 4"
            vertical={false}
            stroke="var(--border)"
          />
          <XAxis
            dataKey="name"
            tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            domain={[0, 100]}
            tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            contentStyle={{
              borderRadius: 12,
              border: "1px solid var(--border)",
              background: "var(--card)",
              fontSize: 12,
            }}
          />
          <Area
            isAnimationActive={false}
            type="monotone"
            dataKey="accuracy"
            name="Accuracy %"
            stroke="#5b64dd"
            strokeWidth={2.5}
            fill="url(#accuracy-fill)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
export function BreakdownChart({
  data,
  time = false,
}: {
  data: { name: string; value: number }[];
  time?: boolean;
}) {
  return (
    <div
      className="h-56 min-w-0"
      role="img"
      aria-label={
        time
          ? "Active solving time by subject in seconds"
          : "Accuracy by subject"
      }
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ left: -20, right: 5, top: 15 }}>
          <CartesianGrid
            vertical={false}
            stroke="var(--border)"
            strokeDasharray="4 4"
          />
          <XAxis
            dataKey="name"
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
          />
          <YAxis
            domain={time ? undefined : [0, 100]}
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
          />
          <Tooltip
            contentStyle={{
              background: "var(--card)",
              borderRadius: 12,
              fontSize: 12,
            }}
          />
          <Bar
            isAnimationActive={false}
            dataKey="value"
            name={time ? "Active seconds" : "Accuracy %"}
            radius={[6, 6, 0, 0]}
            maxBarSize={55}
          >
            {data.map((d, i) => (
              <Cell key={d.name} fill={colors[i % colors.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
export function OutcomeChart({
  correct,
  incorrect,
  unattempted,
}: {
  correct: number;
  incorrect: number;
  unattempted: number;
}) {
  const data = [
    { name: "Correct", value: correct, color: "#35ad91" },
    { name: "Incorrect", value: incorrect, color: "#e27373" },
    { name: "Unattempted", value: unattempted, color: "#c3cadd" },
  ];
  return (
    <div>
      <div
        className="h-44"
        role="img"
        aria-label={`${correct} correct, ${incorrect} incorrect, ${unattempted} unattempted`}
      >
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              isAnimationActive={false}
              data={data}
              dataKey="value"
              innerRadius={45}
              outerRadius={70}
              paddingAngle={4}
              stroke="none"
            >
              {data.map((d) => (
                <Cell key={d.name} fill={d.color} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                background: "var(--card)",
                borderRadius: 12,
                fontSize: 12,
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="flex justify-center gap-4 text-[10px] text-muted-foreground">
        {data.map((d) => (
          <span key={d.name} className="flex items-center gap-1">
            <i
              className="size-2 rounded-full"
              style={{ background: d.color }}
            />
            {d.name} {d.value}
          </span>
        ))}
      </div>
    </div>
  );
}
