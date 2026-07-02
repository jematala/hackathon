import {
  claimQuestResponseSchema,
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
  listPoisResponseSchema,
  listQuestsResponseSchema,
  listSavedStickersResponseSchema,
  upsertPoiResponseSchema,
  type CreateBillboardInput,
  type CreatePlacementInput,
  type CreatePoiInput,
  type CreateSavedStickerInput,
  type CreateStickerInput,
  type UpdatePoiInput,
} from "@repo/shared";
import { useAuth } from "@clerk/expo";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { pushQuestProgress } from "@/lib/quests/toasts";

import { apiFetch } from "./client";
import { qk } from "./queryKeys";

function useApiAuth() {
  const auth = useAuth({ treatPendingAsSignedOut: false });
  const userId = auth.userId ?? "__signed-out__";

  return {
    enabled: auth.isLoaded && auth.isSignedIn,
    getToken: auth.getToken,
    userId,
  };
}

export function useBillboards(filter?: { campusId?: string }) {
  const auth = useApiAuth();
  return useQuery({
    queryKey: qk.billboards(filter),
    enabled: auth.enabled,
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
  const auth = useApiAuth();
  return useQuery({
    queryKey: id ? qk.billboard(id) : qk.billboard("__none__"),
    enabled: Boolean(id) && auth.enabled,
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

export function usePois(filter?: { campusId?: string }) {
  const auth = useApiAuth();
  return useQuery({
    queryKey: qk.pois(filter),
    enabled: auth.enabled,
    queryFn: () =>
      apiFetch({
        method: "GET",
        path: filter?.campusId
          ? `/api/pois?campusId=${encodeURIComponent(filter.campusId)}`
          : "/api/pois",
        getToken: auth.getToken,
        schema: listPoisResponseSchema,
      }),
    select: (data) => data.pois,
  });
}

export function useUpsertPoi() {
  const auth = useApiAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreatePoiInput | UpdatePoiInput) =>
      apiFetch({
        method: "POST",
        path: "/api/pois",
        body: input,
        getToken: auth.getToken,
        schema: upsertPoiResponseSchema,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pois"] });
    },
  });
}

export function useCreateBillboard() {
  const auth = useApiAuth();
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
      queryClient.invalidateQueries({ queryKey: qk.quests(auth.userId) });
      queryClient.invalidateQueries({ queryKey: qk.userProgress(auth.userId) });
    },
  });
}

export function useDeleteBillboard() {
  const auth = useApiAuth();
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
      queryClient.invalidateQueries({ queryKey: qk.userProgress(auth.userId) });
    },
  });
}

export function useCreatePlacement(billboardId: string) {
  const auth = useApiAuth();
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
      queryClient.invalidateQueries({ queryKey: qk.quests(auth.userId) });
      queryClient.invalidateQueries({ queryKey: qk.userProgress(auth.userId) });
    },
  });
}

export function useCreateStickerAsset() {
  const auth = useApiAuth();
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
  const auth = useApiAuth();
  return useQuery({
    queryKey: qk.savedStickers(auth.userId),
    enabled: auth.enabled,
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
  const auth = useApiAuth();
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
      queryClient.invalidateQueries({ queryKey: qk.savedStickers(auth.userId) });
    },
  });
}

export function useDeleteSavedSticker() {
  const auth = useApiAuth();
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
      queryClient.invalidateQueries({ queryKey: qk.savedStickers(auth.userId) });
    },
  });
}

export function useQuests() {
  const auth = useApiAuth();
  return useQuery({
    queryKey: qk.quests(auth.userId),
    enabled: auth.enabled,
    queryFn: () =>
      apiFetch({
        method: "GET",
        path: "/api/quests",
        getToken: auth.getToken,
        schema: listQuestsResponseSchema,
      }),
  });
}

export function useClaimQuest() {
  const auth = useApiAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch({
        method: "POST",
        path: `/api/quests/${id}/claim`,
        body: {},
        getToken: auth.getToken,
        schema: claimQuestResponseSchema,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qk.quests(auth.userId) });
      queryClient.invalidateQueries({ queryKey: qk.userProgress(auth.userId) });
      queryClient.invalidateQueries({ queryKey: qk.currentUser(auth.userId) });
    },
  });
}

export function useUserProgress() {
  const auth = useApiAuth();
  return useQuery({
    queryKey: qk.userProgress(auth.userId),
    enabled: auth.enabled,
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
  const auth = useApiAuth();
  return useQuery({
    queryKey: qk.currentUser(auth.userId),
    enabled: auth.enabled,
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
