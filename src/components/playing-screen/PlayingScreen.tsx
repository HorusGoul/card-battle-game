import React from "react";
import { PlayingGameState, useGame } from "../../context/game-state";
import { GameGuest } from "../../context/game-state/Game";
import PlayerCard from "./player-card";
import styles from "./PlayingScreen.module.scss";
import LastRoundWinner from "./last-round-winner";
import GameCard from "../game-card";
import { CSSTransition, TransitionGroup } from "react-transition-group";
import { useDebounce } from "use-debounce";
import CooldownButton from "../cooldown-button";
import { GiCardPlay } from "react-icons/gi";

function PlayingScreen() {
  const { state, game } = useGame<GameGuest, PlayingGameState>();

  const { players } = state;

  const [cardsInPlay] = useDebounce(state.cardsInPlay, 500, {
    leading: state.cardsInPlay.length ? true : false,
  });

  const playerIndex = state.players.findIndex(
    (player) => player.uid === game.player.uid
  );

  const itsMyTurn = playerIndex === state.turnIndex;

  return (
    <div className={styles.playingScreen}>
      {state.lastRoundWinner && (
        <LastRoundWinner key={state.round} name={state.lastRoundWinner.name} />
      )}

      <div className={styles.players}>
        {players.map((player, index) => (
          <PlayerCard
            key={player.uid}
            player={player}
            index={index}
            isItsTurn={index === state.turnIndex}
            itsMe={player.uid === game.player.uid}
          />
        ))}
      </div>

      <TransitionGroup className={styles.cardsInPlay}>
        {cardsInPlay
          .slice()
          .reverse()
          .map((card) => (
            // @ts-ignore Looks like the react-transition-group types are wrong
            <CSSTransition
              key={`${card.color}-${card.type}-${card.value}`}
              timeout={1000}
              classNames={{
                exitActive: styles.exit,
              }}
            >
              <div className={styles.cardContainer}>
                <GameCard card={card} />
              </div>
            </CSSTransition>
          ))}
      </TransitionGroup>

      <div className={styles.bottom}>
        <CooldownButton
          onClick={game.playCard}
          className={styles.playCardBtn}
          disabled={!itsMyTurn}
          cooldownMs={500}
        >
          <GiCardPlay aria-hidden="true" role="img" />
          {itsMyTurn ? "Play Card" : "Waiting..."}
        </CooldownButton>
      </div>
    </div>
  );
}

export default PlayingScreen;
