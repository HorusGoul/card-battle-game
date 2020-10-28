import React from "react";
import uid from "uid";
import GameState, { useGameState } from "../../context/game-state/GameState";

const sessionUid = uid();

function Game() {
  return (
    <GameState type="host" player={{ name: "Horus", uid: sessionUid }}>
      <OnlineStatus />
    </GameState>
  );
}

export default Game;

function OnlineStatus() {
  const { game } = useGameState();

  return <>{game.online ? "Online" : "Offline"}</>;
}
