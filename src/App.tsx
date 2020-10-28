import React from "react";
import { BrowserRouter, Route, Switch } from "react-router-dom";
import { PlayerSettingsProvider } from "./context/player-settings";
import { Game } from "./views/game";
import { Lobby } from "./views/lobby";

function App() {
  return (
    <PlayerSettingsProvider>
      <BrowserRouter>
        <Switch>
          <Route path="/game/:uid">
            <Game />
          </Route>

          <Route path="/">
            <Lobby />
          </Route>
        </Switch>
      </BrowserRouter>
    </PlayerSettingsProvider>
  );
}

export default App;
