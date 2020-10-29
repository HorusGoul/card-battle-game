import React from "react";
import { useGame } from "../../context/game-state";
import { GameHost } from "../../context/game-state/Game";

function HostControls() {
  const { state } = useGame<GameHost>();

  return <div>{state.status === "waiting" && <button>Start game</button>}</div>;
}

export default HostControls;
