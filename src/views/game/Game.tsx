import React from "react";
import { useParams } from "react-router";
import LoadingScreen from "../../components/loading-screen";
import { GameProvider, useGame } from "../../context/game-state";
import { GameHost } from "../../context/game-state/Game";
import { usePlayerSettings } from "../../context/player-settings";
import HostControls from "../../components/host-controls";
import styles from "./Game.module.scss";

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
      <Guest />
    </GameProvider>
  );

  if (type === "host") {
    return (
      <GameProvider type="host" hostUid={params.uid}>
        <Host>{guestJsx}</Host>
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

interface HostProps {
  children: React.ReactNode;
}

function Host({ children }: HostProps) {
  const { state } = useGame<GameHost>();

  if (state.status === "connecting") {
    return <LoadingScreen text="Initializing Game Server" />;
  }

  return (
    <div className={styles.host}>
      <div className={styles.guestContainer}>{children}</div>

      <HostControls />
    </div>
  );
}

function Guest() {
  const { state } = useGame<GameHost>();

  if (state.status === "connecting") {
    return <LoadingScreen text="Attempting to join game..." />;
  }

  return (
    <>
      <OnlineStatus />
      <CurrentState />
    </>
  );
}
