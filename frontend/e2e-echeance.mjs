import { chromium } from 'playwright'
import path from 'node:path'

const SCRATCH = 'C:\\Users\\Ibtissem\\AppData\\Local\\Temp\\claude\\c--Users-Ibtissem-Desktop-stageAK-gestion-ak\\417bbf6c-7caf-4b04-9fef-e3dff6fd65c9\\scratchpad'
const BASE = 'http://localhost:5173'
const FACTURE_ID = 'd39d746c-c0d7-4709-8ca1-1aea64725143' // FA-2026-001, existing facture on AS-26-0001

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } })
page.on('pageerror', (err) => console.log('PAGE ERROR:', err.message))
page.on('response', async (res) => {
  if (res.status() >= 400) {
    let body = ''
    try { body = await res.text() } catch {}
    console.log(`HTTP ${res.status()} ${res.request().method()} ${res.url()} -> ${body.slice(0, 300)}`)
  }
})

try {
  await page.goto(`${BASE}/login`)
  await page.getByPlaceholder('you@ak-consulting.com').fill('aff-e2e-admin@example.com')
  await page.getByPlaceholder('••••••••').fill('TestPass123!')
  await page.getByRole('button', { name: /se connecter/i }).click()
  await page.waitForURL('**/dashboard', { timeout: 15000 })
  console.log('OK: login admin')

  await page.goto(`${BASE}/factures/${FACTURE_ID}`)
  await page.waitForLoadState('networkidle')
  await page.getByText('Total TTC').waitFor({ timeout: 10000 })
  console.log('OK: facture detail loaded, current label ->', await page.getByText('Conditions de paiement').locator('..').innerText())

  await page.getByRole('button', { name: /modifier/i }).click()
  await page.getByText('Modalité de paiement').waitFor({ timeout: 10000 })
  await page.screenshot({ path: path.join(SCRATCH, '20-edit-dialog-net-default.png'), fullPage: true })

  // Ordre DOM fixe dans le dialogue : Statut(0), Mode de règlement(1),
  // Modalité de paiement(2), Nombre de jours / Jour du mois suivant(3).
  const combo = (i) => page.locator('button[role="combobox"]').nth(i)

  // ---- fin de mois, 45 jours ----
  await combo(2).click()
  await page.getByRole('option', { name: 'X jours fin de mois' }).click()
  await combo(3).click()
  await page.getByRole('option', { name: '45 jours' }).click()
  await page.waitForTimeout(200)
  console.log('fin_mois échéance affichée:', await page.getByText("Date d'échéance (aperçu)").locator('..').innerText())
  await page.screenshot({ path: path.join(SCRATCH, '21-edit-dialog-finmois-45.png'), fullPage: true })

  // ---- jour fixe, le 10 du mois suivant ----
  await combo(2).click()
  await page.getByRole('option', { name: 'Jour fixe du mois suivant' }).click()
  await combo(3).click()
  await page.getByRole('option', { name: 'Le 10 du mois suivant' }).click()
  await page.waitForTimeout(200)
  console.log('jour_fixe échéance affichée:', await page.getByText("Date d'échéance (aperçu)").locator('..').innerText())
  await page.screenshot({ path: path.join(SCRATCH, '22-edit-dialog-jourfixe-10.png'), fullPage: true })

  // ---- net personnalisé 120 jours ----
  await combo(2).click()
  await page.getByRole('option', { name: 'Paiement net (nombre de jours)' }).click()
  await combo(3).click()
  await page.getByRole('option', { name: 'Personnalisé…' }).click()
  await page.locator('label:text-is("Jours personnalisés")').waitFor({ timeout: 5000 })
  await page.locator('input[type=number]').nth(1).fill('120')
  await page.waitForTimeout(200)
  console.log('net personnalisé échéance affichée:', await page.getByText("Date d'échéance (aperçu)").locator('..').innerText())
  await page.screenshot({ path: path.join(SCRATCH, '23-edit-dialog-net-custom-120.png'), fullPage: true })

  const [patchResponse] = await Promise.all([
    page.waitForResponse((r) => r.url().includes('/api/factures/') && r.request().method() === 'PATCH', { timeout: 15000 }),
    page.getByRole('button', { name: /enregistrer/i }).click(),
  ])
  console.log('PATCH status:', patchResponse.status())
  await page.waitForLoadState('networkidle')
  await page.getByText('Total TTC').waitFor({ timeout: 10000 })
  await page.screenshot({ path: path.join(SCRATCH, '24-facture-detail-after-edit.png'), fullPage: true })

  // ---- Download PDF/XLSX to confirm labelEcheance renders correctly ----
  const [pdfDownload] = await Promise.all([
    page.waitForEvent('download', { timeout: 15000 }),
    page.getByRole('button', { name: /télécharger le pdf/i }).click(),
  ])
  console.log('OK: PDF downloaded:', pdfDownload.suggestedFilename())

  console.log('ALL DONE')
} catch (err) {
  console.log('SCRIPT ERROR:', err.message)
  await page.screenshot({ path: path.join(SCRATCH, 'error-echeance.png'), fullPage: true }).catch(() => {})
} finally {
  await browser.close()
}
