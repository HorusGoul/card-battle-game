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

export function GameProvider({ children, ...props }: GameProviderProps) {
  const [game] = useState(() =>
    props.type === "host" ? new GameHost(props) : new GameGuest(props)
  );

  return (
    <GameContext.Provider value={{ game }}>{children}</GameContext.Provider>
  );
}

export default GameProvider;
