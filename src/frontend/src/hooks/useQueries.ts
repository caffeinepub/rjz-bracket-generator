import type { Principal } from "@icp-sdk/core/principal";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  Match,
  PublicPlayer,
  PublicUserProfile,
  Tournament,
  TournamentResult,
  UserInfo,
  UserProfile,
} from "../backend.d";
import { TournamentStatus } from "../backend.d";
import { useActor } from "./useActor";

type AdminStats = {
  totalTournaments: bigint;
  users: UserInfo[];
  totalUsers: bigint;
};

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
      maxPlayers: bigint;
    }) => {
      if (!actor) throw new Error("Not authenticated");
      return actor.createTournament(
        data.name,
        data.description,
        data.has3rdPlaceMatch,
        data.maxPlayers,
      );
    },
    onSuccess: (newId, vars) => {
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
      return actor.saveCallerUserProfile(profile.name, profile.bio ?? "");
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["userProfile"] });
      qc.invalidateQueries({ queryKey: ["callerTournamentHistory"] });
    },
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

// ─── Check-in hooks ─────────────────────────────────────────────────────────

export function useCheckInStatus(tournamentId: bigint | null) {
  const { actor, isFetching } = useActor();
  return useQuery<Array<[string, boolean]>>({
    queryKey: ["checkInStatus", tournamentId?.toString()],
    queryFn: async () => {
      if (!actor || tournamentId === null) return [];
      try {
        const result = await actor.getTournamentCheckInStatus(tournamentId);
        if (result.__kind__ === "ok") return result.ok;
        return [];
      } catch {
        return [];
      }
    },
    enabled: !!actor && !isFetching && tournamentId !== null,
    refetchInterval: 10_000,
  });
}

export function useIsCheckInOpenQuery(tournamentId: bigint | null) {
  const { actor, isFetching } = useActor();
  return useQuery<boolean>({
    queryKey: ["isCheckInOpen", tournamentId?.toString()],
    queryFn: async () => {
      if (!actor || tournamentId === null) return false;
      try {
        return await actor.isCheckInOpen(tournamentId);
      } catch {
        return false;
      }
    },
    enabled: !!actor && !isFetching && tournamentId !== null,
  });
}

export function useOpenCheckIn() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (tournamentId: bigint) => {
      if (!actor) throw new Error("Not authenticated");
      const result = await actor.openCheckIn(tournamentId);
      if (result.__kind__ === "err") throw new Error(result.err);
    },
    onSuccess: (_d, tournamentId) => {
      qc.invalidateQueries({
        queryKey: ["tournament", tournamentId.toString()],
      });
      qc.invalidateQueries({ queryKey: ["tournaments"] });
      qc.invalidateQueries({
        queryKey: ["checkInStatus", tournamentId.toString()],
      });
      qc.invalidateQueries({
        queryKey: ["isCheckInOpen", tournamentId.toString()],
      });
    },
  });
}

export function useCloseCheckIn() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (tournamentId: bigint) => {
      if (!actor) throw new Error("Not authenticated");
      const result = await actor.closeCheckIn(tournamentId);
      if (result.__kind__ === "err") throw new Error(result.err);
    },
    onSuccess: (_d, tournamentId) => {
      qc.invalidateQueries({
        queryKey: ["tournament", tournamentId.toString()],
      });
      qc.invalidateQueries({ queryKey: ["tournaments"] });
      qc.invalidateQueries({
        queryKey: ["checkInStatus", tournamentId.toString()],
      });
      qc.invalidateQueries({
        queryKey: ["isCheckInOpen", tournamentId.toString()],
      });
    },
  });
}

export function useCheckIn() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (tournamentId: bigint) => {
      if (!actor) throw new Error("Not authenticated");
      const result = await actor.checkIn(tournamentId);
      if (result.__kind__ === "err") throw new Error(result.err);
    },
    onSuccess: (_d, tournamentId) => {
      qc.invalidateQueries({
        queryKey: ["checkInStatus", tournamentId.toString()],
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
      players: PublicPlayer[];
    }) => {
      if (!actor) throw new Error("Not authenticated");
      return actor.reorderPlayers(data.tournamentId, data.orderedNames);
    },
    onSuccess: (_d, vars) => {
      qc.setQueryData(["players", vars.tournamentId.toString()], vars.players);
    },
  });
}

// ─── Profile hooks ───────────────────────────────────────────────────────────

export function useGetUserByUserId(userId: string) {
  // Public query — works for anonymous visitors too. The actor hook returns
  // an anonymous actor when no identity is present, so we only wait for
  // isFetching to settle rather than gating on !!actor.
  const { actor, isFetching } = useActor();
  return useQuery<PublicUserProfile | null>({
    queryKey: ["publicProfile", userId],
    queryFn: async () => {
      if (!userId) return null;
      if (!actor) return null;
      try {
        return await actor.getUserByUserId(userId);
      } catch {
        return null;
      }
    },
    enabled: !isFetching && !!userId,
  });
}

export function useGetUserTournamentHistory(principalText: string) {
  // Public query — works for anonymous visitors too. Same pattern as above.
  const { actor, isFetching } = useActor();
  return useQuery<TournamentResult[]>({
    queryKey: ["tournamentHistory", principalText],
    queryFn: async () => {
      if (!principalText) return [];
      if (!actor) return [];
      try {
        // The backend expects a Principal type; userId IS the principal text
        const { Principal } = await import("@icp-sdk/core/principal");
        const principal = Principal.fromText(principalText);
        return await actor.getUserTournamentHistory(principal);
      } catch {
        return [];
      }
    },
    enabled: !isFetching && !!principalText,
  });
}

export function useGetCallerTournamentHistory() {
  const { actor, isFetching } = useActor();
  return useQuery<TournamentResult[]>({
    queryKey: ["callerTournamentHistory"],
    queryFn: async () => {
      if (!actor) return [];
      try {
        return await actor.getCallerTournamentHistory();
      } catch {
        return [];
      }
    },
    enabled: !!actor && !isFetching,
  });
}
