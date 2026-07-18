import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'

import { PageHeader } from '@/components/shared/page-header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { Button } from '@/components/ui/button'
import { NOTIFICATION_CATEGORY_META } from '@/lib/constants'

type Channel = 'inApp' | 'email' | 'sms'

const CHANNELS: { key: Channel; label: string }[] = [
  { key: 'inApp', label: 'In-app' },
  { key: 'email', label: 'Email' },
  { key: 'sms', label: 'SMS' },
]

function buildDefaults() {
  const settings: Record<string, Record<Channel, boolean>> = {}
  for (const key of Object.keys(NOTIFICATION_CATEGORY_META)) {
    settings[key] = { inApp: true, email: key !== 'system', sms: false }
  }
  return settings
}

export function NotificationSettingsPage() {
  const navigate = useNavigate()
  const [settings, setSettings] = useState(buildDefaults)

  const toggle = (category: string, channel: Channel) => {
    setSettings((prev) => ({
      ...prev,
      [category]: { ...prev[category], [channel]: !prev[category][channel] },
    }))
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Notification Settings"
        description="Choose how you want to be notified for each type of event."
        actions={
          <Button variant="outline" onClick={() => navigate('/notifications')}>
            Back to Notifications
          </Button>
        }
      />

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Preferences</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1">
          <div className="grid grid-cols-[1fr_repeat(3,80px)] items-center gap-2 pb-2 text-xs font-medium text-muted-foreground">
            <span>Event type</span>
            {CHANNELS.map((c) => (
              <span key={c.key} className="text-center">{c.label}</span>
            ))}
          </div>
          <Separator />
          {Object.entries(NOTIFICATION_CATEGORY_META).map(([key, meta]) => (
            <div key={key} className="grid grid-cols-[1fr_repeat(3,80px)] items-center gap-2 py-3">
              <span className="text-sm text-foreground">{meta.label}</span>
              {CHANNELS.map((c) => (
                <div key={c.key} className="flex justify-center">
                  <Switch checked={settings[key][c.key]} onCheckedChange={() => toggle(key, c.key)} />
                </div>
              ))}
            </div>
          ))}
        </CardContent>
      </Card>

      <Button onClick={() => toast.success('Notification preferences saved.')}>Save Preferences</Button>
    </div>
  )
}
