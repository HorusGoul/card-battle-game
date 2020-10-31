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
import {
  GameState,
  initialGameState,
  PlayerState,
  PlayingGameState,
} from "./State";
import { Card } from "./Card";

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
      port: 443,
      secure: true,
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
  log(...params: any[]) {
    const onlineStatus = this.online ? `🟢` : `🔴`;

    console.log(
      `%c${onlineStatus} [${this.constructor.name}]`,
      "color: blue;",
      ...params
    );
  }

  @boundMethod
  error(...params: any[]) {
    const onlineStatus = this.online ? `🟢` : `🔴`;

    console.error(
      `%c${onlineStatus} [${this.constructor.name}]`,
      "color: red;",
      ...params
    );
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
  protected notifySubscriptions() {
    for (const subscription of this.updateSubscriptions) {
      subscription(this);
    }
  }
}

export class GameHost extends Game {
  type = "host" as const;
  turnIndex = -1;
  cardsInPlay: Card[] = [];
  cardsToPlay = 1;
  roundWinner: ServerPlayer | null = null;
  lastRoundWinner: ServerPlayer | null = null;
  lastRoundWinnerReason: PlayingGameState["lastRoundWinnerReason"] = null;
  roundNumber = 0;

  get turnPlayer() {
    return this.players[this.turnIndex] as ServerPlayer;
  }

  get canGrabCards() {
    if (this.cardsInPlay.length < 2) {
      return false;
    }

    const firstCard = this.cardsInPlay[0];
    const secondCard = this.cardsInPlay[1];

    if (firstCard.value === secondCard.value) {
      return true;
    }

    return false;
  }

  constructor({ hostUid }: GameConstructorParams) {
    super({ hostUid, peerId: `${HOST_PREFIX}${hostUid}` });
  }

  @boundMethod
  startGame() {
    // TODO: maybe we should add a intermediate state
    // to make a shuffle and card distribution animation

    this.deck = createGameDeck().shuffle();

    const initialHands = this.deck.split(this.players.length);

    for (const player of this.players) {
      player.hand = initialHands.shift() ?? null;
    }

    this.nextTurn();
  }

  @boundMethod
  grabCards(player: ServerPlayer) {
    if (!this.canGrabCards) {
      return;
    }

    this.winRound(player, "pair");
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

      newPlayer.online = true;

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
    const players: PlayerState[] = (this.players as ServerPlayer[]).map(
      (player) => ({
        uid: player.uid,
        name: player.name,
        cardsInDeck: player.hand?.count ?? 0,
        online: player.online,
      })
    );

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
          turnIndex: this.turnIndex,
          canGrabCards: this.canGrabCards,
          cardsToPlay: this.cardsToPlay,
          cardsInPlay: this.cardsInPlay,
          lastRoundWinner:
            players.find(
              (player) => player.uid === this.lastRoundWinner?.uid
            ) ?? null,
          lastRoundWinnerReason: this.lastRoundWinnerReason,
          round: this.roundNumber,
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

  @boundMethod
  private broadcast(dto: GameDto) {
    for (const player of this.players) {
      player.connection?.send(dto);
    }
  }

  @boundMethod
  private nextTurn() {
    if (this.turnIndex === -1) {
      this.turnIndex = Math.floor(Math.random() * this.players.length);
    } else {
      // Cleanup events from previous turn
      this.turnPlayer.connection?.off("data", this.onTurnPlayerData);
      this.turnPlayer.connection?.off("close", this.onTurnPlayerClose);
      this.turnPlayer.connection?.off("error", this.onTurnPlayerError);

      // Move to the next turn
      this.turnIndex = (this.turnIndex + 1) % this.players.length;
    }

    // Setup current player events
    this.turnPlayer.connection?.on("data", this.onTurnPlayerData);
    this.turnPlayer.connection?.on("close", this.onTurnPlayerClose);
    this.turnPlayer.connection?.on("error", this.onTurnPlayerError);

    if (!this.turnPlayer.online) {
      // TODO: In case of disconnection, we should automate the
      // gameplay with some exceptions like the bot player
      // not being able to grab the cards.

      // Skip turn if the player is offline
      this.nextTurn();

      return;
    }

    this.createNewState("playing");
  }

  @boundMethod
  private onTurnPlayerData(data: unknown) {
    if (!isGameDto(data)) {
      this.log("🔽", "Unknown received message");

      return;
    }

    switch (data.type) {
      case "play-card":
        this.playCard();
        return;
    }

    this.log("🔽", "Message received.", "Type:", data.type, "Content:", data);
  }

  @boundMethod
  private onTurnPlayerClose() {
    this.turnPlayer.online = false;

    this.error(
      `Connection with Player ${this.turnPlayer.name} (${this.turnPlayer.uid}) lost`
    );

    this.nextTurn();
  }

  @boundMethod
  private onTurnPlayerError(error: unknown) {
    this.error(
      `An error happened in the connection with the Player ${this.turnPlayer.name} (${this.turnPlayer.uid})`,
      error
    );
  }

  @boundMethod
  private async playCard() {
    const card = this.turnPlayer.hand?.pickCard();

    if (!card) {
      return;
    }

    this.cardsInPlay.unshift(card);

    switch (card.type) {
      case "jack":
        this.cardsToPlay = 1;
        this.roundWinner = this.turnPlayer;
        this.nextTurn();
        return;
      case "queen":
        this.cardsToPlay = 2;
        this.roundWinner = this.turnPlayer;
        this.nextTurn();
        return;
      case "king":
        this.cardsToPlay = 3;
        this.roundWinner = this.turnPlayer;
        this.nextTurn();
        return;
      case "ace":
        this.cardsToPlay = 4;
        this.roundWinner = this.turnPlayer;
        this.nextTurn();
        return;
      case "common":
        this.cardsToPlay--;

        this.createNewState("playing");

        if (this.cardsToPlay === 0 || this.turnPlayer.hand?.count === 0) {
          if (this.roundWinner) {
            // End of round
            this.winRound(this.roundWinner);
            return;
          }

          this.cardsToPlay = 1;
          this.nextTurn();
          return;
        }

        return;
    }
  }

  private winRound(
    player: ServerPlayer,
    reason: PlayingGameState["lastRoundWinnerReason"] = "cards"
  ) {
    player.hand?.addCardsToBottom(...this.cardsInPlay);
    this.cardsInPlay = [];
    this.lastRoundWinner = player;
    this.lastRoundWinnerReason = reason;
    this.roundWinner = null;
    this.roundNumber++;
    this.cardsToPlay = 1;
    this.nextTurn();
  }
}

export interface GuestGameConstructorParams extends GameConstructorParams {
  player: Pick<Player, "uid" | "name">;
}

export class GameGuest extends Game {
  type = "guest" as const;
  host: Host | null = null;
  player: Player;

  get isMyTurn() {
    if (this.state.status !== "playing") {
      return false;
    }

    const playerIndex = this.state.players.findIndex(
      (player) => player.uid === this.player.uid
    );

    return this.state.turnIndex === playerIndex;
  }

  constructor({ player, hostUid }: GuestGameConstructorParams) {
    super({ hostUid, peerId: player.uid });

    this.player = new Player({ ...player, game: this });
  }

  @boundMethod
  playCard() {
    if (this.state.status !== "playing") {
      return;
    }

    if (!this.isMyTurn) {
      return;
    }

    const playCardDto = createDto({
      type: "play-card",
    });

    this.log("Play card");

    this.host?.request(playCardDto, { waitForReply: false });
  }

  @boundMethod
  grabCards() {
    if (this.state.status !== "playing") {
      return;
    }

    const grabCardsDto = createDto({
      type: "grab-cards",
    });

    this.log("Grab cards");

    this.host?.request(grabCardsDto, { waitForReply: false });
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
