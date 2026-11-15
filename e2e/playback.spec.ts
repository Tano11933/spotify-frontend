import { expect, type Locator } from '@playwright/test'
import { admin, api, fixtureWav, login, test } from './fixtures'

async function expectPlaying(audio: Locator, songID: number) {
  await expect.poll(() => audio.evaluate((element: HTMLAudioElement) => ({
    path: new URL(element.currentSrc || element.src, location.origin).pathname,
    playing: !element.paused && element.currentTime > 0,
  }))).toEqual({ path: '/api/stream/songs/' + songID, playing: true })
}

test('saves a song, plays a playlist, consumes the account queue and restores position', async ({ page, account, album }) => {
  test.setTimeout(90_000)
  const first = album.songs.find((song) => song.title === 'Nada E2E 1')!
  const second = album.songs.find((song) => song.title === 'Nada E2E 2')!
  const player = page.getByRole('contentinfo', { name: 'Pemutar musik' })
  const audio = player.locator('audio')
  const main = page.getByRole('main')

  await login(page, account)
  await page.goto('/albums/' + album.id)
  const firstRow = main.getByRole('button', { name: first.title, exact: true }).locator('..')
  await firstRow.hover()
  const liked = page.waitForResponse((response) =>
    response.url() === api + '/me/tracks/' + first.id && response.request().method() === 'PUT',
  )
  await firstRow.getByRole('button', { name: 'Simpan ke Lagu Disukai' }).click()
  expect((await liked).ok()).toBeTruthy()
  await expect(firstRow.getByRole('button', { name: 'Hapus dari Lagu Disukai' })).toBeVisible()
  await page.getByRole('link', { name: 'Lagu Disukai', exact: true }).click()
  await expect(main.getByRole('button', { name: new RegExp('^' + first.title) })).toBeVisible()

  await page.getByRole('link', { name: 'Playlist', exact: true }).click()
  await page.getByLabel('Nama playlist').fill('Playlist E2E')
  await page.getByRole('button', { name: 'Buat playlist', exact: true }).click()
  const playlist = page.getByRole('region', { name: 'Detail playlist' })
  await expect(playlist.getByRole('heading', { name: 'Playlist E2E' })).toBeVisible()
  await playlist.getByRole('combobox', { name: 'Tambah lagu' }).selectOption(String(first.id))
  await playlist.getByRole('button', { name: 'Tambah lagu', exact: true }).click()
  await playlist.getByRole('button', { name: new RegExp('^' + first.title) }).click()
  await expectPlaying(audio, first.id)

  await page.getByRole('link', { name: 'Album', exact: true }).click()
  await main.getByRole('link', { name: new RegExp('^' + album.title) }).click()
  await expectPlaying(audio, first.id)
  const enqueue = main.getByRole('button', { name: `Tambahkan ${second.title} ke antrean` })
  await enqueue.focus()
  await enqueue.press('Enter')
  await expect(page.getByText('Ditambahkan ke antrean', { exact: true })).toBeVisible()
  await player.getByRole('link', { name: 'Antrean' }).click()
  await expect(main.getByRole('button', { name: new RegExp('^' + second.title) })).toBeVisible()

  const confirmation = page.waitForResponse((response) =>
    response.url().startsWith(api + '/me/player/queue/reservations/') && response.url().endsWith('/confirm'),
  )
  await player.getByRole('button', { name: 'Lagu berikutnya' }).click()
  await expectPlaying(audio, second.id)
  expect((await confirmation).ok()).toBeTruthy()
  await expect(main.getByText(/^Antrean kosong/)).toBeVisible()

  const seek = player.getByRole('slider', { name: 'Posisi pemutaran' })
  await seek.fill('12')
  await expect.poll(() => audio.evaluate((element: HTMLAudioElement) => element.currentTime)).toBeGreaterThanOrEqual(12)
  const saved = page.waitForResponse((response) =>
    response.url() === api + '/me/player' &&
    response.request().method() === 'PUT' &&
    response.request().postDataJSON().position_seconds >= 12 &&
    response.ok(),
  )
  await player.getByRole('button', { name: 'Jeda', exact: true }).click()
  expect((await (await saved).json()).position_seconds).toBeGreaterThanOrEqual(12)
  await page.reload()
  await expect.poll(() => audio.evaluate((element: HTMLAudioElement, songID) => ({
    restored: element.currentTime >= 12 && element.currentTime < 30,
    paused: element.paused,
    source: element.src.endsWith('/songs/' + songID),
  }), second.id)).toEqual({ restored: true, paused: true, source: true })
})

test('reorders duplicate queue entries and plays the new first entry next', async ({ page, request, account, album }) => {
  const first = album.songs.find((song) => song.title === 'Nada E2E 1')!
  const second = album.songs.find((song) => song.title === 'Nada E2E 2')!
  const token = await login(page, account)
  const headers = { Authorization: 'Bearer ' + token }
  for (const song of [first, first, second]) {
    const response = await request.post(api + '/me/player/queue', { headers, data: { song_id: song.id } })
    expect(response.ok()).toBeTruthy()
  }

  const main = page.getByRole('main')
  const player = page.getByRole('contentinfo', { name: 'Pemutar musik' })
  const audio = player.locator('audio')
  await page.goto('/albums/' + album.id)
  await main.getByRole('button', { name: first.title, exact: true }).click()
  await expectPlaying(audio, first.id)
  await player.getByRole('link', { name: 'Antrean' }).click()

  const up = (position: number) => main.getByRole('button', { name: `Naik ${second.title}, posisi ${position}` })
  const down = (position: number) => main.getByRole('button', { name: `Turun ${second.title}, posisi ${position}` })
  await expect(down(3)).toBeDisabled()
  await up(3).focus()
  await page.keyboard.press('Enter')
  await expect(up(2)).toBeEnabled()
  await expect(up(2)).toBeFocused()
  await down(2).click()
  await expect(up(3)).toBeEnabled()
  await up(3).click()
  await expect(up(2)).toBeEnabled()
  await up(2).click()
  await expect(up(1)).toBeDisabled()

  await page.setViewportSize({ width: 390, height: 844 })
  await page.reload()
  await expect(up(1)).toBeDisabled()
  await expect(down(1)).toBeEnabled()
  const dimensions = await down(1).boundingBox()
  expect(dimensions?.height).toBeGreaterThanOrEqual(44)
  expect(dimensions?.width).toBeGreaterThanOrEqual(44)
  const fits = await main.evaluate((element) => element.scrollWidth <= element.clientWidth)
  expect(fits).toBe(true)
  await expect(main.getByRole('button', { name: `Hapus ${first.title} dari antrean` })).toHaveCount(2)

  await page.setViewportSize({ width: 1280, height: 800 })
  await player.getByRole('button', { name: 'Lagu berikutnya' }).click()
  await expectPlaying(audio, second.id)
  await expect(main.getByRole('button', { name: `Hapus ${second.title} dari antrean` })).toHaveCount(0)
})

test('admin uploads a WAV and plays the uploaded bytes from the real stream', async ({ page, request, album }) => {
  const access = await login(page, admin)
  const title = 'Unggah E2E'
  const created = await request.post(api + '/songs', {
    headers: { Authorization: 'Bearer ' + access },
    data: { title, duration: 30, artist_id: album.artist_id },
  })
  expect(created.status()).toBe(201)
  const { id } = await created.json()
  const wav = await fixtureWav(request, album.songs.find((song) => song.duration === 30)!.id)
  await page.getByRole('link', { name: 'Admin', exact: true }).click()
  await page.getByRole('button', { name: 'Lagu', exact: true }).click()
  await page.getByRole('button', { name: 'Edit lagu ' + title }).click()
  const upload = page.getByRole('region', { name: 'Audio untuk ' + title })
  await upload.getByLabel('File audio').setInputFiles(wav)
  await upload.getByRole('button', { name: 'Unggah audio' }).click()
  await upload.getByRole('button', { name: 'Putar hasil unggah' }).click()
  const audio = page.getByRole('contentinfo', { name: 'Pemutar musik' }).locator('audio')
  await expectPlaying(audio, id)
  await expect.poll(() => audio.evaluate((element: HTMLAudioElement) => element.duration)).toBe(30)
  const range = await request.get(api + '/stream/songs/' + id, { headers: { Range: 'bytes=0-255' } })
  expect(range.status()).toBe(206)
  expect(await range.body()).toEqual(wav.buffer.subarray(0, 256))
})
