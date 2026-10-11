import { ImageOff } from 'lucide-react'
import { useState } from 'react'
import { imageUrl, type ImageSize } from '../lib/images.ts'

interface Props {
  path: string | null
  size: ImageSize
  alt: string
  /** Sizing and framing of the box; the photo always fits inside it. */
  className?: string
  /** Inset the photo from the box edge. */
  padded?: boolean
}

/**
 * A product photo that degrades to a placeholder, never a broken icon.
 *
 * The photo is absolutely positioned inside a box the caller sizes. An <img>
 * that is itself a flex item takes its minimum height from the photo's
 * natural size, so a tall, narrow photo grew its card wider than the grid
 * column; out of flow it cannot influence the layout at all.
 */
export function ProductImage({ path, size, alt, className = '', padded = false }: Props) {
  const [failedPath, setFailedPath] = useState<string | null>(null)
  const broken = !path || failedPath === path

  return (
    <div className={`relative shrink-0 overflow-hidden ${broken ? 'bg-stone-100' : 'bg-white'} ${className}`}>
      {broken ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 text-stone-400">
          <ImageOff className="size-6" aria-hidden />
          <span className="text-xs">Brak zdjęcia</span>
        </div>
      ) : (
        <img
          src={imageUrl(path, size)}
          alt={alt}
          loading="lazy"
          decoding="async"
          // CORS mode: the service worker can then cache a real response
          // instead of an opaque one (Open Food Facts allows any origin).
          crossOrigin="anonymous"
          onError={() => setFailedPath(path)}
          className={`absolute inset-0 size-full object-contain ${padded ? 'p-2' : ''}`}
        />
      )}
    </div>
  )
}
