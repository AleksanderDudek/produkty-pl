import { formatDate } from '../lib/format.ts'
import type { Dataset } from '../lib/types.ts'

export function Footer({ dataset }: { dataset: Dataset }) {
  const link = 'font-medium text-stone-700 underline-offset-2 hover:underline'
  return (
    <footer className="border-t border-stone-200 bg-white">
      <div className="mx-auto max-w-[1440px] px-4 py-5 text-xs leading-relaxed text-stone-500">
        <p>
          Dane produktów:{' '}
          <a className={link} href="https://world.openfoodfacts.org" target="_blank" rel="noopener noreferrer">Open Food Facts</a>{' '}
          (licencja ODbL), zdjęcia na licencji CC BY-SA. Ceny:{' '}
          <a className={link} href="https://prices.openfoodfacts.org" target="_blank" rel="noopener noreferrer">Open Prices</a>.
          Mapa i sklepy: ©{' '}
          <a className={link} href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> (ODbL).
        </p>
        <p>
          Dane przygotowane {formatDate(dataset.generatedAt)}
          {dataset.sources.prices && <>, ceny pobrane {formatDate(dataset.sources.prices)}</>}.
          Dane tworzą użytkownicy, więc mogą być niepełne lub błędne.
        </p>
      </div>
    </footer>
  )
}
