import React from "react";
import { useParams } from "react-router";
import { GameProvider, useGame } from "../../context/game-state";
import { usePlayerSettings } from "../../context/player-settings";

function Game() {
  const params = useParams<{ uid: string }>();
  const { settings } = usePlayerSettings();

  const type = params.uid === settings.uid ? "host" : "guest";

  const guestJsx = (
    <GameProvider
      type="guest"
      player={{ name: settings.name, uid: settings.uid }}
      hostUid={params.uid}
    >
      Client: <OnlineStatus />
      <CurrentState />
    </GameProvider>
  );

  if (type === "host") {
    return (
      <GameProvider type="host" hostUid={params.uid}>
        {guestJsx}
      </GameProvider>
    );
  }

  return guestJsx;
}

export default Game;

function OnlineStatus() {
  const { game } = useGame();

  return <>{game.online ? "Online" : "Offline"}</>;
}

function CurrentState() {
  const { state } = useGame();

  return <pre>{JSON.stringify(state, null, 2)}</pre>;
}
