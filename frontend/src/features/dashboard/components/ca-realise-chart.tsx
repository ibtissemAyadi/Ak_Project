import { useMemo, useState } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { FilterSelect } from '@/components/shared/filter-select'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useAsync } from '@/hooks/use-async'
import { devisService } from '@/services/devis-service'
import type { DevisIntervenant } from '@/types'
import { formatCurrency } from '@/lib/formatters'

const MOIS_COURTS = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc']

// Une couleur par rang d'année (année courante en avant-plan, les
// précédentes en gris dégradé) — même logique que le graphique de
// référence (N en couleur vive, N-1/N-2 plus neutres).
const COULEURS = ['hsl(var(--chart-1))', 'hsl(var(--foreground))', 'hsl(var(--muted-foreground))']

interface Props {
  intervenants: DevisIntervenant[]
}

// Filtre "chargé d'affaires" géré ici, indépendamment du filtre global du
// dashboard : on veut pouvoir comparer les courbes d'une personne sans
// changer les KPI/autres graphiques affichés au-dessus.
export function CaRealiseChart({ intervenants }: Props) {
  const [vue, setVue] = useState<'mensuel' | 'annuel'>('mensuel')
  const [chargeAffaires, setChargeAffaires] = useState('all')

  const { data } = useAsync(
    () => devisService.caRealise(3, chargeAffaires === 'all' ? undefined : chargeAffaires),
    [chargeAffaires],
  )

  const annees = useMemo(() => [...(data ?? [])].sort((a, b) => a.annee - b.annee), [data])

  const dataMensuelle = useMemo(
    () =>
      MOIS_COURTS.map((label, index) => {
        const point: Record<string, string | number> = { mois: label }
        for (const annee of annees) {
          point[annee.annee] = annee.points[index]?.cumulEur ?? 0
        }
        return point
      }),
    [annees],
  )

  const dataAnnuelle = useMemo(
    () =>
      annees.map((annee) => ({
        annee: String(annee.annee),
        total: annee.points.at(-1)?.cumulEur ?? 0,
      })),
    [annees],
  )

  return (
    <Card className="col-span-1 lg:col-span-3">
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 space-y-0">
        <CardTitle>Chiffre d'affaires réalisé (devis acceptés)</CardTitle>
        <div className="flex flex-wrap items-center gap-2">
          <FilterSelect
            label="Chargé d'affaires"
            value={chargeAffaires}
            onChange={setChargeAffaires}
            options={intervenants.map((i) => ({ value: i.id, label: `${i.prenom} ${i.nom}` }))}
            allLabel="Tous les chargés d'affaires"
            className="h-9 w-[200px]"
          />
          <Tabs value={vue} onValueChange={(v) => setVue(v as 'mensuel' | 'annuel')}>
            <TabsList>
              <TabsTrigger value="mensuel">Mensuel (cumulé)</TabsTrigger>
              <TabsTrigger value="annuel">Annuel</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </CardHeader>
      <CardContent className="h-80 pl-0">
        {annees.length === 0 || annees.every((a) => a.points.every((p) => p.cumulEur === 0)) ? (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            Aucun devis accepté pour le moment.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            {vue === 'mensuel' ? (
              <LineChart data={dataMensuelle} margin={{ top: 4, right: 16, left: 8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="mois" tickLine={false} axisLine={false} fontSize={12} stroke="hsl(var(--muted-foreground))" />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  fontSize={12}
                  stroke="hsl(var(--muted-foreground))"
                  tickFormatter={(v) => `${Math.round(v / 1000)}k`}
                  width={48}
                />
                <Tooltip
                  formatter={(value) => formatCurrency(Number(value))}
                  contentStyle={{
                    borderRadius: 8,
                    border: '1px solid hsl(var(--border))',
                    background: 'hsl(var(--popover))',
                    color: 'hsl(var(--popover-foreground))',
                    fontSize: 12,
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                {annees.map((annee, index) => (
                  <Line
                    key={annee.annee}
                    type="monotone"
                    dataKey={String(annee.annee)}
                    name={String(annee.annee)}
                    stroke={COULEURS[annees.length - 1 - index] ?? COULEURS[0]}
                    strokeWidth={index === annees.length - 1 ? 2.5 : 1.5}
                    dot={{ r: 3 }}
                  />
                ))}
              </LineChart>
            ) : (
              <BarChart data={dataAnnuelle} margin={{ top: 4, right: 16, left: 8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="annee" tickLine={false} axisLine={false} fontSize={12} stroke="hsl(var(--muted-foreground))" />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  fontSize={12}
                  stroke="hsl(var(--muted-foreground))"
                  tickFormatter={(v) => `${Math.round(v / 1000)}k`}
                  width={48}
                />
                <Tooltip
                  cursor={{ fill: 'hsl(var(--accent))' }}
                  formatter={(value) => formatCurrency(Number(value))}
                  contentStyle={{
                    borderRadius: 8,
                    border: '1px solid hsl(var(--border))',
                    background: 'hsl(var(--popover))',
                    color: 'hsl(var(--popover-foreground))',
                    fontSize: 12,
                  }}
                />
                <Bar dataKey="total" name="CA réalisé" fill="hsl(var(--chart-1))" radius={[4, 4, 0, 0]} maxBarSize={60} />
              </BarChart>
            )}
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  )
}
