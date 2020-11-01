import React from "react";
import styles from "./HowToPlay.module.scss";
import { Dialog } from "@reach/dialog";
import "@reach/dialog/styles.css";
import { useHistory } from "react-router";

function HowToPlay() {
  const history = useHistory<{ showHowToPlay?: boolean } | undefined>();
  const showDialog = history.location.state?.showHowToPlay ?? false;

  function open() {
    history.push(history.location.pathname, { showHowToPlay: true });
  }

  function close() {
    history.goBack();
  }

  return (
    <>
      <Dialog isOpen={showDialog} onDismiss={close} className={styles.dialog}>
        <h1 tabIndex={0} className={styles.title}>
          How To Play
        </h1>

        <ul className={styles.rules}>
          <li>Special cards: Jack (1), Queen (2), King (3), Ace (4).</li>
          <li>
            It's a turn-based game. Players have to play cards in each turn.
          </li>
          <li>
            If somebody played a special card in the previous turn, you'd need
            to play a maximum of 4 cards (in case of being an ace).
          </li>
          <li>
            To counter a special card, you need to be lucky and play another
            special card. If you only throw common cards, the last player who
            played a special card wins all the cards that are in play.
          </li>
          <li>
            If the last two cards played have the same value, that's considered
            a pair. The first one to announce it wins the round and all the
            cards that are in play.
          </li>
          <li>The player that manages to get all the cards wins the game!</li>
        </ul>

        <button type="button" className={styles.gotItBtn} onClick={close}>
          Got it!
        </button>
      </Dialog>

      <button type="button" className={styles.openGuide} onClick={open}>
        Open how to play guide
      </button>
    </>
  );
}

export default HowToPlay;
