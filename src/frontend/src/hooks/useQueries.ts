import type { Principal } from "@icp-sdk/core/principal";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Match, Tournament, UserProfile } from "../backend.d";
import type { UserRole } from "../backend.d";
import { useActor } from "./useActor";

export function useAllTournaments() {
  const { actor, isFetching } = useActor();
  return useQuery<Tournament[]>({
    queryKey: ["tournaments"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getAllTournaments();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useTournament(id: bigint | null) {
  const { actor, isFetching } = useActor();
  return useQuery<Tournament | null>({
    queryKey: ["tournament", id?.toString()],
    queryFn: async () => {
      if (!actor || id === null) return null;
      return actor.getTournament(id);
    },
    enabled: !!actor && !isFetching && id !== null,
  });
}

export function useBracketMatches(tournamentId: bigint | null) {
  const { actor, isFetching } = useActor();
  return useQuery<Match[]>({
    queryKey: ["matches", tournamentId?.toString()],
    queryFn: async () => {
      if (!actor || tournamentId === null) return [];
      return actor.getBracketMatches(tournamentId);
    },
    enabled: !!actor && !isFetching && tournamentId !== null,
  });
}

export function useUserProfile() {
  const { actor, isFetching } = useActor();
  return useQuery<UserProfile | null>({
    queryKey: ["userProfile"],
    queryFn: async () => {
      if (!actor) return null;
      return actor.getCallerUserProfile();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useIsAdmin() {
  const { actor, isFetching } = useActor();
  return useQuery<boolean>({
    queryKey: ["isAdmin"],
    queryFn: async () => {
      if (!actor) return false;
      return actor.isCallerAdmin();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useCreateTournament() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      name: string;
      description: string;
      has3rdPlaceMatch: boolean;
    }) => {
      if (!actor) throw new Error("Not authenticated");
      return actor.createTournament(
        data.name,
        data.description,
        data.has3rdPlaceMatch,
      );
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tournaments"] }),
  });
}

export function useStartTournament() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (tournamentId: bigint) => {
      if (!actor) throw new Error("Not authenticated");
      return actor.startTournament(tournamentId);
    },
    onSuccess: (_d, id) => {
      qc.invalidateQueries({ queryKey: ["tournament", id.toString()] });
      qc.invalidateQueries({ queryKey: ["matches", id.toString()] });
      qc.invalidateQueries({ queryKey: ["tournaments"] });
    },
  });
}

export function useJoinTournament() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (tournamentId: bigint) => {
      if (!actor) throw new Error("Not authenticated");
      return actor.joinTournament(tournamentId);
    },
    onSuccess: (_d, id) => {
      qc.invalidateQueries({ queryKey: ["tournament", id.toString()] });
      qc.invalidateQueries({ queryKey: ["tournaments"] });
    },
  });
}

export function useAddGuestPlayer() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: { tournamentId: bigint; name: string }) => {
      if (!actor) throw new Error("Not authenticated");
      return actor.addGuestPlayer(data.tournamentId, data.name);
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({
        queryKey: ["tournament", vars.tournamentId.toString()],
      });
    },
  });
}

export function useReportMatch() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      tournamentId: bigint;
      round: bigint;
      slot: bigint;
      score1: bigint;
      score2: bigint;
      winnerId: Principal | null;
    }) => {
      if (!actor) throw new Error("Not authenticated");
      return actor.reportMatch(
        data.tournamentId,
        data.round,
        data.slot,
        data.score1,
        data.score2,
        data.winnerId,
      );
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({
        queryKey: ["matches", vars.tournamentId.toString()],
      });
    },
  });
}

export function useSaveProfile() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (profile: UserProfile) => {
      if (!actor) throw new Error("Not authenticated");
      return actor.saveCallerUserProfile(profile);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["userProfile"] }),
  });
}

export function useAssignRole() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: { user: Principal; role: UserRole }) => {
      if (!actor) throw new Error("Not authenticated");
      return actor.assignCallerUserRole(data.user, data.role);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["isAdmin"] }),
  });
}
