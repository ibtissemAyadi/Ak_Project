import type { AppDocument } from '@/types'
import { withLatency, generateId } from '@/lib/api-client'
import { MOCK_DOCUMENTS } from '@/mocks/data/documents'

let documents: AppDocument[] = [...MOCK_DOCUMENTS]

export const documentsService = {
  list: () => withLatency(() => [...documents].sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1))),

  getById: (id: string) =>
    withLatency(() => {
      const doc = documents.find((d) => d.id === id)
      if (!doc) throw new Error('Document not found.')
      return doc
    }),

  upload: (payload: { name: string; category: AppDocument['category']; sizeKb: number; ownerName: string }) =>
    withLatency(
      () => {
        const now = new Date().toISOString()
        const ext = payload.name.split('.').pop()?.toLowerCase() ?? 'pdf'
        const doc: AppDocument = {
          id: generateId('doc'),
          name: payload.name,
          category: payload.category,
          fileType: (['pdf', 'docx', 'xlsx', 'png', 'jpg', 'dwg', 'zip'].includes(ext) ? ext : 'pdf') as AppDocument['fileType'],
          sizeKb: payload.sizeKb,
          ownerName: payload.ownerName,
          uploadedAt: now,
          updatedAt: now,
          versions: [{ id: generateId('dv'), version: 1, uploadedBy: payload.ownerName, uploadedAt: now, sizeKb: payload.sizeKb, note: 'Initial upload' }],
          tags: [],
        }
        documents = [doc, ...documents]
        return doc
      },
      { minMs: 600, maxMs: 1400, failRate: 0.08, errorMessage: 'Upload failed. Please check your connection and try again.' },
    ),

  remove: (id: string) =>
    withLatency(() => {
      documents = documents.filter((d) => d.id !== id)
      return { success: true }
    }),
}
