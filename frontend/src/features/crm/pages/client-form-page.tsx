import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'

import { PageHeader } from '@/components/shared/page-header'
import { DetailSkeleton } from '@/components/shared/loading-state'
import { Card, CardContent } from '@/components/ui/card'
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
import { clientsService } from '@/services/clients-service'
import { CLIENT_STATUS_META } from '@/lib/constants'
import { INDUSTRIES } from '@/mocks/generators'
import { MOCK_USERS } from '@/mocks/data/users'

const schema = z.object({
  name: z.string().min(2, 'Company name is required'),
  type: z.enum(['company', 'individual', 'government']),
  status: z.enum(['active', 'prospect', 'inactive']),
  industry: z.string().min(1, 'Select an industry'),
  email: z.string().email('Enter a valid email'),
  phone: z.string().min(4, 'Phone number is required'),
  website: z.string().optional(),
  address: z.string().min(2, 'Address is required'),
  city: z.string().min(1, 'City is required'),
  country: z.string().min(1, 'Country is required'),
  taxId: z.string().optional(),
  accountManagerId: z.string().min(1, 'Select an account manager'),
  notes: z.string().optional(),
})

type FormValues = z.infer<typeof schema>

const accountManagers = MOCK_USERS.filter((u) => u.role === 'sales' || u.role === 'manager')

export function ClientFormPage() {
  const { clientId } = useParams<{ clientId: string }>()
  const isEdit = !!clientId
  const navigate = useNavigate()

  const { data: existing, isLoading } = useAsync(
    () => (isEdit ? clientsService.getById(clientId!) : Promise.resolve(null)),
    [clientId],
  )

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: '',
      type: 'company',
      status: 'prospect',
      industry: '',
      email: '',
      phone: '',
      website: '',
      address: '',
      city: '',
      country: '',
      taxId: '',
      accountManagerId: accountManagers[0]?.id ?? '',
      notes: '',
    },
  })

  useEffect(() => {
    if (existing) {
      form.reset({
        name: existing.name,
        type: existing.type,
        status: existing.status,
        industry: existing.industry,
        email: existing.email,
        phone: existing.phone,
        website: existing.website ?? '',
        address: existing.address,
        city: existing.city,
        country: existing.country,
        taxId: existing.taxId ?? '',
        accountManagerId: existing.accountManagerId,
        notes: existing.notes ?? '',
      })
    }
  }, [existing, form])

  const onSubmit = async (values: FormValues) => {
    const manager = MOCK_USERS.find((u) => u.id === values.accountManagerId)
    try {
      if (isEdit && existing) {
        await clientsService.update(existing.id, {
          ...values,
          accountManagerName: manager ? `${manager.firstName} ${manager.lastName}` : existing.accountManagerName,
        })
        toast.success('Client updated successfully.')
        navigate(`/crm/clients/${existing.id}`)
      } else {
        const created = await clientsService.create({
          ...values,
          accountManagerName: manager ? `${manager.firstName} ${manager.lastName}` : '',
          tags: [],
        })
        toast.success('Client created successfully.')
        navigate(`/crm/clients/${created.id}`)
      }
    } catch {
      toast.error('Something went wrong while saving the client.')
    }
  }

  if (isEdit && isLoading) return <DetailSkeleton />

  return (
    <div className="space-y-6">
      <PageHeader title={isEdit ? 'Edit Client' : 'New Client'} description="Fill in the client's company and contact details." />

      <Card className="max-w-3xl">
        <CardContent className="pt-5">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem className="sm:col-span-2">
                      <FormLabel>Company Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Meridian Infrastructure" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Client Type</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="company">Company</SelectItem>
                          <SelectItem value="individual">Individual</SelectItem>
                          <SelectItem value="government">Government</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {Object.entries(CLIENT_STATUS_META).map(([value, meta]) => (
                            <SelectItem key={value} value={value}>
                              {meta.label}
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
                  name="industry"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Industry</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select industry" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {INDUSTRIES.map((i) => (
                            <SelectItem key={i} value={i}>
                              {i}
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
                  name="accountManagerId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Account Manager</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {accountManagers.map((u) => (
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
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="contact@company.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone</FormLabel>
                      <FormControl>
                        <Input placeholder="+33 1 40 00 00 00" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="website"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Website</FormLabel>
                      <FormControl>
                        <Input placeholder="https://www.company.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="taxId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tax ID</FormLabel>
                      <FormControl>
                        <Input placeholder="FR12345678901" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem className="sm:col-span-2">
                      <FormLabel>Address</FormLabel>
                      <FormControl>
                        <Input placeholder="12 Avenue de l'Industrie" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="city"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>City</FormLabel>
                      <FormControl>
                        <Input placeholder="Paris" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="country"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Country</FormLabel>
                      <FormControl>
                        <Input placeholder="France" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem className="sm:col-span-2">
                      <FormLabel>Notes</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Internal notes about this client…" rows={3} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="flex justify-end gap-2 border-t border-border pt-4">
                <Button type="button" variant="outline" onClick={() => navigate(-1)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={form.formState.isSubmitting}>
                  {form.formState.isSubmitting ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Client'}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  )
}
