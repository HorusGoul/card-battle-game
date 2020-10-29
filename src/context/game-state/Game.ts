import { createGameDeck, Deck } from "./Deck";
import { Player, ServerPlayer } from "./Player";
import { boundMethod } from "autobind-decorator";
import Peer, { DataConnection } from "peerjs";
import {
  createDto,
  GameDto,
  isGameDto,
  RequestToJoinDto,
  RequestToJoinResponseDto,
} from "./Game.dtos";
import { Host } from "./Host";

const HOST_PREFIX = "host" as const;

export interface RPCOptions {
  timeoutMs?: number;
  closeOnTimeout?: boolean;
}

export interface GameConstructorParams {
  hostUid: Player["uid"];
  peerId?: string;
}

export abstract class Game {
  abstract type: "host" | "guest";
  deck: Deck = createGameDeck();
  players: Player[] = [];
  online = false;
  hostUid: Player["uid"];
  peer: Peer;

  private updateSubscriptions: ((game: Game) => void)[] = [];

  constructor({ hostUid, peerId = hostUid }: GameConstructorParams) {
    this.hostUid = hostUid;

    this.peer = new Peer(peerId, {
      host: "card-battle-game-peerjs-server.herokuapp.com",
      port: 80,
    });

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

  async rpcCall<T extends GameDto>(
    dto: GameDto,
    connection: DataConnection,
    { timeoutMs = 5000, closeOnTimeout = false }: RPCOptions
  ): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const timeout = setTimeout(() => {
        if (timeoutMs === 0) {
          return;
        }

        if (closeOnTimeout) {
          connection.close();
        }

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

  async waitForMessageOfType<T extends GameDto>(
    type: T["type"],
    connection: DataConnection,
    { timeoutMs = 5000, closeOnTimeout = false }: RPCOptions
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        if (timeoutMs === 0) {
          return;
        }

        if (closeOnTimeout) {
          connection.close();
        }

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
  protected setup(): void {
    this.peer.on("open", this.onPeerOpen);
    this.peer.on("disconnected", this.onPeerDisconnected);
    this.peer.on("connection", this.onPeerConnection);
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

    console.log(
      `%c${onlineStatus} [${this.constructor.name}]`,
      "color: blue;",
      ...params
    );
  }

  @boundMethod
  protected error(...params: any[]) {
    const onlineStatus = this.online ? `🟢` : `🔴`;

    console.error(
      `%c${onlineStatus} [${this.constructor.name}]`,
      "color: red;",
      ...params
    );
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

  constructor({ hostUid }: GameConstructorParams) {
    super({ hostUid, peerId: `${HOST_PREFIX}${hostUid}` });
  }

  @boundMethod
  protected onPeerConnection(connection: DataConnection) {
    super.onPeerConnection(connection);

    this.joinFlow(connection);
  }

  @boundMethod
  protected async joinFlow(connection: DataConnection) {
    try {
      this.log("Waiting for a Request to Join from", connection.peer);

      const requestToJoinDto = await this.waitForMessageOfType<
        RequestToJoinDto
      >("request-to-join-dto", connection, { closeOnTimeout: true });

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
            state: {},
          },
        })
      );

      const newPlayer = new ServerPlayer({
        uid: player.uid,
        name: player.name,
        game: this,
        connection,
      });

      this.players.push(newPlayer);

      this.log(`Player ${player.name} (${player.uid}) joined the game!`);
    } catch (e) {
      this.error(e.message);
    }
  }
}

export interface GuestGameConstructorParams extends GameConstructorParams {
  player: Pick<Player, "uid" | "name">;
}

export class GameGuest extends Game {
  type = "guest" as const;
  host: Host | null = null;
  player: Player;

  constructor({ player, hostUid }: GuestGameConstructorParams) {
    super({ hostUid, peerId: player.uid });

    this.player = new Player({ ...player, game: this });
  }

  @boundMethod
  protected onPeerOpen(id: string) {
    super.onPeerOpen(id);

    this.connectToHost();
  }

  private async connectToHost() {
    const connection = this.peer.connect(`${HOST_PREFIX}${this.hostUid}`, {
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

  @boundMethod
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
        connection,
        {
          closeOnTimeout: true,
        }
      );

      if (response.payload.type === "rejected") {
        connection.close();
        return;
      }

      this.log(`Succesfully joined game`);

      this.host = new Host({
        uid: connection.peer,
        name: "Host",
        connection,
        game: this,
      });
    } catch (e) {
      this.error(e.message);
    }
  }
}
