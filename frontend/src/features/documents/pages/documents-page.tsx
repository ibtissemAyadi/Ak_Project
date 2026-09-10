import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { FileText, Search, Trash2, Upload } from 'lucide-react'

import { PageHeader } from '@/components/shared/page-header'
import { FilterSelect } from '@/components/shared/filter-select'
import { EmptyState } from '@/components/shared/empty-state'
import { ErrorState } from '@/components/shared/error-state'
import { CardGridSkeleton } from '@/components/shared/loading-state'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useAsync } from '@/hooks/use-async'
import { documentsService } from '@/services/documents-service'
import { UploadDialog } from '@/features/documents/components/upload-dialog'
import { DocumentPreviewDialog } from '@/features/documents/components/document-preview-dialog'
import { DOCUMENT_CATEGORY_META } from '@/lib/constants'
import { formatDate } from '@/lib/formatters'
import type { AppDocument } from '@/types'

export function DocumentsPage() {
  const { data, isLoading, error, refetch } = useAsync(() => documentsService.list(), [])
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [uploadOpen, setUploadOpen] = useState(false)
  const [previewDoc, setPreviewDoc] = useState<AppDocument | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<AppDocument | null>(null)

  const filtered = useMemo(() => {
    if (!data) return []
    return data.filter((d) => {
      if (categoryFilter !== 'all' && d.category !== categoryFilter) return false
      if (search && !d.name.toLowerCase().includes(search.toLowerCase())) return false
      return true
    })
  }, [data, categoryFilter, search])

  return (
    <div className="space-y-6">
      <PageHeader
        title="Documents"
        description="Fichiers importés, devis et factures générés — au même endroit."
        actions={
          <Button className="gap-2" onClick={() => setUploadOpen(true)}>
            <Upload className="h-4 w-4" />
            Importer
          </Button>
        }
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-xs">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher un document…" className="pl-8" />
        </div>
        <FilterSelect
          label="Catégorie"
          value={categoryFilter}
          onChange={setCategoryFilter}
          options={Object.entries(DOCUMENT_CATEGORY_META).map(([value, meta]) => ({ value, label: meta.label }))}
        />
      </div>

      {isLoading ? (
        <CardGridSkeleton count={8} />
      ) : error ? (
        <ErrorState onRetry={refetch} />
      ) : filtered.length === 0 ? (
        <EmptyState
          title="Aucun document trouvé"
          description="Importez un fichier ou ajustez vos filtres."
          actionLabel="Importer un document"
          onAction={() => setUploadOpen(true)}
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((doc) => (
            <Card key={doc.id} className="group cursor-pointer transition-shadow hover:shadow-md" onClick={() => setPreviewDoc(doc)}>
              <CardContent className="space-y-3 p-4">
                <div className="flex items-start justify-between">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/15 text-accent-foreground">
                    <FileText className="h-5 w-5" />
                  </div>
                  {doc.source === 'upload' ? (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 opacity-0 text-muted-foreground hover:text-destructive group-hover:opacity-100"
                      onClick={(e) => {
                        e.stopPropagation()
                        setDeleteTarget(doc)
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  ) : null}
                </div>
                <div>
                  <p className="line-clamp-2 text-sm font-medium text-foreground">{doc.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {doc.sizeKb !== null ? `${(doc.sizeKb / 1024).toFixed(1)} Mo` : 'PDF généré'}
                  </p>
                </div>
                <div className="flex items-center justify-between">
                  <Badge variant="secondary">{DOCUMENT_CATEGORY_META[doc.category]?.label}</Badge>
                  <span className="text-[11px] text-muted-foreground">{formatDate(doc.createdAt)}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <UploadDialog open={uploadOpen} onOpenChange={setUploadOpen} onUploaded={refetch} />

      <DocumentPreviewDialog
        document={previewDoc}
        onOpenChange={(open) => !open && setPreviewDoc(null)}
        onDelete={(id) => {
          setPreviewDoc(null)
          setDeleteTarget(data?.find((d) => d.id === id) ?? null)
        }}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Supprimer le document"
        description={`Êtes-vous sûr de vouloir supprimer « ${deleteTarget?.name} » ? Cette action est irréversible.`}
        confirmLabel="Supprimer le document"
        onConfirm={async () => {
          if (!deleteTarget) return
          await documentsService.remove(deleteTarget)
          toast.success('Document supprimé.')
          refetch()
        }}
      />
    </div>
  )
}
