import { useSyncExternalStore } from "react";

type UserProfile = {
  username: string;
  avatarUri: string | null;
};

let state: UserProfile = {
  username: "fern_walker",
  avatarUri: null,
};

const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

function getSnapshot(): UserProfile {
  return state;
}

export function useUserProfile(): UserProfile {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

export function setUsername(name: string) {
  const trimmed = name.trim();
  if (!trimmed || trimmed === state.username) return;
  state = { ...state, username: trimmed };
  emit();
}

export function setAvatarUri(uri: string | null) {
  if (uri === state.avatarUri) return;
  state = { ...state, avatarUri: uri };
  emit();
}
