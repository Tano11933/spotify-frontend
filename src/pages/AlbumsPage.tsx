import { AlbumCard } from '@/components/AlbumCard'
import { SectionGrid } from '@/components/SectionGrid'
import { EmptyState, ErrorState, LoadingState } from '@/components/StateMessage'
import { useAsync } from '@/hooks/useAsync'
import { catalogApi } from '@/lib/api'

export function AlbumsPage() {
  const { data, error, isLoading, reload } = useAsync(
    () => catalogApi.getAlbums({ limit: 100 }),
    [],
  )

  if (isLoading) return <LoadingState />
  if (error) return <ErrorState message={error} onRetry={reload} />

  const albums = data?.items ?? []

  return (
    <div className="pt-4">
      {albums.length === 0 ? (
        <EmptyState message="Belum ada album di katalog." />
      ) : (
        <SectionGrid title="Semua album">
          {albums.map((album) => (
            <AlbumCard key={album.id} album={album} />
          ))}
        </SectionGrid>
      )}
    </div>
  )
}
