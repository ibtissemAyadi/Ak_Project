import { Download, FileText, History, Trash2 } from 'lucide-react'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { DOCUMENT_CATEGORY_META } from '@/lib/constants'
import { formatDateTime } from '@/lib/formatters'
import type { AppDocument } from '@/types'

interface Props {
  document: AppDocument | null
  onOpenChange: (open: boolean) => void
  onDelete: (id: string) => void
}

export function DocumentPreviewDialog({ document, onOpenChange, onDelete }: Props) {
  return (
    <Dialog open={!!document} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        {document ? (
          <>
            <DialogHeader>
              <DialogTitle className="pr-6">{document.name}</DialogTitle>
              <DialogDescription>
                {DOCUMENT_CATEGORY_META[document.category]?.label} · Owned by {document.ownerName}
              </DialogDescription>
            </DialogHeader>

            <div className="flex h-40 items-center justify-center rounded-lg border border-dashed border-border bg-muted/30">
              <div className="flex flex-col items-center gap-2 text-muted-foreground">
                <FileText className="h-10 w-10" />
                <span className="text-xs uppercase">{document.fileType} preview</span>
              </div>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {document.tags.map((tag) => (
                <Badge key={tag} variant="secondary">{tag}</Badge>
              ))}
              {document.relatedTo ? <Badge variant="outline">Related: {document.relatedTo}</Badge> : null}
            </div>

            <Separator />

            <div>
              <p className="mb-2 flex items-center gap-1.5 text-sm font-medium text-foreground">
                <History className="h-4 w-4" />
                Version history
              </p>
              <div className="space-y-2">
                {[...document.versions].reverse().map((v) => (
                  <div key={v.id} className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm">
                    <div>
                      <span className="font-medium text-foreground">v{v.version}</span>{' '}
                      <span className="text-muted-foreground">— {v.uploadedBy}</span>
                      {v.note ? <p className="text-xs text-muted-foreground">{v.note}</p> : null}
                    </div>
                    <div className="text-right text-xs text-muted-foreground">
                      <p>{formatDateTime(v.uploadedAt)}</p>
                      <p>{(v.sizeKb / 1024).toFixed(1)} MB</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t border-border pt-4">
              <Button variant="outline" className="gap-2 text-destructive hover:text-destructive" onClick={() => onDelete(document.id)}>
                <Trash2 className="h-4 w-4" />
                Delete
              </Button>
              <Button className="gap-2">
                <Download className="h-4 w-4" />
                Download
              </Button>
            </div>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
