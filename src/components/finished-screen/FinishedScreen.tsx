import React from "react";
import { Link } from "react-router-dom";
import styles from "./FinishedScreen.module.scss";
import { ReactComponent as Victory } from "./victory.svg";
import { ReactComponent as Defeat } from "./defeat.svg";
import { RiVipCrown2Fill } from "react-icons/ri";
import CooldownButton from "../cooldown-button";
import { FinishedGameState, useGame } from "../../context/game-state";
import { GameGuest } from "../../context/game-state/Game";

function FinishedScreen() {
  const { game, state } = useGame<GameGuest, FinishedGameState>();

  const victory = game.player.uid === state.winner.uid;
  const ImageComponent = victory ? Victory : Defeat;

  return (
    <div className={styles.finishedScreen}>
      <ImageComponent className={styles.image} />

      <h1 className={styles.title}>And the winner is...</h1>

      <div className={styles.winner}>
        <RiVipCrown2Fill role="img" aria-label="Winner" />
        {state.winner.name}
      </div>

      <span className={styles.congrats}>
        {victory
          ? "Congrats!"
          : `Keep doing your best and you'll win the next time!`}
      </span>

      <CooldownButton className={styles.playAgainBtn}>
        Waiting for the host to reset the game
      </CooldownButton>

      <Link className={styles.exitBtn} to="/" replace={true}>
        Exit to homescreen
      </Link>
    </div>
  );
}

export default FinishedScreen;
