import React from "react";
import { BrowserRouter, Route, Switch } from "react-router-dom";
import { Game } from "./views/game";

function App() {
  return (
    <BrowserRouter>
      <Switch>
        <Route path="/">
          <Game />
        </Route>
      </Switch>
    </BrowserRouter>
  );
}

export default App;
