import type { Project } from '@/types'
import { withLatency } from '@/lib/api-client'
import {
  MOCK_PROJECTS,
  getEventsByProject,
  getAttachmentsByProject,
  getTimeEntriesByProject,
} from '@/mocks/data/projects'

let projects: Project[] = [...MOCK_PROJECTS]

export const projectsService = {
  list: () => withLatency(() => [...projects]),

  getById: (id: string) =>
    withLatency(() => {
      const project = projects.find((p) => p.id === id)
      if (!project) throw new Error('Project not found.')
      return project
    }),

  update: (id: string, payload: Partial<Project>) =>
    withLatency(
      () => {
        const index = projects.findIndex((p) => p.id === id)
        if (index === -1) throw new Error('Project not found.')
        projects[index] = { ...projects[index], ...payload }
        return projects[index]
      },
      { failRate: 0.05 },
    ),

  getEvents: (projectId: string) => withLatency(() => getEventsByProject(projectId)),
  getAttachments: (projectId: string) => withLatency(() => getAttachmentsByProject(projectId)),
  getTimeEntries: (projectId: string) => withLatency(() => getTimeEntriesByProject(projectId)),
}
