import { boundMethod } from "autobind-decorator";
import { DataConnection } from "peerjs";
import { Deck } from "./Deck";
import { Game, GameHost, RPCOptions } from "./Game";
import { GameDto, isGameDto } from "./Game.dtos";

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
  game: GameHost;
}

export class ServerPlayer extends Player {
  game: GameHost;
  connection: DataConnection;
  online = false;

  constructor({ connection, ...params }: ServerPlayerConstructorParams) {
    super(params);

    this.connection = connection;
    this.game = params.game;
    this.setup();
  }

  @boundMethod
  setup() {
    this.connection.on("data", this.onPlayerData);
    this.connection.on("close", this.onPlayerClose);
    this.connection.on("error", this.onPlayerError);
  }

  @boundMethod
  cleanup() {
    this.connection.off("data", this.onPlayerData);
    this.connection.off("close", this.onPlayerClose);
    this.connection.off("error", this.onPlayerError);
  }

  request<T extends GameDto>(
    dto: GameDto,
    options: RPCOptions = {}
  ): Promise<T> {
    return this.game.rpcCall<T>(dto, this.connection, options);
  }

  waitForMessageOfType<T extends GameDto>(
    type: GameDto["type"],
    options: RPCOptions = {}
  ): Promise<T> {
    return this.game.waitForMessageOfType<T>(type, this.connection, options);
  }

  @boundMethod
  private onPlayerData(data: unknown) {
    if (!isGameDto(data)) {
      this.game.log("🔽", "Unknown received message");

      return;
    }

    switch (data.type) {
      case "grab-cards":
        this.game.grabCards(this);
        return;
    }

    this.game.log(
      "🔽",
      "Message received.",
      "Type:",
      data.type,
      "Content:",
      data
    );
  }

  @boundMethod
  private onPlayerClose() {
    this.online = false;

    this.game.error(`Connection with Player ${this.name} (${this.uid}) lost`);
  }

  @boundMethod
  private onPlayerError(error: unknown) {
    this.game.error(
      `An error happened in the connection with the Player ${this.name} (${this.uid})`,
      error
    );
  }
}
