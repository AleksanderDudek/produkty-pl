import { LoaderCircle, TriangleAlert } from 'lucide-react'

export function StatusScreen(props: { kind: 'loading' } | { kind: 'error'; message: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-stone-50 p-6">
      {props.kind === 'loading' ? (
        <p className="flex items-center gap-2 text-stone-600" role="status">
          <LoaderCircle className="size-5 animate-spin" aria-hidden /> Wczytywanie produktów…
        </p>
      ) : (
        <div role="alert" className="max-w-md rounded-xl border border-amber-300 bg-amber-50 p-5 text-amber-950">
          <p className="flex items-center gap-2 font-semibold">
            <TriangleAlert className="size-5" aria-hidden /> Nie można wyświetlić produktów
          </p>
          <p className="mt-2 text-sm">{props.message}</p>
        </div>
      )}
    </div>
  )
}
