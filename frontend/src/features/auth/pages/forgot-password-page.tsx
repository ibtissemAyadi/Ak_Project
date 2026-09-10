import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link } from 'react-router-dom'
import { ArrowLeft, CheckCircle2, Send } from 'lucide-react'

import { AuthLayout } from '@/features/auth/components/auth-layout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'

const schema = z.object({
  email: z.string().min(1, "L'email est requis").email('Saisissez une adresse email valide'),
})

type FormValues = z.infer<typeof schema>

export function ForgotPasswordPage() {
  const [sent, setSent] = useState(false)
  const [submittedEmail, setSubmittedEmail] = useState('')

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: '' },
  })

  const onSubmit = async (values: FormValues) => {
    await new Promise((resolve) => setTimeout(resolve, 800))
    setSubmittedEmail(values.email)
    setSent(true)
  }

  return (
    <AuthLayout title="Réinitialisez votre mot de passe" subtitle="Nous vous enverrons un lien pour réinitialiser votre mot de passe.">
      {sent ? (
        <div className="space-y-5">
          <div className="flex items-start gap-3 rounded-lg border border-success/30 bg-success/10 p-4">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-success" />
            <div className="space-y-1">
              <p className="text-sm font-medium text-foreground">Vérifiez votre boîte de réception</p>
              <p className="text-sm text-muted-foreground">
                Si un compte existe pour <span className="font-medium text-foreground">{submittedEmail}</span>, un
                lien de réinitialisation a été envoyé.
              </p>
            </div>
          </div>
          <Button variant="outline" className="w-full gap-2" asChild>
            <Link to="/login">
              <ArrowLeft className="h-4 w-4" />
              Retour à la connexion
            </Link>
          </Button>
        </div>
      ) : (
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email professionnel</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="you@ak-consulting.com" autoComplete="email" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" className="w-full gap-2" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? 'Envoi…' : (
                <>
                  <Send className="h-4 w-4" />
                  Envoyer le lien
                </>
              )}
            </Button>

            <Button variant="ghost" className="w-full gap-2" asChild>
              <Link to="/login">
                <ArrowLeft className="h-4 w-4" />
                Retour à la connexion
              </Link>
            </Button>
          </form>
        </Form>
      )}
    </AuthLayout>
  )
}
