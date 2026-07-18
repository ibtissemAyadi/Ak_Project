import { useState } from 'react'
import { toast } from 'sonner'
import { File as FileIcon, Upload, X } from 'lucide-react'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { FileDropzone } from '@/components/shared/file-dropzone'
import { DOCUMENT_CATEGORY_META } from '@/lib/constants'
import { documentsService } from '@/services/documents-service'
import { useAuthStore } from '@/store/auth-store'
import type { DocumentCategory } from '@/types'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  onUploaded: () => void
}

export function UploadDialog({ open, onOpenChange, onUploaded }: Props) {
  const user = useAuthStore((s) => s.user)
  const [files, setFiles] = useState<File[]>([])
  const [category, setCategory] = useState<DocumentCategory>('technical')
  const [isUploading, setIsUploading] = useState(false)

  const handleUpload = async () => {
    if (files.length === 0) return
    setIsUploading(true)
    try {
      for (const file of files) {
        await documentsService.upload({
          name: file.name,
          category,
          sizeKb: Math.max(20, Math.round(file.size / 1024)),
          ownerName: user ? `${user.prenom} ${user.nom}` : 'You',
        })
      }
      toast.success(`${files.length} document${files.length > 1 ? 's' : ''} uploaded successfully.`)
      setFiles([])
      onOpenChange(false)
      onUploaded()
    } catch {
      toast.error('Upload failed. Please try again.')
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Upload documents</DialogTitle>
          <DialogDescription>Add files to your document library and assign a category.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <FileDropzone onFilesSelected={(newFiles) => setFiles((prev) => [...prev, ...newFiles])} />

          {files.length > 0 ? (
            <div className="space-y-1.5">
              {files.map((file, i) => (
                <div key={`${file.name}-${i}`} className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm">
                  <div className="flex min-w-0 items-center gap-2">
                    <FileIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <span className="truncate">{file.name}</span>
                  </div>
                  <button onClick={() => setFiles((prev) => prev.filter((_, idx) => idx !== i))} className="text-muted-foreground hover:text-destructive">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          ) : null}

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Category</label>
            <Select value={category} onValueChange={(v) => setCategory(v as DocumentCategory)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(DOCUMENT_CATEGORY_META).map(([value, meta]) => (
                  <SelectItem key={value} value={value}>
                    {meta.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button className="gap-2" disabled={files.length === 0 || isUploading} onClick={handleUpload}>
            <Upload className="h-4 w-4" />
            {isUploading ? 'Uploading…' : 'Upload'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
