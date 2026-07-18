import type { Quotation, QuotationLine, QuotationStatus } from '@/types'
import { pick, randomInt, resetSeed } from '@/mocks/generators'
import { MOCK_CLIENTS } from '@/mocks/data/clients'
import { MOCK_USERS } from '@/mocks/data/users'

resetSeed(404)

const STATUS_POOL: QuotationStatus[] = ['draft', 'sent', 'under_review', 'accepted', 'rejected', 'expired']

const TITLES = [
  'Structural Assessment & Reinforcement Study',
  'Site Feasibility & Geotechnical Survey',
  'Electrical Distribution Upgrade Design',
  'HVAC System Retrofit Engineering',
  'Bridge Inspection & Load Rating',
  'Water Treatment Plant Expansion Design',
  'Renewable Energy Integration Study',
  'Industrial Facility Safety Audit',
  'Road Infrastructure Rehabilitation Plan',
  'Seismic Retrofit Engineering Study',
]

const LINE_ITEMS: { description: string; category: string; unit: string; unitPrice: [number, number] }[] = [
  { description: 'Site survey & data collection', category: 'Field Work', unit: 'day', unitPrice: [800, 1400] },
  { description: 'Structural analysis & modeling', category: 'Engineering', unit: 'hour', unitPrice: [90, 160] },
  { description: 'Geotechnical testing', category: 'Field Work', unit: 'test', unitPrice: [350, 600] },
  { description: 'Design drafting & CAD deliverables', category: 'Engineering', unit: 'hour', unitPrice: [60, 110] },
  { description: 'Regulatory compliance review', category: 'Compliance', unit: 'flat', unitPrice: [1200, 2800] },
  { description: 'Project management & coordination', category: 'Management', unit: 'week', unitPrice: [1800, 3200] },
  { description: 'Final report & documentation', category: 'Deliverables', unit: 'flat', unitPrice: [900, 1600] },
]

const owners = MOCK_USERS.filter((u) => u.role === 'engineer' || u.role === 'manager')

function buildLines(seedIndex: number): QuotationLine[] {
  const count = randomInt(3, 6)
  return Array.from({ length: count }).map((_, i) => {
    const item = pick(LINE_ITEMS)
    return {
      id: `ql-${seedIndex}-${i + 1}`,
      description: item.description,
      category: item.category,
      quantity: randomInt(1, 12),
      unit: item.unit,
      unitPrice: randomInt(item.unitPrice[0], item.unitPrice[1]),
      discountPct: pick([0, 0, 0, 5, 10]),
      taxPct: 20,
    }
  })
}

export const MOCK_QUOTATIONS: Quotation[] = Array.from({ length: 26 }).map((_, index) => {
  const client = MOCK_CLIENTS[index % MOCK_CLIENTS.length]
  const owner = owners[index % owners.length]
  const created = new Date()
  created.setDate(created.getDate() - randomInt(2, 200))
  const validUntil = new Date(created)
  validUntil.setDate(validUntil.getDate() + 45)
  const lines = buildLines(index + 1)
  const total = lines.reduce((sum, l) => {
    const base = l.quantity * l.unitPrice
    const discounted = base * (1 - l.discountPct / 100)
    return sum + discounted * (1 + l.taxPct / 100)
  }, 0)

  const versionCount = randomInt(1, 3)
  const versions = Array.from({ length: versionCount }).map((_, vIndex) => {
    const vDate = new Date(created)
    vDate.setDate(vDate.getDate() + vIndex * 4)
    return {
      id: `qv-${index + 1}-${vIndex + 1}`,
      version: vIndex + 1,
      createdAt: vDate.toISOString(),
      createdBy: `${owner.firstName} ${owner.lastName}`,
      changeSummary:
        vIndex === 0 ? 'Initial version created' : 'Adjusted pricing and scope after client feedback',
      total: Math.round(total * (0.9 + vIndex * 0.05)),
    }
  })

  return {
    id: `quo-${index + 1}`,
    reference: `QUO-${String(2000 + index)}`,
    clientId: client.id,
    clientName: client.name,
    title: TITLES[index % TITLES.length],
    status: pick(STATUS_POOL),
    owner: `${owner.firstName} ${owner.lastName}`,
    createdAt: created.toISOString(),
    validUntil: validUntil.toISOString(),
    currency: 'EUR',
    lines,
    versions,
    currentVersion: versionCount,
    notes: 'Pricing excludes third-party permitting fees unless stated otherwise.',
  } satisfies Quotation
})

export function getQuotationById(id: string) {
  return MOCK_QUOTATIONS.find((q) => q.id === id)
}

export function computeQuotationTotal(lines: QuotationLine[]) {
  const subtotal = lines.reduce((sum, l) => sum + l.quantity * l.unitPrice, 0)
  const discountTotal = lines.reduce(
    (sum, l) => sum + l.quantity * l.unitPrice * (l.discountPct / 100),
    0,
  )
  const taxableBase = subtotal - discountTotal
  const taxTotal = lines.reduce((sum, l) => {
    const base = l.quantity * l.unitPrice * (1 - l.discountPct / 100)
    return sum + base * (l.taxPct / 100)
  }, 0)
  const total = taxableBase + taxTotal
  return { subtotal, discountTotal, taxTotal, total }
}
