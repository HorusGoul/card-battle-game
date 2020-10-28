import Peer, { DataConnection } from "peerjs";
import { Deck } from "./Deck";
import { Game } from "./Game";

export interface PlayerConstructorParams {
  uid: string;
  name: string;
  game: Game;
  hand?: Deck | null;
}

export class Player {
  uid: string;
  name: string;
  game: Game;
  hand: Deck | null;
  connection: DataConnection | null = null;

  constructor({ uid, name, game, hand = null }: PlayerConstructorParams) {
    this.uid = uid;
    this.name = name;
    this.game = game;
    this.hand = hand;
  }

  get isHost() {
    return false;
  }
}
