import {
  createBillboardResponseSchema,
  createPlacementResponseSchema,
  createSavedStickerResponseSchema,
  createStickerResponseSchema,
  deleteBillboardResponseSchema,
  deleteSavedStickerResponseSchema,
  getBillboardResponseSchema,
  getCurrentUserResponseSchema,
  getUserProgressResponseSchema,
  listBillboardsResponseSchema,
  listSavedStickersResponseSchema,
  type CreateBillboardInput,
  type CreatePlacementInput,
  type CreateSavedStickerInput,
  type CreateStickerInput,
} from "@repo/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useDevUserId } from "@/lib/devUser";
import { pushQuestProgress } from "@/lib/quests/toasts";

import { apiFetch } from "./client";
import { qk } from "./queryKeys";

export function useBillboards(filter?: { campusId?: string }) {
  const userId = useDevUserId();
  return useQuery({
    queryKey: qk.billboards(filter),
    queryFn: () =>
      apiFetch({
        method: "GET",
        path: filter?.campusId
          ? `/api/billboards?campusId=${encodeURIComponent(filter.campusId)}`
          : "/api/billboards",
        userId,
        schema: listBillboardsResponseSchema,
      }),
    select: (data) => data.billboards,
  });
}

export function useBillboard(id: string | undefined) {
  const userId = useDevUserId();
  return useQuery({
    queryKey: id ? qk.billboard(id) : qk.billboard("__none__"),
    enabled: Boolean(id),
    queryFn: () =>
      apiFetch({
        method: "GET",
        path: `/api/billboards/${id}`,
        userId,
        schema: getBillboardResponseSchema,
      }),
    select: (data) => data.billboard,
  });
}

export function useCreateBillboard() {
  const userId = useDevUserId();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateBillboardInput) =>
      apiFetch({
        method: "POST",
        path: "/api/billboards",
        body: input,
        userId,
        schema: createBillboardResponseSchema,
      }),
    onSuccess: (data) => {
      pushQuestProgress(data.questProgress);
      queryClient.invalidateQueries({ queryKey: ["billboards"] });
      queryClient.invalidateQueries({ queryKey: qk.userProgress(userId) });
    },
  });
}

export function useDeleteBillboard() {
  const userId = useDevUserId();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch({
        method: "DELETE",
        path: `/api/billboards/${id}`,
        userId,
        schema: deleteBillboardResponseSchema,
      }),
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: ["billboards"] });
      queryClient.invalidateQueries({ queryKey: qk.billboard(id) });
      queryClient.invalidateQueries({ queryKey: qk.userProgress(userId) });
    },
  });
}

export function useCreatePlacement(billboardId: string) {
  const userId = useDevUserId();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreatePlacementInput) =>
      apiFetch({
        method: "POST",
        path: `/api/billboards/${billboardId}/placements`,
        body: input,
        userId,
        schema: createPlacementResponseSchema,
      }),
    onSuccess: (data) => {
      pushQuestProgress(data.questProgress);
      queryClient.invalidateQueries({ queryKey: qk.billboard(billboardId) });
      queryClient.invalidateQueries({ queryKey: ["billboards"] });
    },
  });
}

export function useCreateStickerAsset() {
  const userId = useDevUserId();
  return useMutation({
    mutationFn: (input: CreateStickerInput) =>
      apiFetch({
        method: "POST",
        path: "/api/users/me/stickers",
        body: input,
        userId,
        schema: createStickerResponseSchema,
      }),
  });
}

export function useSavedStickers() {
  const userId = useDevUserId();
  return useQuery({
    queryKey: qk.savedStickers(userId),
    queryFn: () =>
      apiFetch({
        method: "GET",
        path: "/api/users/me/saved-stickers",
        userId,
        schema: listSavedStickersResponseSchema,
      }),
  });
}

export function useSaveSticker() {
  const userId = useDevUserId();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateSavedStickerInput) =>
      apiFetch({
        method: "POST",
        path: "/api/users/me/saved-stickers",
        body: input,
        userId,
        schema: createSavedStickerResponseSchema,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qk.savedStickers(userId) });
    },
  });
}

export function useDeleteSavedSticker() {
  const userId = useDevUserId();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch({
        method: "DELETE",
        path: `/api/users/me/saved-stickers/${id}`,
        userId,
        schema: deleteSavedStickerResponseSchema,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qk.savedStickers(userId) });
    },
  });
}

export function useUserProgress() {
  const userId = useDevUserId();
  return useQuery({
    queryKey: qk.userProgress(userId),
    queryFn: () =>
      apiFetch({
        method: "GET",
        path: "/api/users/me/progress",
        userId,
        schema: getUserProgressResponseSchema,
      }),
    select: (data) => data.progress,
  });
}

export function useCurrentUser() {
  const userId = useDevUserId();
  return useQuery({
    queryKey: qk.currentUser(userId),
    queryFn: () =>
      apiFetch({
        method: "GET",
        path: "/api/users/me",
        userId,
        schema: getCurrentUserResponseSchema,
      }),
    select: (data) => data.user,
  });
}
