export const qk = {
  billboards: (filter?: { campusId?: string }) => ["billboards", filter ?? {}] as const,
  billboard: (id: string) => ["billboard", id] as const,
  savedStickers: (userId: string) => ["saved-stickers", userId] as const,
  userProgress: (userId: string) => ["user", userId, "progress"] as const,
  currentUser: (userId: string) => ["user", userId, "me"] as const,
};
