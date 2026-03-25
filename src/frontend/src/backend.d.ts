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
export interface Tournament {
    id: bigint;
    status: TournamentStatus;
    has3rdPlaceMatch: boolean;
    name: string;
    description: string;
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
export interface UserProfile {
    name: string;
    rjzProfileLink: string;
}
export interface UserInfo {
    principal: Principal;
    name: string;
    tournamentCount: bigint;
    isBanned: boolean;
}
export interface AdminStats {
    totalUsers: bigint;
    totalTournaments: bigint;
    users: Array<UserInfo>;
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
export enum UserRole {
    admin = "admin",
    user = "user",
    guest = "guest"
}
export interface backendInterface {
    addGuestPlayer(tournamentId: bigint, name: string): Promise<void>;
    assignCallerUserRole(user: Principal, role: UserRole): Promise<void>;
    banUser(user: Principal): Promise<void>;
    unbanUser(user: Principal): Promise<void>;
    claimAdminByToken(token: string): Promise<boolean>;
    createTournament(name: string, description: string, has3rdPlaceMatch: boolean): Promise<bigint>;
    deleteTournament(tournamentId: bigint): Promise<void>;
    getAdminStats(): Promise<AdminStats>;
    getAllTournaments(): Promise<Array<Tournament>>;
    getBracketMatches(tournamentId: bigint): Promise<Array<Match>>;
    getCallerUserProfile(): Promise<UserProfile | null>;
    getCallerUserRole(): Promise<UserRole>;
    getTournament(tournamentId: bigint): Promise<Tournament | null>;
    getTournamentPlayers(tournamentId: bigint): Promise<Array<PublicPlayer>>;
    getUserProfile(user: Principal): Promise<UserProfile | null>;
    isCallerAdmin(): Promise<boolean>;
    isCallerJoinedTournament(tournamentId: bigint): Promise<boolean>;
    isCallerTournamentCreator(tournamentId: bigint): Promise<boolean>;
    joinTournament(tournamentId: bigint): Promise<void>;
    kickPlayer(tournamentId: bigint, playerName: string): Promise<void>;
    reorderPlayers(tournamentId: bigint, orderedNames: Array<string>): Promise<void>;
    reportMatch(tournamentId: bigint, round: bigint, slot: bigint, score1: bigint, score2: bigint, winnerId: Principal | null): Promise<void>;
    saveCallerUserProfile(profile: UserProfile): Promise<void>;
    startTournament(tournamentId: bigint): Promise<void>;
    withdrawFromTournament(tournamentId: bigint): Promise<void>;
}
