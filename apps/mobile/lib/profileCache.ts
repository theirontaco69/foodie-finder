export type Profile = {
  id: string;
  display_name: string | null;
  username: string | null;
  avatar_url: string | null;
};
const cache = new Map<string, Profile>();
export function getProfileFromCache(id: string): Profile | undefined { return cache.get(id); }
export function setProfileInCache(p: Profile) { cache.set(p.id, p); }
