import React, { createContext, useContext, useEffect, useState } from "react";
import { Game, GameGuest, GameHost } from "./Game";
import { Player } from "./Player";
import { GameState } from "./State";

interface GameContextType {
  game: Game;
}

const GameContext = createContext<GameContextType>({
  game: {} as Game,
});

export function useGame<
  T extends Game = GameGuest,
  S extends GameState = GameState
>() {
  const { game } = useContext(GameContext);
  const [state, setState] = useState<GameState>(game.state);

  useEffect(() => {
    const unsubscribe = game.subscribeToUpdates((game) => {
      setState(game.state);
    });

    return () => unsubscribe();
  }, [game]);

  return { state: state as S, game: game as T };
}

interface GameProviderBaseProps {
  children: React.ReactNode;
  hostUid: string;
}

export interface HostGameProviderProps extends GameProviderBaseProps {
  type: "host";
}

export interface GuestGameProviderProps extends GameProviderBaseProps {
  type: "guest";
  player: Pick<Player, "uid" | "name">;
}

export type GameProviderProps = HostGameProviderProps | GuestGameProviderProps;

const games: Record<string, Game> = {};

export function GameProvider({ children, ...props }: GameProviderProps) {
  const gameKey =
    props.type === "host"
      ? `${props.type}-${props.hostUid}`
      : `${props.type}-${props.hostUid}-${props.player.uid}`;

  if (!games[gameKey]) {
    games[gameKey] =
      props.type === "host" ? new GameHost(props) : new GameGuest(props);
  }

  useEffect(() => {
    return () => {
      games[gameKey].cleanup();
      delete games[gameKey];
    };
  }, [gameKey]);

  return (
    <GameContext.Provider value={{ game: games[gameKey] }}>
      {children}
    </GameContext.Provider>
  );
}

export default GameProvider;
