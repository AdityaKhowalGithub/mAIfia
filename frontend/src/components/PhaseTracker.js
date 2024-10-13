import React from "react";
import { Popover, Steps } from "antd";
import "../PhaseTracker.css"; // Importing the CSS file for styling

// Custom dot rendering for the steps
const customDot = (dot, { status, index }) => <Popover>{dot}</Popover>;

// PhaseTracker component definition
const PhaseTracker = ({ currentPhase }) => {
  // Combined phases into a single array with descriptions in popovers
  const items = [
    {
      title: "DAY",
      description:
        "Players discuss and debate among themselves to identify and vote out suspected Mafia members. This phase encourages open communication and strategic thinking.",
    }, // DAY
    {
      title: "Event Updates",
      description:
        "Any events that occurred since the last phase are announced (e.g., a player was eliminated, special abilities were used). Players reflect on these events to guide their decisions.",
    }, // DAY
    {
      title: "Discussion",
      description:
        "A focused discussion occurs, allowing players to share their thoughts, defend their actions, and accuse others. This phase is crucial for gathering information and forming alliances.",
    }, // DAY
    {
      title: "Voting",
      description:
        "Players cast their votes on who they believe should be eliminated from the game. The player with the most votes is removed, contributing to the balance between Townsfolk and Mafia.",
    }, // DAY
    {
      title: "NIGHT",
      description:
        "Players with special roles (Mafia, Doctor, Detective) perform their actions secretly. This phase emphasizes strategy and deception, as Mafia members plan their next move without revealing their identities.",
    }, // NIGHT
    {
      title: "Mafia Voting",
      description:
        "Mafia members confer in secret and decide on one player to eliminate. Their choice can significantly impact the game's balance and dynamics.",
    }, // NIGHT
    {
      title: "Doctor Voting",
      description:
        "The Doctor selects one player to protect from elimination during the night. If the protected player is targeted by the Mafia, they survive, adding a layer of strategy to the Doctor's choice.",
    }, // NIGHT
    {
      title: "Detective Voting",
      description:
        "The Detective investigates a player to determine if they are part of the Mafia. The information gathered during this phase can be crucial for guiding the Townsfolk's decisions in the next DAY phase.",
    }, // NIGHT
  ];

  return (
    <div className="phase-tracker-container">
      <Steps
        current={currentPhase}
        progressDot={customDot}
        direction="horizontal"
      >
        {items.map((item, index) => (
          <Steps.Step
            key={index}
            title={
              <Popover
                content={item.description}
                title={item.title}
                trigger="hover"
              >
                <span>{item.title}</span>
              </Popover>
            }
          />
        ))}
      </Steps>
    </div>
  );
};

export default PhaseTracker;
