import { ArtistCard } from '@/components/ArtistCard'
import { LoadMore } from '@/components/LoadMore'
import { SectionGrid } from '@/components/SectionGrid'
import { EmptyState, ErrorState, LoadingState } from '@/components/StateMessage'
import { usePagedList } from '@/hooks/usePagedList'
import { catalogApi } from '@/lib/api'

export function ArtistsPage() {
  // Endpoint ini di-cache Redis 5 menit di backend, jadi memuat halaman
  // berikutnya murah. Halaman pertama dimuat otomatis; sisanya lewat tombol
  // "Muat lagi" supaya katalog besar tidak mengirim ratusan kartu sekaligus.
  const {
    items: artists,
    total,
    isLoading,
    isLoadingMore,
    error,
    hasMore,
    loadMore,
    reload,
  } = usePagedList((params) => catalogApi.getArtists(params))

  if (isLoading) return <LoadingState />
  if (error && artists.length === 0) return <ErrorState message={error} onRetry={reload} />

  return (
    <div className="pt-4">
      {artists.length === 0 ? (
        <EmptyState message="Belum ada artist di katalog." />
      ) : (
        <>
          <SectionGrid title="Semua artis">
            {artists.map((artist) => (
              <ArtistCard key={artist.id} artist={artist} />
            ))}
          </SectionGrid>

          <LoadMore
            shown={artists.length}
            total={total}
            hasMore={hasMore}
            isLoadingMore={isLoadingMore}
            error={error}
            onLoadMore={loadMore}
            label="artis"
          />
        </>
      )}
    </div>
  )
}
