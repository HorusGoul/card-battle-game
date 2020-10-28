import Peer from "peerjs";
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
  connection: Peer;

  constructor({ uid, name, game, hand = null }: PlayerConstructorParams) {
    this.uid = uid;
    this.name = name;
    this.game = game;
    this.hand = hand;
    this.connection = new Peer(this.uid, {
      host: "card-battle-game-peerjs-server.herokuapp.com",
      port: 80,
    });
  }

  get isHost() {
    return this === this.game.host;
  }
}
