import React, { useEffect, useState } from "react";

function Timer({ initialTime, onTimeUp }) {
  const [time, setTime] = useState(initialTime);

  useEffect(() => {
    let interval = null;
    if (time > 0) {
      interval = setInterval(() => {
        setTime((prevTime) => prevTime - 1);
      }, 1000);
    } else if (time === 0) {
      onTimeUp(); // Call the onTimeUp function when the timer hits 0
    }
    return () => clearInterval(interval); // Clean up the interval on unmount
  }, [time, onTimeUp]);

  // Inline styles
  const styles = {
    timer: {
      width: "20rem", // Set a fixed width
      height: "100px", // Set a fixed height
      border: "1px solid rgba(255, 255, 255, 0.1)", // Light border for the glass effect
      padding: "10px",
      background: "rgba(255, 255, 255, 0.1)", // Semi-transparent white background
      backdropFilter: "blur(10px)", // Apply blur effect for the glassy look
      color: "black", // Set text color to white
      fontFamily: "'Courier New', Courier, monospace", // Use a monospace font
      textAlign: "center", // Center-align the text
      borderRadius: "10px", // Round the edges
      boxShadow: "0 4px 5px rgba(0, 0, 0, 0.5)", // Add shadow behind the display
      marginBottom: "20px", // Space below the timer
    },
    timerText: {
      fontSize: "24px", // Increase font size for better visibility
      margin: 0, // Remove default margin
    },
  };

  return (
    <div style={styles.timer}>
      <p style={styles.timerText}>Time remaining: {time} seconds</p>
    </div>
  );
}

export default Timer;
