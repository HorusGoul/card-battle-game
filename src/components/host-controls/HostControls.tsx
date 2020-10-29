import React from "react";
import styles from "./HostControls.module.scss";
import { useGame } from "../../context/game-state";
import { GameHost } from "../../context/game-state/Game";
import classnames from "classnames";

function HostControls() {
  const { state, game } = useGame<GameHost>();

  const canStartGame = state.status === "waiting" && state.players.length > 1;
  const inviteUrl = window.location.href;

  function copyInviteUrl() {
    if ("share" in navigator) {
      navigator.share({
        url: inviteUrl,
        title: `Join me in Card Battle Game!`,
      });
    } else {
      // @ts-ignore
      navigator.clipboard.writeText(inviteUrl);
      alert("URL Copied!");
    }
  }

  if (
    state.status === "connecting" ||
    state.status === "cannot-join" ||
    state.status === "finished"
  ) {
    return null;
  }

  return (
    <div className={styles.hostControls}>
      <span className={styles.tag}>Host Controls</span>

      <div
        className={classnames(styles.status, {
          [styles.online]: game.online,
        })}
        aria-label={game.online ? `Online: ${state.players.length}` : `Offline`}
      >
        <div className={styles.ball} />
        {state.players.length}
      </div>

      <button className={styles.inviteUrlCopyBtn} onClick={copyInviteUrl}>
        Copy Invite URL
      </button>

      <button className={styles.startGameBtn} disabled={!canStartGame}>
        {canStartGame ? "Start" : "Waiting"}
      </button>
    </div>
  );
}

export default HostControls;
