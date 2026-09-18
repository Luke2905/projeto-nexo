import { getDb } from "./connection";
import { changeConnection, connectionsFor, mapLeaderboard } from "./nexomap";

export async function getLeaderboard() {
  if (!(await getDb())) return [];
  return (await mapLeaderboard()).rows.map(p => ({
    ...p,
    games: p.solved,
    bestRank: p.solved ? 1 : 0,
  }));
}
export async function getFriends(userId: number) {
  return (await connectionsFor(userId)).friends;
}
export async function addFriend(userId: number, friendUserId: number) {
  return changeConnection(userId, friendUserId, "request");
}
