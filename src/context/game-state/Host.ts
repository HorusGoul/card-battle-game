import { DataConnection } from "skyway-js";
import { Game, RPCOptions } from "./Game";
import { GameDto } from "./Game.dtos";

export interface HostConstructorParams {
  uid: string;
  name: string;
  connection: DataConnection;
  game: Game;
}

export class Host {
  uid: string;
  name: string;
  connection: DataConnection;
  game: Game;

  constructor({ uid, name, connection, game }: HostConstructorParams) {
    this.uid = uid;
    this.name = name;
    this.connection = connection;
    this.game = game;
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
