import { createGameDeck, Deck } from "./Deck";
import { Player } from "./Player";
import { boundMethod } from "autobind-decorator";

export interface GameConstructorParams {
  player: Pick<Player, "uid" | "name">;
}

export abstract class Game {
  abstract type: "host" | "guest";
  deck: Deck = createGameDeck();
  abstract host: Player | null;
  player: Player;
  players: Player[] = [];
  online = false;

  private updateSubscriptions: ((game: Game) => void)[] = [];

  constructor({ player }: GameConstructorParams) {
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
    this.player.connection.on("open", this.onPeerOpen);
    this.player.connection.on("disconnected", this.onPeerDisconnected);
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
  private notifySubscriptions() {
    for (const subscription of this.updateSubscriptions) {
      subscription(this);
    }
  }

  private log(...params: any[]) {
    const onlineStatus = this.online ? `🟢` : `🔴`;

    console.log(`%c${onlineStatus} [Game]`, "color: blue;", ...params);
  }
}

export class GameHost extends Game {
  type = "host" as const;
  host: Player;

  constructor({ player }: GameConstructorParams) {
    super({ player });

    this.host = this.player;
  }
}

export class GameGuest extends Game {
  type = "guest" as const;
  host = null;
}
