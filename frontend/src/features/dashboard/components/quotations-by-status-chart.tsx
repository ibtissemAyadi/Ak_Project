import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { DEVIS_STATUT_META } from '@/lib/constants'

const COLORS: Record<string, string> = {
  Brouillon: 'hsl(var(--muted-foreground))',
  En_preparation: 'hsl(var(--chart-2))',
  A_valider: 'hsl(var(--chart-4))',
  Envoye: 'hsl(var(--chart-1))',
  Accepte: 'hsl(var(--chart-3))',
  Refuse: 'hsl(var(--destructive))',
  Annule: 'hsl(var(--chart-5))',
}

interface Props {
  data: { status: string; count: number }[]
}

export function QuotationsByStatusChart({ data }: Props) {
  const chartData = data
    .filter((d) => d.count > 0)
    .map((d) => ({ name: DEVIS_STATUT_META[d.status]?.label ?? d.status, value: d.count, status: d.status }))

  return (
    <Card>
      <CardHeader>
        <CardTitle>Devis par statut</CardTitle>
      </CardHeader>
      <CardContent className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              dataKey="value"
              nameKey="name"
              cx="35%"
              cy="50%"
              innerRadius="55%"
              outerRadius="85%"
              paddingAngle={2}
            >
              {chartData.map((entry) => (
                <Cell key={entry.status} fill={COLORS[entry.status]} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                borderRadius: 8,
                border: '1px solid hsl(var(--border))',
                background: 'hsl(var(--popover))',
                color: 'hsl(var(--popover-foreground))',
                fontSize: 12,
              }}
            />
            <Legend
              layout="vertical"
              align="right"
              verticalAlign="middle"
              wrapperStyle={{ fontSize: 12 }}
              iconType="circle"
              iconSize={8}
            />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
