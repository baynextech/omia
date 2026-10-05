import { useSyncExternalStore } from 'react';
import { apiFetch, getToken } from '../lib/api';

// Los favoritos se guardan en la cuenta. Sin sesión quedan en el navegador
// y se suben a la cuenta la próxima vez que la persona ingresa.
const LOCAL_KEY = 'omia_favorites';
let favorites: string[] = readLocal();
let loadedForToken: string | null = null;
const listeners = new Set<() => void>();

function readLocal(): string[] {
  try {
    const saved = localStorage.getItem(LOCAL_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
}

function setFavorites(next: string[]) {
  favorites = next;
  try {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(next));
  } catch {}
  listeners.forEach((l) => l());
}

export async function syncFavorites() {
  const token = getToken();
  if (!token) {
    loadedForToken = null;
    return;
  }
  if (loadedForToken === token) return;
  loadedForToken = token;
  try {
    const res = await apiFetch('/api/user/favorites');
    if (!res.ok) return;
    const remote: string[] = (await res.json()).map((t: { id: string }) => t.id);
    const onlyLocal = favorites.filter((id) => !remote.includes(id));
    await Promise.all(onlyLocal.map((id) => apiFetch(`/api/favorites/${id}`, { method: 'POST' })));
    setFavorites([...remote, ...onlyLocal]);
  } catch {
    loadedForToken = null;
  }
}

export function clearFavorites() {
  loadedForToken = null;
  setFavorites([]);
}

function toggleFavorite(id: string) {
  const isFav = favorites.includes(id);
  setFavorites(isFav ? favorites.filter((f) => f !== id) : [...favorites, id]);
  if (getToken()) {
    apiFetch(`/api/favorites/${id}`, { method: isFav ? 'DELETE' : 'POST' }).catch(() => {});
  }
}

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export function useFavorites() {
  const current = useSyncExternalStore(subscribe, () => favorites);
  return { favorites: current, toggleFavorite, isFavorite: (id: string) => current.includes(id) };
}
