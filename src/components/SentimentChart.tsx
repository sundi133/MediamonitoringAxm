import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

interface SentimentTrendData {
  date: string;
  positive: number;
  negative: number;
  neutral: number;
}

interface SentimentDistributionData {
  name: string;
  value: number;
  fill?: string;
}

interface SentimentChartProps {
  data: SentimentTrendData[] | SentimentDistributionData[];
  type: "line" | "pie";
}

const COLORS = {
  positive: "#10b981",
  negative: "#ef4444",
  neutral: "#6b7280",
  Positive: "#10b981",
  Negative: "#ef4444",
  Neutral: "#6b7280",
};

export function SentimentChart({ data, type }: SentimentChartProps) {
  if (type === "pie") {
    // Check if data is already in distribution format
    const pieData =
      Array.isArray(data) && data.length > 0 && "name" in data[0]
        ? (data as SentimentDistributionData[])
        : [
            {
              name: "Positive",
              value: (data as SentimentTrendData[]).reduce(
                (sum, d) => sum + d.positive,
                0,
              ),
            },
            {
              name: "Negative",
              value: (data as SentimentTrendData[]).reduce(
                (sum, d) => sum + d.negative,
                0,
              ),
            },
            {
              name: "Neutral",
              value: (data as SentimentTrendData[]).reduce(
                (sum, d) => sum + d.neutral,
                0,
              ),
            },
          ];

    const totalValue = pieData.reduce((sum, entry) => sum + entry.value, 0);

    return (
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={pieData}
            cx="50%"
            cy="50%"
            outerRadius={100}
            fill="#8884d8"
            dataKey="value"
            label={({ name, value, percent }) =>
              totalValue > 0
                ? `${name} ${(percent * 100).toFixed(0)}% (${value})`
                : `${name} 0%`
            }
          >
            {pieData.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={entry.fill || COLORS[entry.name as keyof typeof COLORS]}
              />
            ))}
          </Pie>
          <Tooltip formatter={(value: number) => [`${value} mentions`, ""]} />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart
        data={data as SentimentTrendData[]}
        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
      >
        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
        <XAxis dataKey="date" className="text-xs" tick={{ fontSize: 12 }} />
        <YAxis className="text-xs" tick={{ fontSize: 12 }} />
        <Tooltip
          contentStyle={{
            backgroundColor: "hsl(var(--background))",
            border: "1px solid hsl(var(--border))",
            borderRadius: "8px",
          }}
        />
        <Legend />
        <Line
          type="monotone"
          dataKey="positive"
          stroke={COLORS.positive}
          strokeWidth={2}
          name="Positive"
          dot={{ fill: COLORS.positive }}
        />
        <Line
          type="monotone"
          dataKey="negative"
          stroke={COLORS.negative}
          strokeWidth={2}
          name="Negative"
          dot={{ fill: COLORS.negative }}
        />
        <Line
          type="monotone"
          dataKey="neutral"
          stroke={COLORS.neutral}
          strokeWidth={2}
          name="Neutral"
          dot={{ fill: COLORS.neutral }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
