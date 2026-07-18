import type { Project, ProjectEvent, ProjectAttachment, TimeEntry, ProjectStatus, ProjectPriority } from '@/types'
import { pick, randomInt, resetSeed } from '@/mocks/generators'
import { MOCK_CLIENTS } from '@/mocks/data/clients'
import { MOCK_USERS } from '@/mocks/data/users'

resetSeed(505)

const STATUS_POOL: ProjectStatus[] = ['planning', 'in_progress', 'in_progress', 'on_hold', 'completed', 'cancelled']
const PRIORITY_POOL: ProjectPriority[] = ['low', 'medium', 'medium', 'high', 'critical']

const PROJECT_NAMES = [
  'North Terminal Expansion', 'Substation Modernization', 'Coastal Pipeline Inspection',
  'Highway 12 Rehabilitation', 'Solar Farm Phase II', 'Water Treatment Upgrade',
  'Metro Line Extension Study', 'Warehouse Seismic Retrofit', 'Wind Farm Interconnection',
  'District Cooling Plant', 'Port Crane Foundation Works', 'Data Center Cooling Redesign',
  'Bridge Deck Replacement', 'Industrial Park Utilities',
]

const engineers = MOCK_USERS.filter((u) => u.role === 'engineer')
const managers = MOCK_USERS.filter((u) => u.role === 'manager')

export const MOCK_PROJECTS: Project[] = PROJECT_NAMES.map((name, index) => {
  const client = MOCK_CLIENTS[(index * 2) % MOCK_CLIENTS.length]
  const manager = managers[index % managers.length]
  const status = STATUS_POOL[index % STATUS_POOL.length]
  const start = new Date()
  start.setDate(start.getDate() - randomInt(30, 220))
  const end = new Date(start)
  end.setDate(end.getDate() + randomInt(90, 300))
  const budget = randomInt(60, 900) * 1000
  const progress = status === 'completed' ? 100 : status === 'planning' ? randomInt(0, 15) : randomInt(20, 90)

  const memberCount = randomInt(3, 6)
  const members = Array.from({ length: memberCount }).map((_, i) => {
    const eng = engineers[(index + i) % engineers.length]
    return {
      id: `pm-${index + 1}-${i + 1}`,
      userId: eng.id,
      name: `${eng.firstName} ${eng.lastName}`,
      role: eng.jobTitle,
      allocationPct: pick([25, 50, 75, 100]),
    }
  })

  const taskCount = randomInt(4, 7)
  const tasks = Array.from({ length: taskCount }).map((_, i) => ({
    id: `pt-${index + 1}-${i + 1}`,
    title: [
      'Kickoff & scope validation',
      'Site data collection',
      'Preliminary design review',
      'Client design approval',
      'Detailed engineering',
      'Permitting submission',
      'Final documentation handover',
    ][i % 7],
    done: i < Math.round((progress / 100) * taskCount),
  }))

  return {
    id: `prj-${index + 1}`,
    reference: `PRJ-${String(3000 + index)}`,
    name,
    clientId: client.id,
    clientName: client.name,
    status,
    priority: pick(PRIORITY_POOL),
    progressPct: progress,
    managerName: `${manager.firstName} ${manager.lastName}`,
    startDate: start.toISOString(),
    endDate: end.toISOString(),
    budget,
    spent: Math.round(budget * (progress / 100) * (0.85 + Math.random() * 0.3)),
    description: `Engineering services engagement for ${client.name} covering design, compliance review and delivery oversight.`,
    members,
    tasks,
  } satisfies Project
})

export function getProjectById(id: string) {
  return MOCK_PROJECTS.find((p) => p.id === id)
}

const EVENT_TEMPLATES: { type: ProjectEvent['type']; title: string; description: string }[] = [
  { type: 'milestone', title: 'Milestone reached', description: 'Preliminary design phase completed and approved.' },
  { type: 'status_change', title: 'Status updated', description: 'Project status changed following client review.' },
  { type: 'comment', title: 'Team comment', description: 'Coordination note added regarding site access constraints.' },
  { type: 'document', title: 'Document uploaded', description: 'Updated technical drawings uploaded to the project.' },
  { type: 'task', title: 'Task completed', description: 'Geotechnical survey task marked as complete.' },
]

export const MOCK_PROJECT_EVENTS: ProjectEvent[] = MOCK_PROJECTS.flatMap((project, pIndex) => {
  const count = randomInt(4, 8)
  return Array.from({ length: count }).map((_, i) => {
    const tpl = pick(EVENT_TEMPLATES)
    const author = pick(MOCK_USERS)
    const created = new Date()
    created.setDate(created.getDate() - randomInt(0, 180))
    return {
      id: `pev-${pIndex + 1}-${i + 1}`,
      projectId: project.id,
      type: tpl.type,
      title: tpl.title,
      description: tpl.description,
      authorName: `${author.firstName} ${author.lastName}`,
      createdAt: created.toISOString(),
    } satisfies ProjectEvent
  })
}).sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))

export function getEventsByProject(projectId: string) {
  return MOCK_PROJECT_EVENTS.filter((e) => e.projectId === projectId).sort((a, b) =>
    a.createdAt < b.createdAt ? 1 : -1,
  )
}

const FILE_TYPES = ['pdf', 'dwg', 'xlsx', 'docx', 'png']

export const MOCK_PROJECT_ATTACHMENTS: ProjectAttachment[] = MOCK_PROJECTS.flatMap((project, pIndex) => {
  const count = randomInt(2, 5)
  return Array.from({ length: count }).map((_, i) => {
    const uploader = pick(MOCK_USERS)
    const uploaded = new Date()
    uploaded.setDate(uploaded.getDate() - randomInt(0, 150))
    return {
      id: `patt-${pIndex + 1}-${i + 1}`,
      projectId: project.id,
      name: `${project.reference}-${['site-plan', 'load-report', 'budget-breakdown', 'photos', 'spec-sheet'][i % 5]}.${FILE_TYPES[i % FILE_TYPES.length]}`,
      fileType: FILE_TYPES[i % FILE_TYPES.length],
      sizeKb: randomInt(120, 8400),
      uploadedBy: `${uploader.firstName} ${uploader.lastName}`,
      uploadedAt: uploaded.toISOString(),
    } satisfies ProjectAttachment
  })
})

export function getAttachmentsByProject(projectId: string) {
  return MOCK_PROJECT_ATTACHMENTS.filter((a) => a.projectId === projectId)
}

export const MOCK_TIME_ENTRIES: TimeEntry[] = MOCK_PROJECTS.flatMap((project, pIndex) => {
  const count = randomInt(6, 14)
  return Array.from({ length: count }).map((_, i) => {
    const member = pick(project.members)
    const date = new Date()
    date.setDate(date.getDate() - randomInt(0, 60))
    return {
      id: `te-${pIndex + 1}-${i + 1}`,
      projectId: project.id,
      memberName: member.name,
      taskName: pick(project.tasks).title,
      date: date.toISOString(),
      hours: randomInt(1, 8),
      billable: pick([true, true, true, false]),
    } satisfies TimeEntry
  })
})

export function getTimeEntriesByProject(projectId: string) {
  return MOCK_TIME_ENTRIES.filter((t) => t.projectId === projectId).sort((a, b) =>
    a.date < b.date ? 1 : -1,
  )
}
