import React, { useState } from "react";

function Notes() {
  const [notes, setNotes] = useState("");

  // Inline styles
  const styles = {
    notesContainer: {
      width: "40rem", // Set a fixed width
      maxHeight: "500px",
      padding: "10px",
      background: "rgba(255, 255, 255, 0.1)", // Semi-transparent white background
      backdropFilter: "blur(10px)", // Apply blur effect for the glassy look
      color: "white", // Set text color to white
      borderRadius: "10px", // Round the edges
      boxShadow: "0 4px 5px rgba(0, 0, 0, 0.5)", // Add shadow behind the display
      marginBottom: "20px", // Space below the notes
      marginLeft: "10px",
      fontFamily: "Courier New, Courier, monospace", // Use Courier New font
    },
    title: {
      fontSize: "24px", // Increase font size for better visibility
      marginBottom: "10px", // Space below the title
    },
    textarea: {
      width: "100%", // Full width of the container
      maxWidth: "30rem", // Max width for the textarea
      height: "120px", // Set height for the textarea
      padding: "10px", // Padding inside the textarea
      fontSize: "16px", // Font size for the textarea
      borderRadius: "5px", // Round the edges of the textarea
      border: "1px solid rgba(255, 255, 255, 0.3)", // Light border for the textarea
      background: "rgba(255, 255, 255, 0.2)", // Slightly darker background for the textarea
      color: "black", // Set text color to black for visibility
    },
  };

  return (
    <div style={styles.notesContainer}>
      <h2 style={styles.title}>Personal Notes</h2>
      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Write your notes here..."
        style={styles.textarea}
      />
    </div>
  );
}

export default Notes;
