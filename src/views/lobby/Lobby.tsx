import React, { useRef, useState } from "react";
import { GiPlayButton, GiCardRandom } from "react-icons/gi";
import { MdFavorite, MdOpenInNew } from "react-icons/md";
import { useHistory } from "react-router";
import CooldownButton from "../../components/cooldown-button";
import { usePlayerSettings } from "../../context/player-settings";
import styles from "./Lobby.module.scss";

function Lobby() {
  const { settings, updateSettings, resetUid } = usePlayerSettings();
  const history = useHistory();
  const [joinUid, setJoinUid] = useState("");

  const formRef = useRef<HTMLFormElement>(null);

  function joinGame(uid: string) {
    history.push(`/game/${uid}`);
  }

  return (
    <div className={styles.lobby}>
      <h1 className={styles.title}>
        <GiCardRandom role="img" aria-hidden="true" />
        <span>Boyevoy</span>
        <GiCardRandom role="img" aria-hidden="true" />
      </h1>

      <p className={styles.description}>
        A card battle game where you have to grab them all to win!
      </p>

      <h2 className={styles.subtitle}>Play</h2>

      <p className={styles.sectionDescription} id="name-helper">
        No friends? You can play against yourself using an incognito window!
      </p>

      <div className={styles.playContainer}>
        <h3 className={styles.joinTitle}>Host a party</h3>

        <CooldownButton
          className={styles.createGameBtn}
          onClick={() => joinGame(settings.uid)}
          aria-describedby="create-helper"
        >
          Create game
        </CooldownButton>

        <p className={styles.modeDescription} id="create-helper">
          Host your own game and invite your friends to play with you!
        </p>

        <h3 className={styles.joinTitle}>Join a party</h3>

        <form
          ref={formRef}
          className={styles.joinForm}
          onSubmit={(e) => e.preventDefault()}
        >
          <input
            className={styles.input}
            type="text"
            placeholder="0XIXX2FKAZ"
            aria-label="Host UID"
            aria-describedby="join-helper"
            onChange={(e) => setJoinUid(e.target.value)}
          />

          <CooldownButton
            className={styles.joinGameBtn}
            type="submit"
            onClick={() => joinGame(joinUid)}
          >
            <GiPlayButton role="img" aria-label="Join" />
          </CooldownButton>
        </form>

        <p className={styles.modeDescription} id="join-helper">
          You can either use a link or place the host's code here to join an
          existing party!
        </p>
      </div>

      <h2 className={styles.subtitle}>Your profile</h2>

      <p className={styles.sectionDescription} id="name-helper">
        Here's where you can change the name other players see while playing
        with you
      </p>

      <input
        className={styles.input}
        aria-label="Name"
        aria-describedby="name-helper"
        type="text"
        value={settings.name}
        onChange={(e) => updateSettings({ name: e.target.value })}
      />

      <span className={styles.uid}>
        <span>
          Your UID: <strong>{settings.uid}</strong>
        </span>
        <CooldownButton className={styles.resetUidBtn} onClick={resetUid}>
          Reset my UID
        </CooldownButton>
      </span>

      <div className={styles.footer}>
        <span className={styles.madeWithLove}>
          Made with&nbsp;
          <MdFavorite role="img" aria-label="love" />
          &nbsp;by&nbsp;<a href="https://horus.dev">horus.dev</a>&nbsp;—&nbsp;
        </span>
        <span className={styles.sourceCode}>
          Source code available on{" "}
          <a href="https://github.com/HorusGoul/card-battle-game">
            <strong>GitHub</strong>
            <MdOpenInNew role="img" aria-hidden="true" />
          </a>
        </span>
      </div>
    </div>
  );
}

export default Lobby;
