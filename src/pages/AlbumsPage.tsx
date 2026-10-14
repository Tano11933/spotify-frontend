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
      {albums.length === 0 ? (
        <EmptyState message="Belum ada album di katalog." />
      ) : (
        <>
          <SectionGrid title="Semua album">
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
