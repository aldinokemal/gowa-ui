import { useState, type FormEvent } from 'react'
import { useInfiniteQuery } from '@tanstack/react-query'
import { Loader2, Search } from 'lucide-react'
import {
  searchNewsletterDirectory,
  type DirectoryParams,
  type DirectoryView,
} from '@/api/newsletter'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useSelectedDevice } from '@/hooks/use-device-guard'
import { toApiError } from '@/lib/api-error'
import { trackedQueryFn } from '@/lib/private-query'
import { useConnection } from '@/stores/connection'
import { ChannelSummary, FollowButton } from '@/features/newsletter/channel-summary'

const VIEWS: DirectoryView[] = ['RECOMMENDED', 'TRENDING', 'POPULAR', 'NEW', 'FEATURED']
const CATEGORIES = [
  'BUSINESS',
  'ENTERTAINMENT',
  'LIFESTYLE',
  'NEWS',
  'ORGANIZATIONS',
  'PEOPLE',
  'SPORTS',
]
const ANY = 'any'

const label = (value: string) => value.charAt(0) + value.slice(1).toLowerCase()

export function ChannelDirectory() {
  const device = useSelectedDevice()
  const connectionId = useConnection((state) => state.connectionId)
  const [search, setSearch] = useState('')
  const [view, setView] = useState<DirectoryView>('RECOMMENDED')
  const [countries, setCountries] = useState('')
  const [category, setCategory] = useState(ANY)
  const [params, setParams] = useState<DirectoryParams | null>(null)
  const searching = search.trim() !== ''

  const query = useInfiniteQuery({
    queryKey: ['newsletter-directory', device, params, connectionId],
    queryFn: ({ pageParam }) =>
      trackedQueryFn(connectionId, () =>
        searchNewsletterDirectory({ ...params, cursor: pageParam }),
      )(),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => (last.has_more ? last.next_cursor : undefined),
    enabled: !!params && connectionId !== null,
  })

  const onSubmit = (event: FormEvent) => {
    event.preventDefault()
    const categories = category === ANY ? undefined : category
    setParams(
      searching
        ? { search_text: search.trim(), categories }
        : {
            view,
            country_codes: countries
              .split(/[\s,]+/)
              .filter(Boolean)
              .join(','),
            categories,
          },
    )
  }

  const channels = query.data?.pages.flatMap((page) => page.data ?? []) ?? []

  return (
    <div className="flex flex-col gap-4">
      <form className="flex flex-col gap-4" onSubmit={onSubmit}>
        <div className="flex flex-col gap-2">
          <Label htmlFor="directory-search">Search by name (optional)</Label>
          <Input
            id="directory-search"
            placeholder="Leave empty to browse a list"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="flex flex-col gap-2">
            <Label>List</Label>
            <Select
              value={view}
              onValueChange={(value) => setView(value as DirectoryView)}
              disabled={searching}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {VIEWS.map((item) => (
                  <SelectItem key={item} value={item}>
                    {label(item)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="directory-countries">Countries</Label>
            <Input
              id="directory-countries"
              placeholder="ID, BR"
              pattern="\s*[A-Za-z]{2}([\s,]+[A-Za-z]{2})*[\s,]*"
              title="Two-letter country codes separated by commas, e.g. ID, BR"
              value={countries}
              onChange={(event) => setCountries(event.target.value)}
              disabled={searching}
              required={!searching}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label>Category</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ANY}>Any</SelectItem>
                {CATEGORIES.map((item) => (
                  <SelectItem key={item} value={item}>
                    {label(item)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <Button type="submit" className="self-start" disabled={query.isFetching}>
          {query.isFetching && !query.isFetchingNextPage ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Search className="size-4" />
          )}
          {searching ? 'Search' : 'Browse'}
        </Button>
      </form>

      {query.error && <p className="text-destructive text-sm">{toApiError(query.error).message}</p>}
      {query.isSuccess && channels.length === 0 && (
        <p className="text-muted-foreground text-sm">No channels found.</p>
      )}

      {channels.length > 0 && (
        <ul className="flex flex-col divide-y">
          {channels.map((channel) => (
            <li key={channel.id} className="flex items-start justify-between gap-3 py-3">
              <div className="flex min-w-0 flex-col gap-1">
                <ChannelSummary channel={channel} />
                {channel.thread_metadata?.description?.text && (
                  <p className="text-muted-foreground line-clamp-2 text-xs">
                    {channel.thread_metadata.description.text}
                  </p>
                )}
              </div>
              <FollowButton newsletterId={channel.id} />
            </li>
          ))}
        </ul>
      )}

      {query.hasNextPage && (
        <Button
          variant="outline"
          size="sm"
          className="self-center"
          disabled={query.isFetchingNextPage}
          onClick={() => void query.fetchNextPage()}
        >
          {query.isFetchingNextPage && <Loader2 className="size-4 animate-spin" />}
          Load more
        </Button>
      )}
    </div>
  )
}
