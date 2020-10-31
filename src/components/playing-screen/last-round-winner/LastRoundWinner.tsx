import React from "react";
import styles from "./LastRoundWinner.module.scss";
import { RiVipCrown2Fill } from "react-icons/ri";
import { HiSpeakerphone } from "react-icons/hi";
import { PlayingGameState } from "../../../context/game-state";

interface LastRoundWinnerProps {
  name: string;
  reason: PlayingGameState["lastRoundWinnerReason"];
}

function LastRoundWinner({ name, reason }: LastRoundWinnerProps) {
  return (
    <>
      <div className={styles.lastRoundWinner}>
        <RiVipCrown2Fill role="img" aria-label="Last round winner" />

        <span className={styles.name}>{name}</span>
      </div>

      {reason === "pair" && (
        <div className={styles.pairs}>
          <HiSpeakerphone role="img" aria-label="Reason" />

          <span className={styles.name}>PAIR!</span>
        </div>
      )}
    </>
  );
}

export default LastRoundWinner;
