import React from "react";
import "./App.css";
import GameDisplay from "./components/GameDisplay";
import Game from "./components/Game";
import TitlePage from "./components/TitlePage";
import CharacterBar from "./components/CharacterBar";

function App() {
  return (
    <div className="App">
      <Game />
    </div>
  );
}

export default App;
