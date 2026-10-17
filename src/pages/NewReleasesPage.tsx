import { AlbumCard } from '@/components/AlbumCard'
import { LoadMore } from '@/components/LoadMore'
import { SectionGrid } from '@/components/SectionGrid'
import { EmptyState, ErrorState, LoadingState } from '@/components/StateMessage'
import { usePagedList } from '@/hooks/usePagedList'
import { catalogApi } from '@/lib/api'

/**
 * Halaman "Rilisan baru": album diurutkan tanggal rilis menurun oleh backend
 * (`release_date DESC, id DESC`), jadi halaman ini tidak mengurutkan apa pun
 * sendiri. Pagination-nya offset seperti halaman katalog lain.
 */
export function NewReleasesPage() {
  const {
    items: albums,
    total,
    isLoading,
    isLoadingMore,
    error,
    hasMore,
    loadMore,
    reload,
  } = usePagedList((params) => catalogApi.getNewReleases(params))

  if (isLoading) return <LoadingState />
  if (error && albums.length === 0) return <ErrorState message={error} onRetry={reload} />

  return (
    <div className="pt-4">
      <h1 className="text-3xl font-bold tracking-tight text-spotify-white md:text-5xl">
        Rilisan baru
      </h1>
      <p className="mt-2 mb-8 text-[0.9375rem] leading-relaxed text-spotify-light-gray">
        Album terbaru dari seluruh katalog, diurutkan dari tanggal rilis.
      </p>

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
