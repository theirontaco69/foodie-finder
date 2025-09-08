import AsyncStorage from '@react-native-async-storage/async-storage';

const mem = new Map<string, any>();

export function getMem<T = any>(key: string): T | null {
  return mem.has(key) ? (mem.get(key) as T) : null;
}

export async function getCache<T = any>(key: string): Promise<T | null> {
  if (mem.has(key)) return mem.get(key) as T;
  const raw = await AsyncStorage.getItem('cache:' + key);
  if (!raw) return null;
  const val = JSON.parse(raw);
  mem.set(key, val);
  return val as T;
}

export async function setCache(key: string, value: any) {
  mem.set(key, value);
  try { await AsyncStorage.setItem('cache:' + key, JSON.stringify(value)); } catch {}
}

export function clearMem(key?: string) {
  if (key) mem.delete(key); else mem.clear();
}
