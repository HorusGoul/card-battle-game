import classNames from "classnames";
import React, { useLayoutEffect, useRef } from "react";
import { PlayerState } from "../../../context/game-state";
import styles from "./PlayerCard.module.scss";
import { CgCardSpades } from "react-icons/cg";
import { GoPerson } from "react-icons/go";

interface PlayerCardProps {
  player: PlayerState;
  isItsTurn: boolean;
  index: number;
  itsMe: boolean;
}

function PlayerCard({ player, isItsTurn, index, itsMe }: PlayerCardProps) {
  const ref = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (isItsTurn) {
      ref.current?.scrollIntoView({ behavior: "smooth", inline: "end" });
    }
  }, [isItsTurn]);

  return (
    <div
      ref={ref}
      className={classNames(styles.playerCard, {
        [styles.online]: player.online,
        [styles.currentTurn]: isItsTurn,
      })}
    >
      <span className={styles.turnOrder}>{index + 1}</span>

      <div className={styles.top}>
        <div
          className={classNames(styles.status, {
            [styles.online]: player.online,
          })}
        />

        <span className={styles.name}>{player.name}</span>
      </div>

      <div className={styles.bottom}>
        {itsMe && (
          <div className={styles.meIndicator}>
            <GoPerson role="img" aria-label="Me" />

            <span className={styles.count}>ME</span>
          </div>
        )}

        <div className={styles.cardCount}>
          <CgCardSpades role="img" aria-label="Cards" />

          <span className={styles.count}>{player.cardsInDeck}</span>
        </div>
      </div>

      {isItsTurn && (
        <div className={styles.currentTurnIndicator}>Current turn</div>
      )}
    </div>
  );
}

export default PlayerCard;
