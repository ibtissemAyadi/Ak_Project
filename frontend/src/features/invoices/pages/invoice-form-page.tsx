import { useFieldArray, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { Plus, Trash2 } from 'lucide-react'

import { PageHeader } from '@/components/shared/page-header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { invoicesService } from '@/services/invoices-service'
import { formatCurrency } from '@/lib/formatters'
import { MOCK_CLIENTS } from '@/mocks/data/clients'
import { MOCK_PROJECTS } from '@/mocks/data/projects'

const lineSchema = z.object({
  description: z.string().min(1, 'Required'),
  quantity: z.number().min(0.01),
  unitPrice: z.number().min(0),
  taxPct: z.number().min(0).max(100),
})

const schema = z.object({
  clientId: z.string().min(1, 'Select a client'),
  projectId: z.string().optional(),
  issueDate: z.string().min(1),
  dueDate: z.string().min(1),
  currency: z.string().min(1),
  notes: z.string().optional(),
  lines: z.array(lineSchema).min(1, 'Add at least one line item'),
})

type FormValues = z.infer<typeof schema>

function defaultLine() {
  return { description: '', quantity: 1, unitPrice: 1000, taxPct: 20 }
}

export function InvoiceFormPage() {
  const navigate = useNavigate()

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      clientId: MOCK_CLIENTS[0]?.id ?? '',
      projectId: undefined,
      issueDate: new Date().toISOString().slice(0, 10),
      dueDate: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
      currency: 'EUR',
      notes: '',
      lines: [defaultLine()],
    },
  })

  const { fields, append, remove } = useFieldArray({ control: form.control, name: 'lines' })
  const watchedLines = form.watch('lines')
  const watchedClientId = form.watch('clientId')

  const clientProjects = MOCK_PROJECTS.filter((p) => p.clientId === watchedClientId)

  const totals = (watchedLines ?? []).reduce(
    (acc, l) => {
      const qty = Number(l.quantity) || 0
      const price = Number(l.unitPrice) || 0
      const tax = Number(l.taxPct) || 0
      const base = qty * price
      return { subtotal: acc.subtotal + base, tax: acc.tax + base * (tax / 100), total: acc.total + base * (1 + tax / 100) }
    },
    { subtotal: 0, tax: 0, total: 0 },
  )

  const onSubmit = async (values: FormValues) => {
    const client = MOCK_CLIENTS.find((c) => c.id === values.clientId)
    const project = MOCK_PROJECTS.find((p) => p.id === values.projectId)
    try {
      const created = await invoicesService.create({
        clientId: values.clientId,
        clientName: client?.name ?? '',
        projectId: project?.id,
        projectName: project?.name,
        status: 'draft',
        issueDate: new Date(values.issueDate).toISOString(),
        dueDate: new Date(values.dueDate).toISOString(),
        currency: values.currency,
        lines: values.lines.map((l, i) => ({ ...l, id: `il-new-${i}` })),
        notes: values.notes,
      })
      toast.success('Invoice created successfully.')
      navigate(`/invoices/${created.id}`)
    } catch {
      toast.error('Something went wrong while creating the invoice.')
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader title="New Invoice" description="Create an invoice and send it to your client." />

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Invoice Details</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <FormField
                control={form.control}
                name="clientId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Client</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {MOCK_CLIENTS.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="projectId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Related Project (optional)</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="None" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {clientProjects.map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="issueDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Issue Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="dueDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Due Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem className="sm:col-span-2 lg:col-span-4">
                    <FormLabel>Notes</FormLabel>
                    <FormControl>
                      <Textarea rows={2} placeholder="Payment terms, bank details…" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle>Line Items</CardTitle>
              <Button type="button" size="sm" variant="outline" className="gap-1.5" onClick={() => append(defaultLine())}>
                <Plus className="h-3.5 w-3.5" />
                Add Line
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {fields.map((field, index) => {
                const line = watchedLines?.[index]
                const qty = Number(line?.quantity) || 0
                const price = Number(line?.unitPrice) || 0
                const tax = Number(line?.taxPct) || 0
                const lineTotal = qty * price * (1 + tax / 100)

                return (
                  <div
                    key={field.id}
                    className="grid grid-cols-2 gap-2 rounded-lg border border-border p-3 lg:grid-cols-[2fr_0.7fr_0.9fr_0.7fr_auto] lg:items-center"
                  >
                    <Input
                      className="col-span-2 lg:col-span-1"
                      placeholder="Description"
                      {...form.register(`lines.${index}.description`)}
                    />
                    <Input type="number" step="1" min="0" placeholder="Qty" {...form.register(`lines.${index}.quantity`, { valueAsNumber: true })} />
                    <Input type="number" step="1" min="0" placeholder="Unit Price" {...form.register(`lines.${index}.unitPrice`, { valueAsNumber: true })} />
                    <Input type="number" step="1" min="0" max="100" placeholder="Tax %" {...form.register(`lines.${index}.taxPct`, { valueAsNumber: true })} />
                    <div className="flex items-center justify-between gap-2 lg:justify-end">
                      <span className="text-xs font-medium tabular-nums text-foreground lg:hidden">
                        {formatCurrency(lineTotal, form.getValues('currency'))}
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        onClick={() => fields.length > 1 && remove(index)}
                        disabled={fields.length === 1}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )
              })}

              <div className="ml-auto max-w-xs space-y-1.5 border-t border-border pt-3 text-sm">
                <div className="flex justify-between text-muted-foreground">
                  <span>Subtotal</span>
                  <span className="tabular-nums">{formatCurrency(totals.subtotal, form.getValues('currency'))}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Tax</span>
                  <span className="tabular-nums">{formatCurrency(totals.tax, form.getValues('currency'))}</span>
                </div>
                <div className="flex justify-between border-t border-border pt-1.5 text-base font-semibold text-foreground">
                  <span>Total</span>
                  <span className="tabular-nums">{formatCurrency(totals.total, form.getValues('currency'))}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => navigate(-1)}>
              Cancel
            </Button>
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? 'Saving…' : 'Create Invoice'}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  )
}
