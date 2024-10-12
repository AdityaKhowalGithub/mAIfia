import React, { useState } from 'react';

function Notes() {
  const [notes, setNotes] = useState('');

  return (
    <div>
      <h2>Personal Notes</h2>
      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        rows="6"
        cols="50"
        placeholder="Write your notes here..."
        style={{ width: '100%', maxWidth: '500px' }}
      />
    </div>
  );
}

export default Notes;

