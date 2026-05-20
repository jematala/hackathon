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
import { useAuth } from "@clerk/expo";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { pushQuestProgress } from "@/lib/quests/toasts";

import { apiFetch } from "./client";
import { qk } from "./queryKeys";

export function useBillboards(filter?: { campusId?: string }) {
  const auth = useAuth({ treatPendingAsSignedOut: false });
  return useQuery({
    queryKey: qk.billboards(filter),
    enabled: auth.isLoaded && auth.isSignedIn,
    queryFn: () =>
      apiFetch({
        method: "GET",
        path: filter?.campusId
          ? `/api/billboards?campusId=${encodeURIComponent(filter.campusId)}`
          : "/api/billboards",
        getToken: auth.getToken,
        schema: listBillboardsResponseSchema,
      }),
    select: (data) => data.billboards,
  });
}

export function useBillboard(id: string | undefined) {
  const auth = useAuth({ treatPendingAsSignedOut: false });
  return useQuery({
    queryKey: id ? qk.billboard(id) : qk.billboard("__none__"),
    enabled: Boolean(id) && auth.isLoaded && auth.isSignedIn,
    queryFn: () =>
      apiFetch({
        method: "GET",
        path: `/api/billboards/${id}`,
        getToken: auth.getToken,
        schema: getBillboardResponseSchema,
      }),
    select: (data) => data.billboard,
  });
}

export function useCreateBillboard() {
  const auth = useAuth({ treatPendingAsSignedOut: false });
  const userId = auth.userId ?? "__signed-out__";
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateBillboardInput) =>
      apiFetch({
        method: "POST",
        path: "/api/billboards",
        body: input,
        getToken: auth.getToken,
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
  const auth = useAuth({ treatPendingAsSignedOut: false });
  const userId = auth.userId ?? "__signed-out__";
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch({
        method: "DELETE",
        path: `/api/billboards/${id}`,
        getToken: auth.getToken,
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
  const auth = useAuth({ treatPendingAsSignedOut: false });
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreatePlacementInput) =>
      apiFetch({
        method: "POST",
        path: `/api/billboards/${billboardId}/placements`,
        body: input,
        getToken: auth.getToken,
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
  const auth = useAuth({ treatPendingAsSignedOut: false });
  return useMutation({
    mutationFn: (input: CreateStickerInput) =>
      apiFetch({
        method: "POST",
        path: "/api/users/me/stickers",
        body: input,
        getToken: auth.getToken,
        schema: createStickerResponseSchema,
      }),
  });
}

export function useSavedStickers() {
  const auth = useAuth({ treatPendingAsSignedOut: false });
  const userId = auth.userId ?? "__signed-out__";
  return useQuery({
    queryKey: qk.savedStickers(userId),
    enabled: auth.isLoaded && auth.isSignedIn,
    queryFn: () =>
      apiFetch({
        method: "GET",
        path: "/api/users/me/saved-stickers",
        getToken: auth.getToken,
        schema: listSavedStickersResponseSchema,
      }),
  });
}

export function useSaveSticker() {
  const auth = useAuth({ treatPendingAsSignedOut: false });
  const userId = auth.userId ?? "__signed-out__";
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateSavedStickerInput) =>
      apiFetch({
        method: "POST",
        path: "/api/users/me/saved-stickers",
        body: input,
        getToken: auth.getToken,
        schema: createSavedStickerResponseSchema,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qk.savedStickers(userId) });
    },
  });
}

export function useDeleteSavedSticker() {
  const auth = useAuth({ treatPendingAsSignedOut: false });
  const userId = auth.userId ?? "__signed-out__";
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch({
        method: "DELETE",
        path: `/api/users/me/saved-stickers/${id}`,
        getToken: auth.getToken,
        schema: deleteSavedStickerResponseSchema,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qk.savedStickers(userId) });
    },
  });
}

export function useUserProgress() {
  const auth = useAuth({ treatPendingAsSignedOut: false });
  const userId = auth.userId ?? "__signed-out__";
  return useQuery({
    queryKey: qk.userProgress(userId),
    enabled: auth.isLoaded && auth.isSignedIn,
    queryFn: () =>
      apiFetch({
        method: "GET",
        path: "/api/users/me/progress",
        getToken: auth.getToken,
        schema: getUserProgressResponseSchema,
      }),
    select: (data) => data.progress,
  });
}

export function useCurrentUser() {
  const auth = useAuth({ treatPendingAsSignedOut: false });
  const userId = auth.userId ?? "__signed-out__";
  return useQuery({
    queryKey: qk.currentUser(userId),
    enabled: auth.isLoaded && auth.isSignedIn,
    queryFn: () =>
      apiFetch({
        method: "GET",
        path: "/api/users/me",
        getToken: auth.getToken,
        schema: getCurrentUserResponseSchema,
      }),
    select: (data) => data.user,
  });
}
