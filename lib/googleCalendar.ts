import fetch from 'node-fetch'
import { readFile, writeFile } from 'fs/promises'
import path from 'path'

const TOKEN_FILE = path.resolve(process.cwd(), 'data', 'google_tokens.json')

type Tokens = {
  access_token: string
  expires_in?: number
  refresh_token?: string
  scope?: string
  token_type?: string
  id_token?: string
}

export async function exchangeCodeForTokens(code: string): Promise<Tokens> {
  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET
  const redirectUri = process.env.GOOGLE_REDIRECT_URI
  if (!clientId || !clientSecret || !redirectUri) throw new Error('Missing Google OAuth env vars')

  const params = new URLSearchParams()
  params.append('code', code)
  params.append('client_id', clientId)
  params.append('client_secret', clientSecret)
  params.append('redirect_uri', redirectUri)
  params.append('grant_type', 'authorization_code')

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  })

  if (!res.ok) throw new Error(`Token exchange failed: ${res.status}`)
  const data = (await res.json()) as Tokens

  await writeFile(TOKEN_FILE, JSON.stringify(data, null, 2), 'utf8')
  return data
}

export async function refreshAccessToken(refreshToken?: string): Promise<Tokens> {
  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET
  if (!clientId || !clientSecret) throw new Error('Missing Google OAuth env vars')

  const token = refreshToken || (await loadTokens()).refresh_token
  if (!token) throw new Error('No refresh token available')

  const params = new URLSearchParams()
  params.append('client_id', clientId)
  params.append('client_secret', clientSecret)
  params.append('refresh_token', token)
  params.append('grant_type', 'refresh_token')

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  })
  if (!res.ok) throw new Error(`Refresh failed: ${res.status}`)
  const data = (await res.json()) as Tokens
  const existing = await loadTokens()
  const merged = { ...existing, ...data }
  await writeFile(TOKEN_FILE, JSON.stringify(merged, null, 2), 'utf8')
  return merged
}

export async function loadTokens(): Promise<Tokens> {
  try {
    const raw = await readFile(TOKEN_FILE, 'utf8')
    return JSON.parse(raw)
  } catch (_) {
    return {} as Tokens
  }
}

export async function listEvents() {
  const tokens = await loadTokens()
  if (!tokens.access_token) throw new Error('No access token')
  const res = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  })
  if (!res.ok) throw new Error(`List events failed: ${res.status}`)
  return res.json()
}

export async function createEvent(event: any) {
  const tokens = await loadTokens()
  if (!tokens.access_token) throw new Error('No access token')
  const res = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokens.access_token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(event),
  })
  if (!res.ok) throw new Error(`Create event failed: ${res.status}`)
  return res.json()
}
