import { Link } from 'react-router-dom'

import { Card, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { StatusBadge } from '@/components/shared/status-badge'
import { UserAvatar } from '@/components/shared/user-avatar'
import { PROJECT_PRIORITY_META, PROJECT_STATUS_META } from '@/lib/constants'
import { formatCurrency, formatDate } from '@/lib/formatters'
import type { Project } from '@/types'

export function ProjectCard({ project }: { project: Project }) {
  return (
    <Link to={`/projects/${project.id}`}>
      <Card className="h-full transition-shadow hover:shadow-md">
        <CardContent className="space-y-3 p-5">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-foreground">{project.name}</p>
              <p className="truncate text-xs text-muted-foreground">{project.clientName}</p>
            </div>
            <StatusBadge status={project.priority} meta={PROJECT_PRIORITY_META} />
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Progress</span>
              <span className="font-medium text-foreground">{project.progressPct}%</span>
            </div>
            <Progress value={project.progressPct} className="h-1.5" />
          </div>

          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{formatCurrency(project.spent)} / {formatCurrency(project.budget)}</span>
            <span>Due {formatDate(project.endDate)}</span>
          </div>

          <div className="flex items-center justify-between pt-1">
            <div className="flex -space-x-2">
              {project.members.slice(0, 4).map((m) => (
                <UserAvatar key={m.id} name={m.name} className="h-7 w-7 border-2 border-card" />
              ))}
              {project.members.length > 4 ? (
                <div className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-card bg-muted text-[10px] font-medium text-muted-foreground">
                  +{project.members.length - 4}
                </div>
              ) : null}
            </div>
            <StatusBadge status={project.status} meta={PROJECT_STATUS_META} />
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
