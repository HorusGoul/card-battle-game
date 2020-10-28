import React, { createContext, useContext, useEffect, useState } from "react";
import { Game, GameGuest, GameHost } from "./Game";
import { Player } from "./Player";

interface GameStateContextType {
  game: Game;
}

const GameStateContext = createContext<GameStateContextType>({
  game: {} as Game,
});

export function useGameState() {
  const { game } = useContext(GameStateContext);
  const [updateKey, setUpdateKey] = useState(0);

  useEffect(() => {
    const unsubscribe = game.subscribeToUpdates(() => {
      setUpdateKey((current) => current + 1);
    });

    return () => unsubscribe();
  }, [game]);

  return { updateKey, game };
}

interface GameStateBaseProps {
  children: React.ReactNode;
  hostUid: string;
}

export interface HostGameStateProps extends GameStateBaseProps {
  type: "host";
}

export interface GuestGameStateProps extends GameStateBaseProps {
  type: "guest";
  player: Pick<Player, "uid" | "name">;
}

export type GameStateProps = HostGameStateProps | GuestGameStateProps;

function GameState({ children, ...props }: GameStateProps) {
  const [game] = useState(() =>
    props.type === "host" ? new GameHost(props) : new GameGuest(props)
  );

  return (
    <GameStateContext.Provider value={{ game }}>
      {children}
    </GameStateContext.Provider>
  );
}

export default GameState;
