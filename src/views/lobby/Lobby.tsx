import React, { useState } from "react";
import { useHistory } from "react-router";
import { usePlayerSettings } from "../../context/player-settings";

function Lobby() {
  const { settings } = usePlayerSettings();
  const history = useHistory();
  const [joinUid, setJoinUid] = useState("");

  function joinGame(uid: string) {
    history.push(`/game/${uid}`);
  }

  return (
    <div>
      <h2>
        Welcome <strong>{settings.name}</strong>
      </h2>

      <div>
        <button type="button" onClick={() => joinGame(settings.uid)}>
          Host game
        </button>
        <p>~ or ~</p>
        <label htmlFor="host-uid">
          Host UID:{" "}
          <input
            id="host-uid"
            name="host-uid"
            type="string"
            placeholder="e.g. nq2c"
            onChange={(e) => setJoinUid(e.target.value)}
          />
        </label>{" "}
        <button type="button" onClick={() => joinGame(joinUid)}>
          Join game
        </button>
      </div>
    </div>
  );
}

export default Lobby;
