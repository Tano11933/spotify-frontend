import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Link, MemoryRouter, Outlet, Route, Routes, useLocation } from 'react-router'
import { beforeEach, expect, it, vi } from 'vitest'

vi.mock('@/lib/api', () => ({ authApi: {}, configureAuthBridge: vi.fn(), streamUrl: (id: number) => `http://localhost/api/stream/songs/${id}` }))

import { PageRoute } from '@/components/PageRoute'
import { ErrorState } from '@/components/StateMessage'
import { NowPlayingBar } from '@/components/layout/NowPlayingBar'
import { usePlayerStore } from '@/store/playerStore'
import { makeSong } from '@/test/player'

const Home = () => <h1>Beranda fixture</h1>
const homeLoader = async () => ({ default: Home })

beforeEach(() => {
  usePlayerStore.setState(usePlayerStore.getInitialState(), true)
  vi.spyOn(HTMLMediaElement.prototype, 'load').mockImplementation(() => {})
  vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => {})
  vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue(undefined)
})

function mount(load: Parameters<typeof PageRoute>[0]['load'], initial = '/page') {
  return render(
    <MemoryRouter initialEntries={[initial]}>
      <Routes>
        <Route path="/" element={<PageRoute load={homeLoader} />} />
        <Route path="/page" element={<PageRoute load={load} />} />
      </Routes>
    </MemoryRouter>,
  )
}

it('announces a pending page and replaces it after the module resolves', async () => {
  let resolve!: (module: { default: typeof Home }) => void
  const load = vi.fn(() => new Promise<{ default: typeof Home }>((done) => { resolve = done }))
  mount(load)
  expect(screen.getByRole('status')).toHaveTextContent('Memuat halaman')
  await act(async () => resolve({ default: Home }))
  expect(screen.getByRole('heading', { name: 'Beranda fixture' })).toBeInTheDocument()
  expect(screen.queryByRole('status')).not.toBeInTheDocument()
})

it('retries a rejected module with a fresh lazy identity using the keyboard', async () => {
  vi.spyOn(console, 'error').mockImplementation(() => {})
  const load = vi.fn().mockRejectedValueOnce(new TypeError('Failed to fetch dynamically imported module')).mockResolvedValue({ default: Home })
  mount(load)
  await screen.findByRole('alert')
  const retry = screen.getByRole('button', { name: 'Coba lagi' })
  expect(retry).toHaveFocus()
  expect(screen.getByRole('button', { name: 'Muat ulang aplikasi' })).toBeEnabled()
  await userEvent.setup().keyboard('{Enter}')
  await screen.findByRole('heading', { name: 'Beranda fixture' })
  expect(load).toHaveBeenCalledTimes(2)
})

it('catches a page render failure and can navigate home without reloading', async () => {
  vi.spyOn(console, 'error').mockImplementation(() => {})
  const Broken = () => { throw new Error('internal diagnostic that must not appear in the UI') }
  mount(async () => ({ default: Broken }))
  expect(await screen.findByRole('alert')).not.toHaveTextContent('internal diagnostic')
  await userEvent.setup().click(screen.getByRole('link', { name: 'Ke beranda' }))
  await screen.findByRole('heading', { name: 'Beranda fixture' })
  expect(screen.queryByRole('alert')).not.toBeInTheDocument()
})

it('retries rendering after the cause has been removed', async () => {
  vi.spyOn(console, 'error').mockImplementation(() => {})
  let broken = true
  const Page = () => { if (broken) throw new Error('broken'); return <h1>Recovered page</h1> }
  mount(async () => ({ default: Page }))
  await screen.findByRole('alert')
  broken = false
  await userEvent.setup().click(screen.getByRole('button', { name: 'Coba lagi' }))
  await screen.findByRole('heading', { name: 'Recovered page' })
})

it('resets a failed boundary when navigating to a different query on the same route', async () => {
  vi.spyOn(console, 'error').mockImplementation(() => {})
  function Page() { if (useLocation().search === '?bad') throw new Error('bad query'); return <h1>Good query</h1> }
  const load = async () => ({ default: Page })
  render(<MemoryRouter initialEntries={['/page?bad']}><Link to="/page?good">Change query</Link><Routes><Route path="/page" element={<PageRoute load={load} />} /></Routes></MemoryRouter>)
  await screen.findByRole('alert')
  await userEvent.setup().click(screen.getByRole('link', { name: 'Change query' }))
  await screen.findByRole('heading', { name: 'Good query' })
})

it('leaves handled request errors with their page retry action', async () => {
  const retry = vi.fn()
  const Page = () => <><h1>Catalog fixture</h1><ErrorState message="Request fixture failed" onRetry={retry} /></>
  mount(async () => ({ default: Page }))
  await screen.findByRole('heading', { name: 'Catalog fixture' })
  expect(screen.queryByText('Halaman tidak dapat dibuka')).not.toBeInTheDocument()
  await userEvent.setup().click(screen.getByRole('button', { name: 'Coba lagi' }))
  expect(retry).toHaveBeenCalledOnce()
})

it('keeps the same audio element and position through loading, failure and recovery', async () => {
  vi.spyOn(console, 'error').mockImplementation(() => {})
  let reject!: (cause: Error) => void
  const load = vi.fn().mockImplementationOnce(() => new Promise((_resolve, fail) => { reject = fail })).mockResolvedValue({ default: () => <h1>Next page</h1> })
  function Shell() { return <><Link to="/page">Next</Link><Outlet /><NowPlayingBar /></> }
  usePlayerStore.getState().play(makeSong())
  const { container } = render(<MemoryRouter><Routes><Route element={<Shell />}><Route index element={<PageRoute load={homeLoader} />} /><Route path="/page" element={<PageRoute load={load} />} /></Route></Routes></MemoryRouter>)
  await screen.findByRole('heading', { name: 'Beranda fixture' })
  const audio = container.querySelector('audio')!
  Object.defineProperties(audio, { readyState: { value: 1 }, duration: { value: 120 } })
  fireEvent.loadedMetadata(audio)
  audio.currentTime = 12
  await waitFor(() => expect(screen.getByRole('button', { name: 'Jeda' })).toBeEnabled())
  const plays = vi.mocked(HTMLMediaElement.prototype.play).mock.calls.length
  const pauses = vi.mocked(HTMLMediaElement.prototype.pause).mock.calls.length
  await userEvent.setup().click(screen.getByRole('link', { name: 'Next' }))
  expect(screen.getAllByText('Memuat halaman…')).toHaveLength(2)
  expect(container.querySelector('audio')).toBe(audio)
  await act(async () => reject(new Error('chunk unavailable')))
  await screen.findByRole('alert')
  expect(container.querySelector('audio')).toBe(audio)
  await userEvent.setup().click(screen.getByRole('button', { name: 'Coba lagi' }))
  await screen.findByRole('heading', { name: 'Next page' })
  expect(container.querySelector('audio')).toBe(audio)
  expect(audio.currentTime).toBe(12)
  expect(HTMLMediaElement.prototype.play).toHaveBeenCalledTimes(plays)
  expect(HTMLMediaElement.prototype.pause).toHaveBeenCalledTimes(pauses)
})
