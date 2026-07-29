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
  updateCurrentUserResponseSchema,
  visitPoiResponseSchema,
  type CreateBillboardInput,
  type GetBillboardResponse,
  type CreatePlacementInput,
  type CreateSavedStickerInput,
  type CreateStickerInput,
  type UpdateAvatarInput,
  type UpdateCurrentUserInput,
  type VisitPoiInput,
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

export function useVisitPoi(filter?: { campusId?: string }) {
  const auth = useApiAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: VisitPoiInput }) =>
      apiFetch({
        method: "POST",
        path: `/api/pois/${id}/visit`,
        body: input,
        getToken: auth.getToken,
        schema: visitPoiResponseSchema,
      }),
    onSuccess: (data) => {
      pushQuestProgress(data.questProgress);
      queryClient.invalidateQueries({ queryKey: qk.pois(filter) });
      queryClient.invalidateQueries({ queryKey: qk.quests(auth.userId) });
      queryClient.invalidateQueries({ queryKey: qk.userProgress(auth.userId) });
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
      // Write the returned placement straight into the cached board so it
      // renders instantly, instead of waiting on a refetch round trip.
      queryClient.setQueryData<GetBillboardResponse>(qk.billboard(billboardId), (prev) => {
        if (!prev || prev.billboard.placements.some((p) => p.id === data.placement.id)) {
          return prev;
        }
        return {
          billboard: {
            ...prev.billboard,
            placements: [...prev.billboard.placements, data.placement],
            placementCount: prev.billboard.placementCount + 1,
          },
        };
      });
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
    onSuccess: (data) => {
      pushQuestProgress(data.questProgress);
      queryClient.invalidateQueries({ queryKey: qk.savedStickers(auth.userId) });
      queryClient.invalidateQueries({ queryKey: qk.quests(auth.userId) });
      queryClient.invalidateQueries({ queryKey: qk.userProgress(auth.userId) });
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
      queryClient.invalidateQueries({ queryKey: qk.userProgress(auth.userId) });
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

export function useUpdateCurrentUser() {
  const auth = useApiAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateCurrentUserInput) =>
      apiFetch({
        method: "PATCH",
        path: "/api/users/me",
        body: input,
        getToken: auth.getToken,
        schema: updateCurrentUserResponseSchema,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qk.currentUser(auth.userId) });
    },
  });
}

export function useUpdateAvatar() {
  const auth = useApiAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateAvatarInput) =>
      apiFetch({
        method: "PATCH",
        path: "/api/users/me/avatar",
        body: input,
        getToken: auth.getToken,
        schema: updateCurrentUserResponseSchema,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qk.currentUser(auth.userId) });
    },
  });
}
