import uid from "uid";
import { Player } from "./Player";

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

        // TODO: define game state
        state: any;
      }
    | {
        type: "rejected";
        reason: string;
      };
}

export type GameDto = RequestToJoinDto | RequestToJoinResponseDto;

export function createDto(dto: Omit<GameDto, "id">): GameDto {
  return {
    id: uid(),
    ...dto,
  } as GameDto;
}

export function isGameDto(data: any): data is GameDto {
  return "id" in data && "type" in data;
}
