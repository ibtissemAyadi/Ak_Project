import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { PageHeader } from '@/components/shared/page-header'
import { DataTable } from '@/components/shared/data-table'
import { FilterSelect } from '@/components/shared/filter-select'
import { useAsync } from '@/hooks/use-async'
import { facturesService } from '@/services/factures-service'
import { factureColumns } from '@/features/factures/components/facture-columns'
import { FACTURE_STATUT_META } from '@/lib/constants'

export function FacturesListPage() {
  const navigate = useNavigate()
  const { data, isLoading, error, refetch } = useAsync(() => facturesService.list(), [])
  const [statutFilter, setStatutFilter] = useState('all')

  const filtered = useMemo(() => {
    if (!data) return []
    return data.filter((f) => statutFilter === 'all' || f.statut === statutFilter)
  }, [data, statutFilter])

  return (
    <div className="space-y-6">
      <PageHeader
        title="Factures"
        description="Consultez les factures générées à partir des affaires et suivez leur règlement."
      />

      <DataTable
        columns={factureColumns}
        data={filtered}
        isLoading={isLoading}
        error={error}
        onRetry={refetch}
        searchPlaceholder="Rechercher une facture…"
        onRowClick={(row) => navigate(`/factures/${row.id}`)}
        emptyTitle="Aucune facture pour l'instant"
        emptyDescription="Les factures sont créées automatiquement depuis une affaire une fois le devis accepté."
        toolbar={
          <FilterSelect
            label="Statut"
            value={statutFilter}
            onChange={setStatutFilter}
            options={Object.entries(FACTURE_STATUT_META).map(([value, meta]) => ({ value, label: meta.label }))}
          />
        }
      />
    </div>
  )
}
