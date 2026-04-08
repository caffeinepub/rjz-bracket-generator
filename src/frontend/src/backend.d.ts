import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export interface PublicPlayer {
    isGuest: boolean;
    name: string;
}
export interface PublicUserProfile {
    bio: string;
    userId: string;
    goldTrophies: bigint;
    name: string;
    silverTrophies: bigint;
    bronzeTrophies: bigint;
}
export interface Tournament {
    id: bigint;
    status: TournamentStatus;
    has3rdPlaceMatch: boolean;
    game: string;
    name: string;
    description: string;
    isCheckInOpen: boolean;
    maxPlayers?: bigint;
}
export interface TournamentResult {
    placedGold: boolean;
    eliminatedAtStage: string;
    tournamentName: string;
    placedSilver: boolean;
    placedBronze: boolean;
    eliminatedByName: string;
    tournamentId: bigint;
}
export interface Match {
    status: MatchStatus;
    winnerId?: Principal;
    score1: bigint;
    score2: bigint;
    slot: bigint;
    player2Name: string;
    player1Name: string;
    round: bigint;
}
export interface UserInfo {
    principal: Principal;
    name: string;
    isBanned: boolean;
    tournamentCount: bigint;
}
export interface UserProfile {
    bio: string;
    userId: string;
    name: string;
    rjzProfileLink: string;
}
export enum MatchStatus {
    scheduled = "scheduled",
    completed = "completed"
}
export enum TournamentStatus {
    active = "active",
    pending = "pending",
    completed = "completed"
}
export interface backendInterface {
    addGuestPlayer(tournamentId: bigint, name: string): Promise<void>;
    banUser(user: Principal): Promise<void>;
    /**
     * / Player checks in to a tournament. Must be a registered player in this tournament.
     */
    checkIn(tournamentId: bigint): Promise<{
        __kind__: "ok";
        ok: null;
    } | {
        __kind__: "err";
        err: string;
    }>;
    /**
     * / Close check-in for a tournament. Only tournament creator or admin.
     */
    closeCheckIn(tournamentId: bigint): Promise<{
        __kind__: "ok";
        ok: null;
    } | {
        __kind__: "err";
        err: string;
    }>;
    createTournament(name: string, description: string, has3rdPlaceMatch: boolean, maxPlayers: bigint): Promise<bigint>;
    deleteTournament(tournamentId: bigint): Promise<void>;
    getAdminStats(): Promise<{
        totalTournaments: bigint;
        users: Array<UserInfo>;
        totalUsers: bigint;
    }>;
    getAllTournaments(): Promise<Array<Tournament>>;
    getBracketMatches(tournamentId: bigint): Promise<Array<Match>>;
    /**
     * / Get tournament history for the caller. Most recent first.
     */
    getCallerTournamentHistory(): Promise<Array<TournamentResult>>;
    getCallerUserProfile(): Promise<UserProfile | null>;
    getTournament(tournamentId: bigint): Promise<Tournament | null>;
    /**
     * / Get check-in status for all players in a tournament. Public query.
     * / Returns [(playerDisplayName, hasCheckedIn)] for registered players.
     */
    getTournamentCheckInStatus(tournamentId: bigint): Promise<{
        __kind__: "ok";
        ok: Array<[string, boolean]>;
    } | {
        __kind__: "err";
        err: string;
    }>;
    getTournamentPlayers(tournamentId: bigint): Promise<Array<PublicPlayer>>;
    /**
     * / Look up a public profile by unique userId. No auth required.
     */
    getUserByUserId(userId: string): Promise<PublicUserProfile | null>;
    getUserProfile(user: Principal): Promise<UserProfile | null>;
    /**
     * / Get tournament history for any user by principal. No auth required.
     */
    getUserTournamentHistory(user: Principal): Promise<Array<TournamentResult>>;
    initialize(_token: string): Promise<boolean>;
    isCallerAdmin(): Promise<boolean>;
    isCallerJoinedTournament(tournamentId: bigint): Promise<boolean>;
    isCallerTournamentCreator(tournamentId: bigint): Promise<boolean>;
    /**
     * / Check whether check-in is open for a tournament. Public query.
     */
    isCheckInOpen(tournamentId: bigint): Promise<boolean>;
    joinTournament(tournamentId: bigint): Promise<void>;
    kickPlayer(tournamentId: bigint, playerName: string): Promise<void>;
    /**
     * / Open check-in for a tournament. Only tournament creator or admin.
     * / Initializes all current registered players as not checked in.
     */
    openCheckIn(tournamentId: bigint): Promise<{
        __kind__: "ok";
        ok: null;
    } | {
        __kind__: "err";
        err: string;
    }>;
    reorderPlayers(tournamentId: bigint, orderedNames: Array<string>): Promise<void>;
    reportMatch(tournamentId: bigint, round: bigint, slot: bigint, score1: bigint, score2: bigint, winnerId: Principal | null): Promise<void>;
    saveCallerUserProfile(name: string, bio: string): Promise<void>;
    startTournament(tournamentId: bigint): Promise<void>;
    unbanUser(user: Principal): Promise<void>;
    withdrawFromTournament(tournamentId: bigint): Promise<void>;
}
