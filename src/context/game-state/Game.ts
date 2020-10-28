import { createGameDeck, Deck } from "./Deck";
import { Player } from "./Player";
import { boundMethod } from "autobind-decorator";
import { DataConnection } from "peerjs";
import {
  createDto,
  GameDto,
  isGameDto,
  RequestToJoinDto,
  RequestToJoinResponseDto,
} from "./Game.dtos";

export interface GameConstructorParams {
  player: Pick<Player, "uid" | "name">;
  hostUid: Player["uid"];
}

export abstract class Game {
  abstract type: "host" | "guest";
  deck: Deck = createGameDeck();
  abstract host: Player | null;
  player: Player;
  players: Player[] = [];
  online = false;
  hostUid: Player["uid"];

  private updateSubscriptions: ((game: Game) => void)[] = [];

  constructor({ player, hostUid }: GameConstructorParams) {
    this.hostUid = hostUid;

    this.player = new Player({
      ...player,
      game: this,
    });

    this.players = [this.player];

    this.setup();
  }

  subscribeToUpdates(subscription: (game: Game) => void) {
    this.updateSubscriptions.push(subscription);

    // Let's return a function that allows subscriptions
    // to be cancelled
    return () => {
      this.updateSubscriptions = this.updateSubscriptions.filter(
        (current) => current !== subscription
      );
    };
  }

  @boundMethod
  protected setup(): void {
    this.player.peer.on("open", this.onPeerOpen);
    this.player.peer.on("disconnected", this.onPeerDisconnected);
    this.player.peer.on("connection", this.onPeerConnection);
  }

  @boundMethod
  protected onPeerOpen(id: string) {
    this.online = true;

    this.log("Online", "ID:", id);
    this.notifySubscriptions();
  }

  @boundMethod
  protected onPeerDisconnected() {
    this.online = false;

    this.log("Offline");
    this.notifySubscriptions();
  }

  @boundMethod
  protected onPeerConnection(connection: DataConnection) {
    this.log("Peer connected with ID", connection.peer);
  }

  @boundMethod
  protected log(...params: any[]) {
    const onlineStatus = this.online ? `🟢` : `🔴`;

    console.log(`%c${onlineStatus} [Game]`, "color: blue;", ...params);
  }

  @boundMethod
  protected error(...params: any[]) {
    const onlineStatus = this.online ? `🟢` : `🔴`;

    console.error(`%c${onlineStatus} [Game]`, "color: red;", ...params);
  }

  protected async rpcCall<T extends GameDto>(
    dto: GameDto,
    connection: DataConnection,
    timeoutMs = 5000
  ): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const timeout = setTimeout(() => {
        connection.close();
        reject(new Error(`Connection with ${connection.peer} timed out`));
      }, timeoutMs);

      function onClose() {
        offEvents();
        reject(new Error(`Connection with ${connection.peer} closed`));
      }

      function onError(error: any) {
        offEvents();
        reject(error);
      }

      function onData(data: unknown) {
        if (!isGameDto(data)) {
          return;
        }

        if (data.replyTo !== dto.id) {
          return;
        }

        offEvents();
        resolve(data as T);
      }

      function offEvents() {
        connection.off("data", onData);
        connection.off("error", onError);
        connection.off("close", onClose);
        clearTimeout(timeout);
      }

      connection.on("data", onData);
      connection.on("close", onClose);
      connection.on("error", onClose);

      connection.send(dto);
    });
  }

  protected async waitForMessageOfType<T extends GameDto>(
    type: T["type"],
    connection: DataConnection,
    timeoutMs = 5000
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        connection.close();
        reject(new Error(`Connection with ${connection.peer} timed out`));
      }, timeoutMs);

      function onClose() {
        offEvents();
        reject(new Error(`Connection with ${connection.peer} closed`));
      }

      function onError(error: any) {
        offEvents();
        reject(error);
      }

      function onData(data: unknown) {
        if (!isGameDto(data)) {
          return;
        }

        if (data.type !== type) {
          return;
        }

        offEvents();
        resolve(data as T);
      }

      function offEvents() {
        connection.off("data", onData);
        connection.off("error", onError);
        connection.off("close", onClose);
        clearTimeout(timeout);
      }

      connection.on("data", onData);
      connection.on("close", onClose);
      connection.on("error", onClose);
    });
  }

  @boundMethod
  private notifySubscriptions() {
    for (const subscription of this.updateSubscriptions) {
      subscription(this);
    }
  }
}

export class GameHost extends Game {
  type = "host" as const;
  host: Player;

  constructor(params: GameConstructorParams) {
    super(params);

    this.host = this.player;
  }

  @boundMethod
  protected onPeerConnection(connection: DataConnection) {
    super.onPeerConnection(connection);

    this.waitForJoinRequest(connection);
  }

  @boundMethod
  protected async waitForJoinRequest(connection: DataConnection) {
    try {
      this.log("Waiting for a Request to Join from", connection.peer);

      const requestToJoinDto = await this.waitForMessageOfType<
        RequestToJoinDto
      >("request-to-join-dto", connection);

      const { player } = requestToJoinDto.payload;

      const alreadyInRoom = this.players.find(
        (playerItem) =>
          playerItem.uid === player.uid || playerItem.name === player.name
      );

      if (alreadyInRoom) {
        const reason = `A player with the same name or UID exists in the room.`;

        connection.send(
          createDto({
            replyTo: requestToJoinDto.id,
            type: "request-to-join-response-dto",
            payload: {
              type: "rejected",
              reason,
            },
          })
        );

        this.log(
          `Request to Join rejected to ${player.uid}. Reason: ${reason}`
        );

        return;
      }

      connection.send(
        createDto({
          replyTo: requestToJoinDto.id,
          type: "request-to-join-response-dto",
          payload: {
            type: "accepted",
            host: {
              name: this.host.name,
              uid: this.host.uid,
            },
          },
        })
      );

      this.log(`Player ${player.name} (${player.uid}) joined the game!`);
    } catch (e) {
      this.error(e.message);
    }
  }
}

export class GameGuest extends Game {
  type = "guest" as const;
  host = null;

  @boundMethod
  protected onPeerOpen(id: string) {
    super.onPeerOpen(id);

    this.connectToHost();
  }

  private async connectToHost() {
    const connection = this.player.peer.connect(this.hostUid, {
      reliable: true,
    });

    await this.connectOrFail(connection)
      .catch(() =>
        this.error("Cannot connect to the Host with id", connection.peer)
      )
      .then(() => this.log("Connected to Host with id", connection.peer));

    await this.requestToJoinGame(connection);
  }

  private async connectOrFail(connection: DataConnection) {
    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        connection.close();
        reject();
      }, 5000);

      connection.on("open", () => {
        clearTimeout(timeout);
        resolve();
      });
    });
  }

  private async requestToJoinGame(connection: DataConnection) {
    try {
      const response = await this.rpcCall<RequestToJoinResponseDto>(
        createDto({
          type: "request-to-join-dto",
          payload: {
            player: {
              uid: this.player.uid,
              name: this.player.name,
            },
          },
        }),
        connection
      );

      if (response.payload.type === "rejected") {
        connection.close();
        return;
      }

      const { host } = response.payload;

      this.log(`Succesfully joined ${host.name} (${host.uid}) game`);

      // TODO: set host connection
    } catch (e) {
      this.error(e.message);
    }
  }
}
