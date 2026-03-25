import type { Principal } from "@icp-sdk/core/principal";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  AdminStats,
  Match,
  PublicPlayer,
  Tournament,
  UserProfile,
} from "../backend.d";
import type { UserRole } from "../backend.d";
import { TournamentStatus } from "../backend.d";
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

export function useTournamentPlayers(tournamentId: bigint | null) {
  const { actor, isFetching } = useActor();
  return useQuery<PublicPlayer[]>({
    queryKey: ["players", tournamentId?.toString()],
    queryFn: async () => {
      if (!actor || tournamentId === null) return [];
      return actor.getTournamentPlayers(tournamentId);
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
      try {
        return await actor.isCallerAdmin();
      } catch {
        return false;
      }
    },
    enabled: !!actor && !isFetching,
  });
}

export function useIsCallerTournamentCreator(tournamentId: bigint | null) {
  const { actor, isFetching } = useActor();
  return useQuery<boolean>({
    queryKey: ["isTournamentCreator", tournamentId?.toString()],
    queryFn: async () => {
      if (!actor || tournamentId === null) return false;
      try {
        return await actor.isCallerTournamentCreator(tournamentId);
      } catch {
        return false;
      }
    },
    enabled: !!actor && !isFetching && tournamentId !== null,
  });
}

export function useIsCallerJoinedTournament(tournamentId: bigint | null) {
  const { actor, isFetching } = useActor();
  return useQuery<boolean>({
    queryKey: ["isJoined", tournamentId?.toString()],
    queryFn: async () => {
      if (!actor || tournamentId === null) return false;
      try {
        const [profile, players] = await Promise.all([
          actor.getCallerUserProfile(),
          actor.getTournamentPlayers(tournamentId),
        ]);
        if (!profile) return false;
        return players.some(
          (p) => p.name.toLowerCase() === profile.name.toLowerCase(),
        );
      } catch {
        return false;
      }
    },
    enabled: !!actor && !isFetching && tournamentId !== null,
  });
}

export function useAdminStats() {
  const { actor, isFetching } = useActor();
  return useQuery<AdminStats | null>({
    queryKey: ["adminStats"],
    queryFn: async () => {
      if (!actor) return null;
      try {
        return await actor.getAdminStats();
      } catch {
        return null;
      }
    },
    enabled: !!actor && !isFetching,
  });
}

export function useBanUser() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (user: Principal) => {
      if (!actor) throw new Error("Not authenticated");
      return actor.banUser(user);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["adminStats"] }),
  });
}

export function useUnbanUser() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (user: Principal) => {
      if (!actor) throw new Error("Not authenticated");
      return actor.unbanUser(user);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["adminStats"] }),
  });
}

export function useDeleteTournament() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (tournamentId: bigint) => {
      if (!actor) throw new Error("Not authenticated");
      return actor.deleteTournament(tournamentId);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tournaments"] });
      qc.invalidateQueries({ queryKey: ["adminStats"] });
    },
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
    onSuccess: (newId, vars) => {
      // Optimistically add the new tournament to the list immediately
      // so it shows up without waiting for a re-fetch
      qc.setQueryData(["tournaments"], (old: Tournament[] = []) => [
        ...old,
        {
          id: newId,
          status: TournamentStatus.pending,
          name: vars.name,
          description: vars.description,
          has3rdPlaceMatch: vars.has3rdPlaceMatch,
        } as Tournament,
      ]);
      // Also invalidate so the list syncs with the server in the background
      qc.invalidateQueries({ queryKey: ["tournaments"] });
    },
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
      qc.invalidateQueries({ queryKey: ["players", id.toString()] });
      qc.invalidateQueries({ queryKey: ["isJoined", id.toString()] });
      qc.invalidateQueries({ queryKey: ["tournaments"] });
    },
  });
}

export function useWithdrawFromTournament() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (tournamentId: bigint) => {
      if (!actor) throw new Error("Not authenticated");
      return actor.withdrawFromTournament(tournamentId);
    },
    onSuccess: (_d, id) => {
      qc.invalidateQueries({ queryKey: ["players", id.toString()] });
      qc.invalidateQueries({ queryKey: ["isJoined", id.toString()] });
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
      qc.invalidateQueries({
        queryKey: ["players", vars.tournamentId.toString()],
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
      qc.invalidateQueries({
        queryKey: ["tournament", vars.tournamentId.toString()],
      });
      qc.invalidateQueries({ queryKey: ["tournaments"] });
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

export function useKickPlayer() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: { tournamentId: bigint; playerName: string }) => {
      if (!actor) throw new Error("Not authenticated");
      return actor.kickPlayer(data.tournamentId, data.playerName);
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({
        queryKey: ["players", vars.tournamentId.toString()],
      });
    },
  });
}

export function useReorderPlayers() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      tournamentId: bigint;
      orderedNames: string[];
      // Full player objects so we can update the cache immediately
      players: PublicPlayer[];
    }) => {
      if (!actor) throw new Error("Not authenticated");
      return actor.reorderPlayers(data.tournamentId, data.orderedNames);
    },
    onSuccess: (_d, vars) => {
      // Update the cache directly with the new order instead of refetching.
      // A refetch would overwrite local state before the backend confirms the
      // new order, making shuffle/drag appear to revert.
      const playerMap = new Map(vars.players.map((p) => [p.name, p]));
      const reordered = vars.orderedNames
        .map((name) => playerMap.get(name))
        .filter(Boolean) as PublicPlayer[];
      qc.setQueryData(["players", vars.tournamentId.toString()], reordered);
    },
  });
}
