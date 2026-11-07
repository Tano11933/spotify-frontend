import { expect } from '@playwright/test'
import { api, fillLogin, fixtureWav, login, test } from './fixtures'

test('preserves the protected destination, rejects invalid login and denies admin access', async ({ page, request, account, album }) => {
  await page.goto('/admin')
  await expect(page).toHaveURL(/\/login$/)
  await fillLogin(page, { ...account, password: 'WrongPassword123!' })
  const invalid = page.waitForResponse((response) => response.url() === api + '/auth/login')
  await page.getByRole('button', { name: 'Masuk', exact: true }).click()
  expect((await invalid).status()).toBe(401)
  await expect(page.getByRole('alert')).toBeVisible()

  const access = await login(page, account)
  await expect(page).toHaveURL(/\/admin$/)
  await expect(page.getByText('Halaman ini hanya dapat diakses admin.')).toBeVisible()
  const song = album.songs[0]!
  const denied = await request.post(api + '/admin/songs/' + song.id + '/audio', {
    headers: { Authorization: 'Bearer ' + access },
    multipart: { file: await fixtureWav(request, song.id) },
  })
  expect(denied.status()).toBe(403)

  await page.getByRole('button', { name: account.name }).click()
  const logout = page.waitForResponse((response) => response.url() === api + '/auth/logout')
  await page.getByRole('menuitem', { name: 'Keluar', exact: true }).click()
  expect((await logout).ok()).toBeTruthy()
  await expect(page).toHaveURL(/\/$/)
  await page.goto('/playlists')
  await expect(page).toHaveURL(/\/login$/)
})

test('refreshes expired access and returns to login when refresh is revoked', async ({ page, request, account }) => {
  const access = await login(page, account)
  const headers = { Authorization: 'Bearer ' + access }
  expect((await request.get(api + '/auth/me', { headers })).ok()).toBeTruthy()
  await expect.poll(async () => (await request.get(api + '/auth/me', { headers })).status(), { timeout: 30_000 }).toBe(401)

  await page.getByRole('button', { name: account.name }).click()
  const expired = page.waitForResponse((response) => response.url() === api + '/auth/sessions' && response.status() === 401)
  const refresh = page.waitForResponse((response) => response.url() === api + '/auth/refresh')
  await page.getByRole('menuitem', { name: 'Sesi login' }).click()
  await expired
  const result = await refresh
  expect(result.status()).toBe(200)
  await expect(page.getByText('Keluar dari sesi ini', { exact: true })).toBeVisible()

  const { access_token } = await result.json()
  const revoke = await request.delete(api + '/auth/sessions', {
    headers: { Authorization: 'Bearer ' + access_token },
  })
  expect(revoke.ok()).toBeTruthy()
  const rejected = page.waitForResponse((response) => response.url() === api + '/auth/refresh')
  await page.reload()
  expect((await rejected).status()).toBe(401)
  await expect(page).toHaveURL(/\/login$/)
})

test('resets the password through the isolated mailbox', async ({ page, request, account }) => {
  await page.goto('/forgot-password')
  await page.getByLabel('Email', { exact: true }).fill(account.email)
  await page.getByRole('button', { name: 'Kirim tautan reset' }).click()
  await expect(page.getByText('Tautan terkirim', { exact: true })).toBeVisible()
  const mailbox = api.replace(/\/api$/, '') + '/__e2e/mail'
  let text = ''
  await expect.poll(async () => {
    const mail = await request.get(mailbox, { params: { to: account.email } })
    if (mail.ok()) text = await mail.text()
    return mail.status()
  }).toBe(200)
  const link = text.match(/https?:\/\/\S+/)?.[0]
  expect(link).toBeDefined()
  expect(new URL(link!).origin).toBe(new URL(page.url()).origin)
  await page.goto(link!)
  const newPassword = 'ResetBrowser123!'
  await page.getByLabel('Password baru', { exact: true }).fill(newPassword)
  await page.getByLabel('Konfirmasi password baru', { exact: true }).fill(newPassword)
  await page.getByRole('button', { name: 'Simpan password baru' }).click()
  await expect(page).toHaveURL(/\/login$/)
  const old = await request.post(api + '/auth/login', { data: { email: account.email, password: account.password } })
  expect(old.status()).toBe(401)
  await login(page, { ...account, password: newPassword })
})
