import { Link, useParams } from 'react-router-dom'
import {
  CalendarRange,
  CheckCircle2,
  Circle,
  Download,
  FileArchive,
  Users2,
  Wallet,
} from 'lucide-react'

import { PageHeader } from '@/components/shared/page-header'
import { StatusBadge } from '@/components/shared/status-badge'
import { UserAvatar } from '@/components/shared/user-avatar'
import { Timeline } from '@/components/shared/timeline'
import { EmptyState } from '@/components/shared/empty-state'
import { ErrorState } from '@/components/shared/error-state'
import { DetailSkeleton, TableSkeleton } from '@/components/shared/loading-state'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useAsync } from '@/hooks/use-async'
import { projectsService } from '@/services/projects-service'
import { PROJECT_PRIORITY_META, PROJECT_STATUS_META } from '@/lib/constants'
import { formatCurrency, formatDate } from '@/lib/formatters'

export function ProjectDetailPage() {
  const { projectId } = useParams<{ projectId: string }>()

  const { data: project, isLoading, error, refetch } = useAsync(() => projectsService.getById(projectId!), [projectId])
  const { data: events, isLoading: eventsLoading } = useAsync(() => projectsService.getEvents(projectId!), [projectId])
  const { data: attachments, isLoading: attachmentsLoading } = useAsync(
    () => projectsService.getAttachments(projectId!),
    [projectId],
  )
  const { data: timeEntries, isLoading: timeLoading } = useAsync(
    () => projectsService.getTimeEntries(projectId!),
    [projectId],
  )

  if (isLoading) return <DetailSkeleton />
  if (error || !project) return <ErrorState onRetry={refetch} description="We could not load this project." />

  const totalHours = timeEntries?.reduce((sum, t) => sum + t.hours, 0) ?? 0

  return (
    <div className="space-y-6">
      <PageHeader
        title={project.name}
        description={`${project.reference} · ${project.clientName}`}
        actions={
          <>
            <StatusBadge status={project.priority} meta={PROJECT_PRIORITY_META} />
            <StatusBadge status={project.status} meta={PROJECT_STATUS_META} />
          </>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="space-y-2 p-5">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5"><CalendarRange className="h-3.5 w-3.5" /> Progress</span>
              <span className="font-medium text-foreground">{project.progressPct}%</span>
            </div>
            <Progress value={project.progressPct} />
            <p className="text-xs text-muted-foreground">
              {formatDate(project.startDate)} — {formatDate(project.endDate)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="space-y-1 p-5">
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground"><Wallet className="h-3.5 w-3.5" /> Budget</p>
            <p className="text-lg font-semibold text-foreground">{formatCurrency(project.spent)} <span className="text-sm font-normal text-muted-foreground">/ {formatCurrency(project.budget)}</span></p>
            <Progress value={Math.min(100, (project.spent / project.budget) * 100)} className="h-1.5" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="space-y-1 p-5">
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground"><Users2 className="h-3.5 w-3.5" /> Team</p>
            <p className="text-lg font-semibold text-foreground">{project.members.length} members</p>
            <p className="text-xs text-muted-foreground">Managed by {project.managerName}</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="team">Team</TabsTrigger>
          <TabsTrigger value="time">Time Tracking</TabsTrigger>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
          <TabsTrigger value="attachments">Attachments</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Description</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">{project.description}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Tasks</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {project.tasks.map((task) => (
                <div key={task.id} className="flex items-center gap-2 text-sm">
                  {task.done ? (
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-success" />
                  ) : (
                    <Circle className="h-4 w-4 shrink-0 text-muted-foreground" />
                  )}
                  <span className={task.done ? 'text-muted-foreground line-through' : 'text-foreground'}>{task.title}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="team">
          <Card>
            <CardHeader>
              <CardTitle>Team Members</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {project.members.map((m) => (
                <div key={m.id} className="flex items-center gap-3 rounded-lg border border-border p-3">
                  <UserAvatar name={m.name} className="h-10 w-10" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">{m.name}</p>
                    <p className="truncate text-xs text-muted-foreground">{m.role}</p>
                  </div>
                  <Badge variant="secondary">{m.allocationPct}%</Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="time">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle>Time Tracking</CardTitle>
              <Badge variant="info">{totalHours}h logged</Badge>
            </CardHeader>
            <CardContent>
              {timeLoading ? (
                <TableSkeleton rows={5} columns={5} />
              ) : !timeEntries || timeEntries.length === 0 ? (
                <EmptyState title="No time logged yet" />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Member</TableHead>
                      <TableHead>Task</TableHead>
                      <TableHead className="text-right">Hours</TableHead>
                      <TableHead>Billable</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {timeEntries.map((entry) => (
                      <TableRow key={entry.id}>
                        <TableCell className="text-muted-foreground">{formatDate(entry.date)}</TableCell>
                        <TableCell className="font-medium text-foreground">{entry.memberName}</TableCell>
                        <TableCell className="text-muted-foreground">{entry.taskName}</TableCell>
                        <TableCell className="text-right tabular-nums">{entry.hours}h</TableCell>
                        <TableCell>
                          <Badge variant={entry.billable ? 'success' : 'muted'}>{entry.billable ? 'Billable' : 'Internal'}</Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="timeline">
          <Card>
            <CardHeader>
              <CardTitle>Event Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              {eventsLoading ? (
                <DetailSkeleton />
              ) : !events || events.length === 0 ? (
                <EmptyState title="No events yet" />
              ) : (
                <Timeline
                  entries={events.map((e) => ({
                    id: e.id,
                    title: e.title,
                    description: `${e.description} — ${e.authorName}`,
                    timestamp: e.createdAt,
                  }))}
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="attachments">
          <Card>
            <CardHeader>
              <CardTitle>Attachments</CardTitle>
            </CardHeader>
            <CardContent>
              {attachmentsLoading ? (
                <TableSkeleton rows={4} columns={4} />
              ) : !attachments || attachments.length === 0 ? (
                <EmptyState title="No attachments" icon={FileArchive} />
              ) : (
                <div className="divide-y divide-border">
                  {attachments.map((a) => (
                    <div key={a.id} className="flex items-center justify-between gap-3 py-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-muted text-xs font-semibold uppercase text-muted-foreground">
                          {a.fileType}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-foreground">{a.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {(a.sizeKb / 1024).toFixed(1)} MB · Uploaded by {a.uploadedBy} · {formatDate(a.uploadedAt)}
                          </p>
                        </div>
                      </div>
                      <Button variant="ghost" size="icon" className="shrink-0">
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <p className="text-xs text-muted-foreground">
        Client:{' '}
        <Link to={`/crm/clients/${project.clientId}`} className="font-medium text-primary hover:underline">
          {project.clientName}
        </Link>
      </p>
    </div>
  )
}
