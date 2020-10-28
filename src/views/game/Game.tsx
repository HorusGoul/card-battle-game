import React from "react";
import { useParams } from "react-router";
import GameState, { useGameState } from "../../context/game-state/GameState";
import { usePlayerSettings } from "../../context/player-settings";

function Game() {
  const params = useParams<{ uid: string }>();
  const { settings } = usePlayerSettings();

  const type = params.uid === settings.uid ? "host" : "guest";

  const guestJsx = (
    <GameState
      type="guest"
      player={{ name: settings.name, uid: settings.uid }}
      hostUid={params.uid}
    >
      Client: <OnlineStatus />
    </GameState>
  );

  if (type === "host") {
    return (
      <GameState type="host" hostUid={params.uid}>
        Server: <OnlineStatus />
        {guestJsx}
      </GameState>
    );
  }

  return guestJsx;
}

export default Game;

function OnlineStatus() {
  const { game } = useGameState();

  return <>{game.online ? "Online" : "Offline"}</>;
}
