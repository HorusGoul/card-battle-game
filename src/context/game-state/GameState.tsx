import React, { createContext, useState } from "react";
import { createGameDeck } from "./Deck";

const GameStateContext = createContext({});

export interface GameStateProps {
  children: React.ReactNode;
}

function GameState({ children }: GameStateProps) {
  const [deck] = useState(() => createGameDeck().shuffle());

  return (
    <GameStateContext.Provider value={{ deck }}>
      {children}
    </GameStateContext.Provider>
  );
}

export default GameState;
