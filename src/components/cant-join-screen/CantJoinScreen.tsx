import React from "react";
import { CannotJoinGameState, useGame } from "../../context/game-state";
import { GameGuest } from "../../context/game-state/Game";
import styles from "./CantJoinScreen.module.scss";
import { ReactComponent as AccessDenied } from "./access-denied.svg";
import { Link } from "react-router-dom";

function CantJoinScreen() {
  const { state } = useGame<GameGuest, CannotJoinGameState>();

  return (
    <div className={styles.cantJoinScreen}>
      <AccessDenied className={styles.image} />

      <h1 className={styles.title}>Can't join game</h1>

      <span className={styles.reason}>{state.reason}</span>

      <Link className={styles.goBack} to="/" replace={true}>
        Go back
      </Link>
    </div>
  );
}

export default CantJoinScreen;
