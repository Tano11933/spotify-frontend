import { ArtistCard } from '@/components/ArtistCard'
import { SectionGrid } from '@/components/SectionGrid'
import { EmptyState, ErrorState, LoadingState } from '@/components/StateMessage'
import { useAsync } from '@/hooks/useAsync'
import { catalogApi } from '@/lib/api'

export function ArtistsPage() {
  // Endpoint ini di-cache Redis 5 menit di backend (PRD.md §5.3), jadi
  // pemanggilan berulang tidak menyentuh Postgres.
  const { data, error, isLoading, reload } = useAsync(() => catalogApi.getArtists(), [])

  if (isLoading) return <LoadingState />
  if (error) return <ErrorState message={error} onRetry={reload} />

  const artists = data ?? []

  return (
    <div className="pt-4">
      {artists.length === 0 ? (
        <EmptyState message="Belum ada artist di katalog." />
      ) : (
        <SectionGrid title="Semua artis">
          {artists.map((artist) => (
            <ArtistCard key={artist.id} artist={artist} />
          ))}
        </SectionGrid>
      )}
    </div>
  )
}
