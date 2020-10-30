import classNames from "classnames";
import React from "react";
import { useGame, WaitingGameState } from "../../context/game-state";
import { GameGuest } from "../../context/game-state/Game";
import styles from "./WaitingScreen.module.scss";

function WaitingScreen() {
  const { state } = useGame<GameGuest, WaitingGameState>();

  const playersCount = state.players.length;

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

  return (
    <div className={styles.waitingScreen}>
      <div className={styles.card}>
        <h2 className={styles.title}>
          {playersCount > 1
            ? "Waiting for the host to start the game..."
            : "The game needs at least two players"}
        </h2>

        <button className={styles.inviteUrlCopyBtn} onClick={copyInviteUrl}>
          Share/Copy Invite Link
        </button>

        <h3 className={styles.subtitle}>Players ({playersCount})</h3>

        <ul className={styles.playerContainer}>
          {state.players.map((player) => (
            <li key={player.uid} className={styles.playerItem}>
              <div
                className={classNames(styles.status, {
                  [styles.online]: player.online,
                })}
              />

              {player.name}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export default WaitingScreen;
