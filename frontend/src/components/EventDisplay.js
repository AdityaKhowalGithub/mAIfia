import React, { useEffect, useState } from "react";
import "../EventDisplay.css"; // Import the CSS file

const EventDisplay = () => {
  const [events, setEvents] = useState([]);

  useEffect(() => {
    // Fetch events from the text file
    const fetchEvents = async () => {
      const response = await fetch("/events.txt");
      const text = await response.text();
      const eventArray = text.split("\n"); // Assuming each event is on a new line
      setEvents(eventArray);
    };

    fetchEvents();
  }, []);

  return (
    <div className="event-display">
      <div className="event-title">Event Log</div>{" "}
      {/* Title for the event display */}
      {events.map((event, index) => (
        <div key={index} className="event">
          &gt; {event} {/* Add ">" before each event */}
        </div>
      ))}
    </div>
  );
};

export default EventDisplay;
