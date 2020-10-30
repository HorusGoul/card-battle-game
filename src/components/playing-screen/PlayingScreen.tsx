import React from "react";
import { PlayingGameState, useGame } from "../../context/game-state";
import { GameGuest } from "../../context/game-state/Game";
import PlayerCard from "./player-card";
import styles from "./PlayingScreen.module.scss";
import LastRoundWinner from "./last-round-winner";

function PlayingScreen() {
  const { state, game } = useGame<GameGuest, PlayingGameState>();

  const { players } = state;

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

      <OnlineStatus />
      <CurrentState />

      {state.status === "playing" && (
        <button onClick={game.playCard}>Play card</button>
      )}
    </div>
  );
}

export default PlayingScreen;

function OnlineStatus() {
  const { game } = useGame();

  return <>{game.online ? "Online" : "Offline"}</>;
}

function CurrentState() {
  const { state } = useGame();

  return <pre>{JSON.stringify(state, null, 2)}</pre>;
}
