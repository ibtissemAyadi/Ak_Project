import { toast } from 'sonner'
import { Download, FileText, Trash2 } from 'lucide-react'

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
import { documentsService } from '@/services/documents-service'
import { DOCUMENT_CATEGORY_META } from '@/lib/constants'
import { formatDateTime } from '@/lib/formatters'
import type { AppDocument } from '@/types'

const SOURCE_LABELS: Record<AppDocument['source'], string> = {
  upload: 'Importé',
  devis: 'Devis généré',
  facture: 'Facture générée',
}

interface Props {
  document: AppDocument | null
  onOpenChange: (open: boolean) => void
  onDelete: (id: string) => void
}

export function DocumentPreviewDialog({ document, onOpenChange, onDelete }: Props) {
  const handleDownload = async () => {
    if (!document) return
    if (document.source === 'upload' && document.downloadUrl) {
      window.open(document.downloadUrl, '_blank', 'noopener,noreferrer')
      return
    }
    try {
      await documentsService.downloadPdf(document)
    } catch {
      toast.error('Impossible de télécharger ce document.')
    }
  }

  return (
    <Dialog open={!!document} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        {document ? (
          <>
            <DialogHeader>
              <DialogTitle className="pr-6">{document.name}</DialogTitle>
              <DialogDescription>
                {DOCUMENT_CATEGORY_META[document.category]?.label} · Ajouté par {document.ownerName}
              </DialogDescription>
            </DialogHeader>

            <div className="flex h-40 items-center justify-center rounded-lg border border-dashed border-border bg-muted/30">
              <div className="flex flex-col items-center gap-2 text-muted-foreground">
                <FileText className="h-10 w-10" />
                <span className="text-xs uppercase">Aperçu {document.fileType}</span>
              </div>
            </div>

            <div className="flex flex-wrap gap-1.5">
              <Badge variant="secondary">{SOURCE_LABELS[document.source]}</Badge>
              {document.relatedTo ? <Badge variant="outline">Lié à : {document.relatedTo}</Badge> : null}
            </div>

            <Separator />

            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">Ajouté le</p>
                <p className="font-medium text-foreground">{formatDateTime(document.createdAt)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Taille</p>
                <p className="font-medium text-foreground">
                  {document.sizeKb !== null ? `${(document.sizeKb / 1024).toFixed(1)} Mo` : 'Généré à la demande'}
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t border-border pt-4">
              {document.source === 'upload' ? (
                <Button
                  variant="outline"
                  className="gap-2 text-destructive hover:text-destructive"
                  onClick={() => onDelete(document.id)}
                >
                  <Trash2 className="h-4 w-4" />
                  Supprimer
                </Button>
              ) : null}
              <Button className="gap-2" onClick={handleDownload}>
                <Download className="h-4 w-4" />
                Télécharger
              </Button>
            </div>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
