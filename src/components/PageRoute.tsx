import { Component, Suspense, lazy, useState, type ComponentType, type ReactNode } from 'react'
import { Link, useLocation } from 'react-router'

import { LoadingState } from '@/components/StateMessage'
import { Button } from '@/components/ui/Button'

type PageLoader = () => Promise<{ default: ComponentType }>

interface PageBoundaryProps {
  children: ReactNode
  onRetry: () => void
}

class PageBoundary extends Component<PageBoundaryProps, { failed: boolean }> {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  render() {
    if (!this.state.failed) return this.props.children

    return (
      <section role="alert" aria-labelledby="page-failure-title" className="mx-auto w-full max-w-3xl space-y-4 px-6 py-12 text-spotify-white">
        <h1 id="page-failure-title" className="text-2xl font-bold">Halaman tidak dapat dibuka</h1>
        <p className="max-w-xl text-sm leading-relaxed text-spotify-light-gray">
          Coba buka halaman ini lagi. Jika masih gagal, muat ulang aplikasi atau kembali ke beranda.
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <Button autoFocus onClick={this.props.onRetry}>Coba lagi</Button>
          <Button variant="secondary" onClick={() => window.location.reload()}>Muat ulang aplikasi</Button>
          <Link to="/" className="inline-flex min-h-11 items-center rounded-md px-3 text-sm font-semibold underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-spotify-white">
            Ke beranda
          </Link>
        </div>
        <p className="text-sm text-spotify-light-gray">Memuat ulang aplikasi akan menghentikan pemutaran.</p>
      </section>
    )
  }
}

function PageContent({ load }: { load: PageLoader }) {
  const [Page] = useState(() => lazy(load))
  return <Suspense fallback={<LoadingState label="Memuat halaman…" />}><Page /></Suspense>
}

export function PageRoute({ load }: { load: PageLoader }) {
  const location = useLocation()
  const [attempt, setAttempt] = useState(0)
  return (
    <PageBoundary key={`${location.key}:${attempt}`} onRetry={() => setAttempt((value) => value + 1)}>
      {/* Remounting also clears React.lazy's cached rejection after a retry. */}
      <PageContent load={load} />
    </PageBoundary>
  )
}
