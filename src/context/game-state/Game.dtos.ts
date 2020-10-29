import uid from "uid";
import { Host } from "./Host";
import { Player } from "./Player";
import { GameState } from "./State";

export interface DtoBase {
  id: string;
  replyTo?: string;
}

export interface RequestToJoinDto extends DtoBase {
  type: "request-to-join-dto";
  payload: {
    player: Pick<Player, "uid" | "name">;
  };
}

export interface RequestToJoinResponseDto extends DtoBase {
  type: "request-to-join-response-dto";
  payload:
    | {
        type: "accepted";
        state: GameState;
        host: Pick<Host, "uid" | "name">;
      }
    | {
        type: "rejected";
        reason: string;
      };
}

export interface SyncGameStateDto extends DtoBase {
  type: "sync-game-state";
  payload: GameState;
}

export type GameDto =
  | RequestToJoinDto
  | RequestToJoinResponseDto
  | SyncGameStateDto;

export function createDto(dto: Omit<GameDto, "id">): GameDto {
  return {
    id: uid(),
    ...dto,
  } as GameDto;
}

export function isGameDto(data: any): data is GameDto {
  return "id" in data && "type" in data;
}
