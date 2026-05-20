import { createContext, useContext, useMemo, useState, type PropsWithChildren } from "react";

export type DevUser = {
  id: string;
  username: string;
  displayName: string;
};

const DEV_USERS: ReadonlyArray<DevUser> = [
  {
    id: "00000000-0000-4000-8000-000000000002",
    username: "bluewren",
    displayName: "Blue Wren",
  },
  {
    id: "00000000-0000-4000-8000-000000000001",
    username: "admin",
    displayName: "Demo Admin",
  },
];

type DevUserContextValue = {
  user: DevUser;
  users: ReadonlyArray<DevUser>;
  setUserId: (id: string) => void;
  toggleUser: () => void;
};

const DevUserContext = createContext<DevUserContextValue | null>(null);

function resolveInitialUser(): DevUser {
  const envId = process.env.EXPO_PUBLIC_DEV_USER_ID;
  return DEV_USERS.find((u) => u.id === envId) ?? DEV_USERS[0];
}

export function DevUserProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useState<DevUser>(resolveInitialUser);

  const value = useMemo<DevUserContextValue>(
    () => ({
      user,
      users: DEV_USERS,
      setUserId: (id: string) => {
        const next = DEV_USERS.find((u) => u.id === id);
        if (next) setUser(next);
      },
      toggleUser: () => {
        const idx = DEV_USERS.findIndex((u) => u.id === user.id);
        setUser(DEV_USERS[(idx + 1) % DEV_USERS.length]);
      },
    }),
    [user],
  );

  return <DevUserContext.Provider value={value}>{children}</DevUserContext.Provider>;
}

export function useDevUser(): DevUserContextValue {
  const ctx = useContext(DevUserContext);
  if (!ctx) {
    throw new Error("useDevUser must be used inside DevUserProvider");
  }
  return ctx;
}

export function useDevUserId(): string {
  return useDevUser().user.id;
}
