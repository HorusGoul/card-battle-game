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
import { GameState, initialGameState, PlayerState } from "./State";

const HOST_PREFIX = "host" as const;

export interface RPCOptions {
  waitForReply?: boolean;
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
  state: GameState = initialGameState;

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
    {
      waitForReply = true,
      timeoutMs = 5000,
      closeOnTimeout = false,
    }: RPCOptions
  ): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const timeout = setTimeout(() => {
        if (timeoutMs === 0 || !waitForReply) {
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

      if (waitForReply) {
        connection.on("data", onData);
        connection.on("close", onClose);
        connection.on("error", onClose);
      }

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
  protected notifySubscriptions() {
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
  protected onPeerOpen(id: string) {
    super.onPeerOpen(id);

    this.createNewState("waiting");
  }

  @boundMethod
  protected onPeerConnection(connection: DataConnection) {
    super.onPeerConnection(connection);

    this.joinFlow(connection);
  }

  @boundMethod
  private async joinFlow(connection: DataConnection) {
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

      const newPlayer = new ServerPlayer({
        uid: player.uid,
        name: player.name,
        game: this,
        connection,
      });

      this.players.push(newPlayer);

      connection.send(
        createDto({
          replyTo: requestToJoinDto.id,
          type: "request-to-join-response-dto",
          payload: {
            type: "accepted",
            state: this.createNewState("waiting"),
            host: {
              uid: this.hostUid,
              name: "TBD",
            },
          },
        })
      );

      this.log(`Player ${player.name} (${player.uid}) joined the game!`);
    } catch (e) {
      this.error(e.message);
    }
  }

  @boundMethod
  private createNewState(status: GameState["status"]): GameState {
    const players: PlayerState[] = this.players.map((player) => ({
      uid: player.uid,
      name: player.name,
      cardsInDeck: player.hand?.count ?? 0,
    }));

    let state: GameState;

    switch (status) {
      case "connecting":
        state = {
          status,
        };
        break;
      case "cannot-join":
        state = {
          status,
          reason: "Unknown reason",
        };
        break;
      case "waiting":
        state = {
          status,
          players,
        };
        break;
      case "playing":
        state = {
          status,
          players,
          currentTurn: "TBD",
          canGrabCards: false,
          cardsInPlay: [],
        };
        break;
      case "finished":
        state = {
          status,
          winner: players.find(
            (player) => player.cardsInDeck === 52
          ) as PlayerState,
        };
        break;
    }

    this.state = state;

    this.broadcast(
      createDto({
        type: "sync-game-state",
        payload: state,
      })
    );

    this.notifySubscriptions();

    return state;
  }
  private broadcast(dto: GameDto) {
    for (const player of this.players) {
      player.connection?.send(dto);
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
    try {
      const connection = this.peer.connect(`${HOST_PREFIX}${this.hostUid}`, {
        reliable: true,
      });

      await this.connectOrFail(connection);

      this.log("Connected to Host with id", connection.peer);

      await this.requestToJoinGame(connection);

      this.setupHostEvents();

      this.log(`✅ Connection to Host (${connection.peer}) successful`);
    } catch (e) {
      this.setState({
        status: "cannot-join",
        reason: e.message,
      });
    }
  }

  private async connectOrFail(connection: DataConnection) {
    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        connection.close();
        reject(
          new Error(`Cannot connect to the Host with id ${connection.peer}`)
        );
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

      const { host, state } = response.payload;

      this.log(`✅ Succesfully joined game`);

      this.host = new Host({
        uid: host.uid,
        name: host.name,
        connection,
        game: this,
      });

      this.setState(state);
    } catch (e) {
      this.error(e.message);
    }
  }

  @boundMethod
  private setupHostEvents() {
    if (!this.host) {
      return;
    }

    this.host.connection.on("data", this.onHostData);
    this.host.connection.on("error", this.onHostError);
    this.host.connection.on("close", this.onHostClose);
  }

  @boundMethod
  private onHostData(data: unknown) {
    if (!this.host) {
      return;
    }

    if (!isGameDto(data)) {
      this.log("🔽", "Unknown received message");

      return;
    }

    this.log("🔽", "Message received.", "Type:", data.type, "Content:", data);

    switch (data.type) {
      case "sync-game-state":
        this.setState(data.payload);
        return;
    }
  }

  @boundMethod
  private onHostError(error: unknown) {
    if (!this.host) {
      return;
    }

    this.error(
      `An error happened in the connection between this client and the Host (${this.host.uid})`
    );
  }

  @boundMethod
  private onHostClose() {
    if (!this.host) {
      return;
    }

    this.error(`Connection with Host (${this.host.uid}) lost`);
  }

  private setState(newState: GameState) {
    this.state = newState;

    this.notifySubscriptions();
  }
}
