import { useMemo, useState } from 'react'
import { Search } from 'lucide-react'

import { PageHeader } from '@/components/shared/page-header'
import { FilterSelect } from '@/components/shared/filter-select'
import { EmptyState } from '@/components/shared/empty-state'
import { ErrorState } from '@/components/shared/error-state'
import { CardGridSkeleton } from '@/components/shared/loading-state'
import { Input } from '@/components/ui/input'
import { useAsync } from '@/hooks/use-async'
import { projectsService } from '@/services/projects-service'
import { ProjectCard } from '@/features/projects/components/project-card'
import { PROJECT_PRIORITY_META, PROJECT_STATUS_META } from '@/lib/constants'

export function ProjectsListPage() {
  const { data, isLoading, error, refetch } = useAsync(() => projectsService.list(), [])
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [priorityFilter, setPriorityFilter] = useState('all')

  const filtered = useMemo(() => {
    if (!data) return []
    return data.filter((p) => {
      if (statusFilter !== 'all' && p.status !== statusFilter) return false
      if (priorityFilter !== 'all' && p.priority !== priorityFilter) return false
      if (search && !`${p.name} ${p.clientName} ${p.reference}`.toLowerCase().includes(search.toLowerCase())) return false
      return true
    })
  }, [data, statusFilter, priorityFilter, search])

  return (
    <div className="space-y-6">
      <PageHeader title="Projects" description="Track engagement delivery, budgets and teams across active projects." />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-xs">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search projects…" className="pl-8" />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <FilterSelect
            label="Status"
            value={statusFilter}
            onChange={setStatusFilter}
            options={Object.entries(PROJECT_STATUS_META).map(([value, meta]) => ({ value, label: meta.label }))}
          />
          <FilterSelect
            label="Priority"
            value={priorityFilter}
            onChange={setPriorityFilter}
            options={Object.entries(PROJECT_PRIORITY_META).map(([value, meta]) => ({ value, label: meta.label }))}
          />
        </div>
      </div>

      {isLoading ? (
        <CardGridSkeleton count={6} />
      ) : error ? (
        <ErrorState onRetry={refetch} />
      ) : filtered.length === 0 ? (
        <EmptyState title="No projects found" description="Try adjusting your filters or search terms." />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      )}
    </div>
  )
}
