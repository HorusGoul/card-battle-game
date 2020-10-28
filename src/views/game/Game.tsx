import React from "react";
import { useParams } from "react-router";
import GameState, { useGameState } from "../../context/game-state/GameState";
import { usePlayerSettings } from "../../context/player-settings";

function Game() {
  const params = useParams<{ uid: string }>();
  const { settings } = usePlayerSettings();

  const type = params.uid === settings.uid ? "host" : "guest";

  return (
    <GameState type={type} player={{ name: settings.name, uid: settings.uid }}>
      <OnlineStatus />
    </GameState>
  );
}

export default Game;

function OnlineStatus() {
  const { game } = useGameState();

  return <>{game.online ? "Online" : "Offline"}</>;
}
