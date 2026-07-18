import { useEffect } from 'react'
import { useFieldArray, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { Plus, Trash2 } from 'lucide-react'

import { PageHeader } from '@/components/shared/page-header'
import { DetailSkeleton } from '@/components/shared/loading-state'
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
import { useAsync } from '@/hooks/use-async'
import { quotationsService } from '@/services/quotations-service'
import { formatCurrency } from '@/lib/formatters'
import { MOCK_CLIENTS } from '@/mocks/data/clients'
import { MOCK_USERS } from '@/mocks/data/users'

const lineSchema = z.object({
  description: z.string().min(1, 'Required'),
  category: z.string().min(1, 'Required'),
  quantity: z.number().min(0.01, 'Must be > 0'),
  unit: z.string().min(1, 'Required'),
  unitPrice: z.number().min(0, 'Must be ≥ 0'),
  discountPct: z.number().min(0).max(100),
  taxPct: z.number().min(0).max(100),
})

const schema = z.object({
  clientId: z.string().min(1, 'Select a client'),
  title: z.string().min(3, 'Title is required'),
  owner: z.string().min(1, 'Select an owner'),
  validUntil: z.string().min(1, 'Select a validity date'),
  currency: z.string().min(1),
  notes: z.string().optional(),
  lines: z.array(lineSchema).min(1, 'Add at least one line item'),
})

type FormValues = z.infer<typeof schema>

const owners = MOCK_USERS.filter((u) => u.role === 'engineer' || u.role === 'manager')

function defaultLine() {
  return { description: '', category: 'Engineering', quantity: 1, unit: 'hour', unitPrice: 100, discountPct: 0, taxPct: 20 }
}

export function QuotationFormPage() {
  const { quotationId } = useParams<{ quotationId: string }>()
  const isEdit = !!quotationId
  const navigate = useNavigate()

  const { data: existing, isLoading } = useAsync(
    () => (isEdit ? quotationsService.getById(quotationId!) : Promise.resolve(null)),
    [quotationId],
  )

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      clientId: MOCK_CLIENTS[0]?.id ?? '',
      title: '',
      owner: owners[0]?.id ?? '',
      validUntil: new Date(Date.now() + 45 * 86400000).toISOString().slice(0, 10),
      currency: 'EUR',
      notes: '',
      lines: [defaultLine()],
    },
  })

  const { fields, append, remove } = useFieldArray({ control: form.control, name: 'lines' })
  const watchedLines = form.watch('lines')

  useEffect(() => {
    if (existing) {
      form.reset({
        clientId: existing.clientId,
        title: existing.title,
        owner: MOCK_USERS.find((u) => `${u.firstName} ${u.lastName}` === existing.owner)?.id ?? owners[0]?.id ?? '',
        validUntil: existing.validUntil.slice(0, 10),
        currency: existing.currency,
        notes: existing.notes ?? '',
        lines: existing.lines.map((l) => ({
          description: l.description,
          category: l.category,
          quantity: l.quantity,
          unit: l.unit,
          unitPrice: l.unitPrice,
          discountPct: l.discountPct,
          taxPct: l.taxPct,
        })),
      })
    }
  }, [existing, form])

  const totals = (watchedLines ?? []).reduce(
    (acc, l) => {
      const qty = Number(l.quantity) || 0
      const price = Number(l.unitPrice) || 0
      const disc = Number(l.discountPct) || 0
      const tax = Number(l.taxPct) || 0
      const base = qty * price
      const discounted = base * (1 - disc / 100)
      const lineTax = discounted * (tax / 100)
      return {
        subtotal: acc.subtotal + base,
        discount: acc.discount + (base - discounted),
        tax: acc.tax + lineTax,
        total: acc.total + discounted + lineTax,
      }
    },
    { subtotal: 0, discount: 0, tax: 0, total: 0 },
  )

  const onSubmit = async (values: FormValues) => {
    const client = MOCK_CLIENTS.find((c) => c.id === values.clientId)
    const owner = MOCK_USERS.find((u) => u.id === values.owner)
    const linesWithIds = values.lines.map((l, i) => ({ ...l, id: `ql-new-${i}` }))

    try {
      if (isEdit && existing) {
        await quotationsService.update(existing.id, {
          title: values.title,
          clientId: values.clientId,
          clientName: client?.name ?? existing.clientName,
          owner: owner ? `${owner.firstName} ${owner.lastName}` : existing.owner,
          validUntil: new Date(values.validUntil).toISOString(),
          currency: values.currency,
          notes: values.notes,
          lines: linesWithIds,
        })
        toast.success('Quotation updated successfully.')
        navigate(`/quotations/${existing.id}`)
      } else {
        const created = await quotationsService.create({
          clientId: values.clientId,
          clientName: client?.name ?? '',
          title: values.title,
          owner: owner ? `${owner.firstName} ${owner.lastName}` : '',
          validUntil: new Date(values.validUntil).toISOString(),
          currency: values.currency,
          notes: values.notes,
          lines: linesWithIds,
        })
        toast.success('Quotation created successfully.')
        navigate(`/quotations/${created.id}`)
      }
    } catch {
      toast.error('Something went wrong while saving the quotation.')
    }
  }

  if (isEdit && isLoading) return <DetailSkeleton />

  return (
    <div className="space-y-6">
      <PageHeader
        title={isEdit ? 'Edit Quotation' : 'New Quotation'}
        description="Build the quotation and see totals calculate automatically."
      />

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Quotation Details</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem className="sm:col-span-2 lg:col-span-2">
                    <FormLabel>Title</FormLabel>
                    <FormControl>
                      <Input placeholder="Structural Assessment Study" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

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
                name="owner"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Owner</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {owners.map((u) => (
                          <SelectItem key={u.id} value={u.id}>
                            {u.firstName} {u.lastName}
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
                name="validUntil"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Valid Until</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="currency"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Currency</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="EUR">EUR</SelectItem>
                        <SelectItem value="USD">USD</SelectItem>
                        <SelectItem value="GBP">GBP</SelectItem>
                      </SelectContent>
                    </Select>
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
                      <Textarea rows={2} placeholder="Terms, exclusions, assumptions…" {...field} />
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
              <div className="hidden gap-2 px-1 text-xs font-medium text-muted-foreground lg:grid lg:grid-cols-[2fr_1fr_0.7fr_0.7fr_0.9fr_0.7fr_0.7fr_auto]">
                <span>Description</span>
                <span>Category</span>
                <span>Qty</span>
                <span>Unit</span>
                <span>Unit Price</span>
                <span>Discount %</span>
                <span>Tax %</span>
                <span />
              </div>

              {fields.map((field, index) => {
                const line = watchedLines?.[index]
                const qty = Number(line?.quantity) || 0
                const price = Number(line?.unitPrice) || 0
                const disc = Number(line?.discountPct) || 0
                const tax = Number(line?.taxPct) || 0
                const base = qty * price
                const discounted = base * (1 - disc / 100)
                const lineTotal = discounted * (1 + tax / 100)

                return (
                  <div
                    key={field.id}
                    className="grid grid-cols-2 gap-2 rounded-lg border border-border p-3 lg:grid-cols-[2fr_1fr_0.7fr_0.7fr_0.9fr_0.7fr_0.7fr_auto] lg:items-center lg:border-0 lg:p-1"
                  >
                    <Input
                      className="col-span-2 lg:col-span-1"
                      placeholder="Description"
                      {...form.register(`lines.${index}.description`)}
                    />
                    <Input placeholder="Category" {...form.register(`lines.${index}.category`)} />
                    <Input type="number" step="0.5" min="0" {...form.register(`lines.${index}.quantity`, { valueAsNumber: true })} />
                    <Input placeholder="Unit" {...form.register(`lines.${index}.unit`)} />
                    <Input type="number" step="1" min="0" {...form.register(`lines.${index}.unitPrice`, { valueAsNumber: true })} />
                    <Input type="number" step="1" min="0" max="100" {...form.register(`lines.${index}.discountPct`, { valueAsNumber: true })} />
                    <Input type="number" step="1" min="0" max="100" {...form.register(`lines.${index}.taxPct`, { valueAsNumber: true })} />
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
              {form.formState.errors.lines?.message ? (
                <p className="text-xs font-medium text-destructive">{form.formState.errors.lines.message}</p>
              ) : null}

              <div className="ml-auto max-w-xs space-y-1.5 border-t border-border pt-3 text-sm">
                <div className="flex justify-between text-muted-foreground">
                  <span>Subtotal</span>
                  <span className="tabular-nums">{formatCurrency(totals.subtotal, form.getValues('currency'))}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Discount</span>
                  <span className="tabular-nums">-{formatCurrency(totals.discount, form.getValues('currency'))}</span>
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
              {form.formState.isSubmitting ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Quotation'}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  )
}
