import { randomUUID } from 'node:crypto'
import { expect, test as base, type Page, type APIRequestContext } from '@playwright/test'

export const api = process.env.E2E_API_URL + '/api'
export const password = 'BrowserTest123!'
export const admin = { name: 'Admin E2E', email: 'admin@e2e.test', password }

type Credentials = typeof admin
type Song = { id: number, title: string, duration: number }
type Album = { id: number, title: string, artist_id: number, songs: Song[] }

export const test = base.extend<{ account: Credentials, album: Album }>({
  account: async ({ request }, provide) => {
    const id = randomUUID()
    const account = { name: `Listener ${id.slice(0, 8)}`, email: `${id}@e2e.test`, password }
    const response = await request.post(api + '/auth/register', { data: account })
    expect(response.status()).toBe(201)
    await provide(account)
  },
  album: async ({ request }, provide) => {
    const response = await request.get(api + '/albums')
    expect(response.ok()).toBeTruthy()
    const list: { items: Album[] } = await response.json()
    const match = list.items.find((album) => album.title === 'Album E2E')
    expect(match).toBeDefined()
    const detail = await request.get(api + '/albums/' + match!.id)
    expect(detail.ok()).toBeTruthy()
    await provide(await detail.json())
  },
})

export async function fillLogin(page: Page, account: Credentials) {
  if (new URL(page.url(), 'http://127.0.0.1').pathname !== '/login') await page.goto('/login')
  await page.getByLabel('Email', { exact: true }).fill(account.email)
  await page.getByLabel('Password', { exact: true }).fill(account.password)
}

export async function login(page: Page, account: Credentials): Promise<string> {
  await fillLogin(page, account)
  const response = page.waitForResponse((response) => response.url() === api + '/auth/login' && response.request().method() === 'POST')
  await page.getByRole('button', { name: 'Masuk', exact: true }).click()
  const result = await response
  expect(result.status()).toBe(200)
  await expect(page.getByRole('button', { name: account.name })).toBeVisible()
  const body: { tokens: { access_token: string } } = await result.json()
  return body.tokens.access_token
}

export async function fixtureWav(request: APIRequestContext, id: number) {
  const response = await request.get(api + '/stream/songs/' + id)
  expect(response.ok()).toBeTruthy()
  return { name: 'replacement.wav', mimeType: 'audio/wav', buffer: await response.body() }
}
