import { writable } from 'svelte/store';

/**
 * Creates a Svelte writable store that persists its value in localStorage.
 * Handles SSR/prerendering safely by checking if window is defined.
 */
const createPersistedStore = <T>(key: string, defaultValue: T) => {
  const isBrowser = typeof window !== 'undefined';
  let initialValue = defaultValue;

  if (isBrowser) {
    const storedValue = localStorage.getItem(key);
    if (storedValue !== null) {
      try {
        initialValue = JSON.parse(storedValue);
      } catch (e) {
        initialValue = defaultValue;
      }
    }
  }

  const store = writable<T>(initialValue);

  if (isBrowser) {
    store.subscribe((value) => {
      localStorage.setItem(key, JSON.stringify(value));
    });
  }

  return store;
};

export const globalBpm = createPersistedStore<number>('musicmath_bpm', 120);
export const diapason = createPersistedStore<number>('musicmath_diapason', 440);
export const sampleRate = createPersistedStore<number>('musicmath_sampleRate', 48000);
