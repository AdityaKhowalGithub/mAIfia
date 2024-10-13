import React from "react";

function Timer({ time}) {
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
      {/* <h3>Time Remaining: <strong>{time}</strong> seconds</h3> */}
      <p style={styles.timerText}>Time remaining: {time} seconds</p>
    </div>
  );
}

export default Timer;
