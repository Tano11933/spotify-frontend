import { Link } from 'react-router'

import { AlbumCard } from '@/components/AlbumCard'
import { LoadMore } from '@/components/LoadMore'
import { SectionGrid } from '@/components/SectionGrid'
import { EmptyState, ErrorState, LoadingState } from '@/components/StateMessage'
import { usePagedList } from '@/hooks/usePagedList'
import { catalogApi } from '@/lib/api'

export function AlbumsPage() {
  const {
    items: albums,
    total,
    isLoading,
    isLoadingMore,
    error,
    hasMore,
    loadMore,
    reload,
  } = usePagedList((params) => catalogApi.getAlbums(params))

  if (isLoading) return <LoadingState />
  if (error && albums.length === 0) return <ErrorState message={error} onRetry={reload} />

  return (
    <div className="pt-4">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-spotify-white md:text-5xl">Album</h1>
          <p className="mt-2 text-[0.9375rem] leading-relaxed text-spotify-light-gray">
            Seluruh album di katalog.
          </p>
        </div>

        <Link
          to="/new-releases"
          className="rounded-full border border-spotify-light-gray px-4 py-2 text-sm font-semibold text-spotify-white transition-colors hover:border-spotify-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-spotify-white"
        >
          Rilisan baru
        </Link>
      </div>

      {albums.length === 0 ? (
        <EmptyState message="Belum ada album di katalog." />
      ) : (
        <>
          <SectionGrid>
            {albums.map((album) => (
              <AlbumCard key={album.id} album={album} />
            ))}
          </SectionGrid>

          <LoadMore
            shown={albums.length}
            total={total}
            hasMore={hasMore}
            isLoadingMore={isLoadingMore}
            error={error}
            onLoadMore={loadMore}
            label="album"
          />
        </>
      )}
    </div>
  )
}
