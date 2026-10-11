import '@testing-library/jest-dom/vitest'
// IndexedDB for the diet tab's Dexie database.
import 'fake-indexeddb/auto'
import { cleanup, configure } from '@testing-library/react'
import { afterEach } from 'vitest'

// The map and diet tabs are loaded on demand (React.lazy): their first render
// waits for a dynamic import, which under a full parallel run can take longer
// than Testing Library's default 1 s.
configure({ asyncUtilTimeout: 4000 })

// Testing Library unmounts between tests on its own only when the test
// runner exposes a global afterEach; Vitest does not unless `globals` is on.
afterEach(() => cleanup())

// jsdom has <dialog> without its methods. The components call them as a
// browser would, so the stand-in lives here rather than in the components.
if (typeof HTMLDialogElement !== 'undefined' && !HTMLDialogElement.prototype.showModal) {
  HTMLDialogElement.prototype.showModal = function showModal(this: HTMLDialogElement) {
    this.setAttribute('open', '')
  }
  HTMLDialogElement.prototype.close = function close(this: HTMLDialogElement) {
    if (!this.hasAttribute('open')) return
    this.removeAttribute('open')
    this.dispatchEvent(new Event('close'))
  }
}
