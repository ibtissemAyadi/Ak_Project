// Small deterministic helpers used to build realistic-looking mock datasets
// without pulling in a faker dependency.

let seed = 42

export function seededRandom() {
  seed = (seed * 9301 + 49297) % 233280
  return seed / 233280
}

export function pick<T>(items: readonly T[]): T {
  return items[Math.floor(seededRandom() * items.length)]
}

export function pickMany<T>(items: readonly T[], count: number): T[] {
  const shuffled = [...items].sort(() => seededRandom() - 0.5)
  return shuffled.slice(0, count)
}

export function randomInt(min: number, max: number) {
  return Math.floor(seededRandom() * (max - min + 1)) + min
}

export function randomFloat(min: number, max: number, decimals = 2) {
  const value = seededRandom() * (max - min) + min
  return Number(value.toFixed(decimals))
}

export function daysFromNow(days: number) {
  const date = new Date()
  date.setDate(date.getDate() + days)
  return date.toISOString()
}

export function resetSeed(value = 42) {
  seed = value
}

export const FIRST_NAMES = [
  'Sarah', 'Marc', 'Léa', 'Thomas', 'Nadia', 'Karim', 'Julie', 'Antoine',
  'Camille', 'Yassine', 'Elena', 'David', 'Sophie', 'Hugo', 'Amel', 'Nicolas',
  'Farah', 'Louis', 'Ines', 'Maxime', 'Salma', 'Pierre', 'Chloé', 'Omar',
]

export const LAST_NAMES = [
  'Lambert', 'Bernard', 'Haddad', 'Petit', 'Moreau', 'Ben Salah', 'Girard',
  'Fontaine', 'Rousseau', 'Trabelsi', 'Dubois', 'Lefevre', 'Chevalier',
  'Mansour', 'Garnier', 'Roche', 'Ayadi', 'Simon', 'Klein', 'Renard',
]

export function randomFullName() {
  return `${pick(FIRST_NAMES)} ${pick(LAST_NAMES)}`
}

export const COMPANY_POOL = [
  'Meridian Infrastructure', 'NovaGrid Energy', 'Atlas Construction Group',
  'Helios Renewable Power', 'Cedar Bridge Works', 'Northwind Rail Systems',
  'Vertex Petrochemicals', 'BlueHarbor Ports', 'Summit Water Authority',
  'Alterra Mining Corp', 'Pinnacle Aerospace', 'Delta Urban Development',
  'Solaris Utilities', 'Ironclad Steel Works', 'Terraform Civil Engineering',
  'Zenith Data Centers', 'Coastal Wind Partners', 'Apex Logistics Hub',
  'Granite Peak Mining', 'Riverside Municipal Works',
]

export const INDUSTRIES = [
  'Energy & Utilities', 'Construction', 'Transportation', 'Oil & Gas',
  'Mining', 'Government & Public Works', 'Renewable Energy', 'Water Treatment',
  'Aerospace', 'Manufacturing',
]

export const CITIES: { city: string; country: string }[] = [
  { city: 'Paris', country: 'France' },
  { city: 'Tunis', country: 'Tunisia' },
  { city: 'Lyon', country: 'France' },
  { city: 'Casablanca', country: 'Morocco' },
  { city: 'Brussels', country: 'Belgium' },
  { city: 'Geneva', country: 'Switzerland' },
  { city: 'Milan', country: 'Italy' },
  { city: 'Dubai', country: 'UAE' },
  { city: 'Madrid', country: 'Spain' },
  { city: 'Frankfurt', country: 'Germany' },
]
