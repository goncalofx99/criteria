import { lazy, Suspense } from 'react'
import { Loader2 } from 'lucide-react'
import type { PostsMapProps } from './PostsMap'

const PostsMap = lazy(() => import('./PostsMap'))

/**
 * Use this everywhere instead of PostsMap directly so Leaflet (~85KB gzip)
 * is split out of the main bundle and only fetched when the user actually
 * sees a map.
 */
export function LazyPostsMap(props: PostsMapProps) {
  const { height = 320 } = props
  return (
    <Suspense
      fallback={
        <div
          className="flex items-center justify-center rounded-xl border border-border bg-overlay/50"
          style={{ height, width: '100%' }}
        >
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <PostsMap {...props} />
    </Suspense>
  )
}
