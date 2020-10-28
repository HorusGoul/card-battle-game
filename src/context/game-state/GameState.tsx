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

export interface GameStateProps {
  children: React.ReactNode;
  type: "guest" | "host";
  player: Pick<Player, "uid" | "name">;
}

function GameState({ children, type, player }: GameStateProps) {
  const [game] = useState(() =>
    type === "host" ? new GameHost({ player }) : new GameGuest({ player })
  );

  return (
    <GameStateContext.Provider value={{ game }}>
      {children}
    </GameStateContext.Provider>
  );
}

export default GameState;
