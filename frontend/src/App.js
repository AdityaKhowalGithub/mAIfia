import React from "react";
import Game from "./components/Game";
import "./App.css";
import Character from "./components/Character";

const characters = [{ sprite: "./sprites/character1.png" }];

function App() {
  return (
    <div className="App">
      <Character sprite={characters[0].sprite} />
    </div>
  );
}

export default App;
