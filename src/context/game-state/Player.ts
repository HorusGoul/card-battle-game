import { DataConnection } from "peerjs";
import { Deck } from "./Deck";
import { Game, RPCOptions } from "./Game";
import { GameDto } from "./Game.dtos";

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

export interface ServerPlayerConstructorParams extends PlayerConstructorParams {
  connection: DataConnection;
}

export class ServerPlayer extends Player {
  connection: DataConnection;
  online = false;

  constructor({ connection, ...params }: ServerPlayerConstructorParams) {
    super(params);

    this.connection = connection;
  }

  public request<T extends GameDto>(
    dto: GameDto,
    options: RPCOptions = {}
  ): Promise<T> {
    return this.game.rpcCall<T>(dto, this.connection, options);
  }

  public waitForMessageOfType<T extends GameDto>(
    type: GameDto["type"],
    options: RPCOptions = {}
  ): Promise<T> {
    return this.game.waitForMessageOfType<T>(type, this.connection, options);
  }
}
