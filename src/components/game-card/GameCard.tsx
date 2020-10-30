import React from "react";
import { Card } from "../../context/game-state";
import styles from "./GameCard.module.scss";

interface GameCardsProps {
  card: Card;
}

function GameCard({ card }: GameCardsProps) {
  const cardStyles = {
    "--color": card.color,
  } as React.CSSProperties;

  return (
    <div className={styles.gameCard} style={cardStyles}>
      <span className={styles.topLeftIndicator}>{card.displayText}</span>

      <span className={styles.centerIndicator}>{card.displayText}</span>
    </div>
  );
}

export default GameCard;
