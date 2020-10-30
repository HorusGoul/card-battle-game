import React from "react";
import styles from "./LastRoundWinner.module.scss";
import { RiVipCrown2Fill } from "react-icons/ri";

interface LastRoundWinnerProps {
  name: string;
}

function LastRoundWinner({ name }: LastRoundWinnerProps) {
  return (
    <div className={styles.lastRoundWinner}>
      <RiVipCrown2Fill role="img" aria-label="Last round winner" />

      <span className={styles.name}>{name}</span>
    </div>
  );
}

export default LastRoundWinner;
