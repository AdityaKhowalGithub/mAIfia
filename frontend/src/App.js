import React, { useState } from "react";
import Game from "./components/Game";
import "./App.css";
import Character from "./components/Character";

function App() {
  const [speakingCharacter, setSpeakingCharacter] = useState(null);

  const handleSpeak = (characterIndex) => {
    setSpeakingCharacter(characterIndex);
  };

  return (
    <div className="App">
      <Character sprite={"/character1.png"} />
      <Character sprite={"/character1.png"} />
      <Character sprite={"/character1.png"} />
      <Character sprite={"/character1.png"} />
      <Character sprite={"/character1.png"} />
      <Character sprite={"/character1.png"} />
    </div>
  );
}

export default App;
