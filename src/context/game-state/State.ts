import { Card } from "./Card";

export interface PlayerState {
  uid: string;
  name: string;
  cardsInDeck: number;
  online: boolean;
}

export interface ConnectingGameState {
  status: "connecting";
}

export interface WaitingGameState {
  status: "waiting";
  players: PlayerState[];
}

export interface PlayingGameState {
  status: "playing";
  turnIndex: number;
  canGrabCards: boolean;
  cardsInPlay: Card[];
  players: PlayerState[];
}

export interface FinishedGameState {
  status: "finished";
  winner: PlayerState;
}

export interface CannotJoinGameState {
  status: "cannot-join";
  reason: string;
}

export type GameState =
  | WaitingGameState
  | PlayingGameState
  | FinishedGameState
  | CannotJoinGameState
  | ConnectingGameState;

export const initialGameState: GameState = {
  status: "connecting",
};
