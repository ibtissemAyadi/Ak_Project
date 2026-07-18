import type { AppDocument, DocumentCategory } from '@/types'
import { pick, randomInt, resetSeed } from '@/mocks/generators'
import { MOCK_CLIENTS } from '@/mocks/data/clients'
import { MOCK_PROJECTS } from '@/mocks/data/projects'
import { MOCK_USERS } from '@/mocks/data/users'

resetSeed(808)

const CATEGORY_POOL: DocumentCategory[] = ['contract', 'technical', 'financial', 'legal', 'report', 'other']

const NAME_TEMPLATES: Record<DocumentCategory, string[]> = {
  contract: ['Service Agreement', 'Master Contract', 'Amendment Addendum', 'NDA Agreement'],
  technical: ['Structural Drawing Set', 'Load Calculation Report', 'CAD Design Package', 'Site Survey Data'],
  financial: ['Budget Breakdown', 'Cost Estimate', 'Purchase Order', 'Expense Summary'],
  legal: ['Permit Application', 'Compliance Certificate', 'Insurance Certificate', 'Regulatory Filing'],
  report: ['Progress Report', 'Inspection Report', 'Risk Assessment Report', 'Final Delivery Report'],
  other: ['Meeting Minutes', 'Photo Archive', 'Correspondence Log', 'Reference Material'],
}

const FILE_TYPES: AppDocument['fileType'][] = ['pdf', 'docx', 'xlsx', 'png', 'dwg', 'zip']

export const MOCK_DOCUMENTS: AppDocument[] = Array.from({ length: 34 }).map((_, index) => {
  const category = CATEGORY_POOL[index % CATEGORY_POOL.length]
  const nameBase = pick(NAME_TEMPLATES[category])
  const relatedClient = MOCK_CLIENTS[index % MOCK_CLIENTS.length]
  const relatedProject = MOCK_PROJECTS[index % MOCK_PROJECTS.length]
  const owner = pick(MOCK_USERS)
  const uploaded = new Date()
  uploaded.setDate(uploaded.getDate() - randomInt(1, 260))
  const updated = new Date(uploaded)
  updated.setDate(updated.getDate() + randomInt(0, 40))

  const versionCount = randomInt(1, 4)
  const versions = Array.from({ length: versionCount }).map((_, vIndex) => {
    const vDate = new Date(uploaded)
    vDate.setDate(vDate.getDate() + vIndex * 8)
    return {
      id: `dv-${index + 1}-${vIndex + 1}`,
      version: vIndex + 1,
      uploadedBy: `${owner.firstName} ${owner.lastName}`,
      uploadedAt: vDate.toISOString(),
      sizeKb: randomInt(80, 9000),
      note: vIndex === 0 ? 'Initial upload' : 'Updated after internal review',
    }
  })

  return {
    id: `doc-${index + 1}`,
    name: `${nameBase} - ${relatedClient.name}.${FILE_TYPES[index % FILE_TYPES.length]}`,
    category,
    fileType: FILE_TYPES[index % FILE_TYPES.length],
    sizeKb: versions[versions.length - 1].sizeKb,
    relatedTo: pick([relatedClient.name, relatedProject.name]),
    ownerName: `${owner.firstName} ${owner.lastName}`,
    uploadedAt: uploaded.toISOString(),
    updatedAt: updated.toISOString(),
    versions,
    tags: pick([
      ['final'],
      ['draft', 'internal'],
      ['client-facing'],
      ['archived'],
      ['pending-review'],
    ]),
  } satisfies AppDocument
})

export function getDocumentById(id: string) {
  return MOCK_DOCUMENTS.find((d) => d.id === id)
}
