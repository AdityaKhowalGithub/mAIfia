import React, { useState, useRef } from 'react';
import { ReactMic } from 'react-mic';
import axios from 'axios';

function VoiceRecorder() {
  const [record, setRecord] = useState(false);
  const [transcript, setTranscript] = useState('');
  const audioContextRef = useRef(null); // Ref to store AudioContext

  const initializeAudioContext = () => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
      console.log('AudioContext initialized');
    }
  };

  const startRecording = () => {
    initializeAudioContext(); // Ensure the context starts on user gesture
    setRecord(true);
  };

  const stopRecording = () => {
    setRecord(false);
  };

  const onStop = async (recordedBlob) => {
    // Send the audio blob to the backend
    const formData = new FormData();
    formData.append('file', recordedBlob.blob, 'audio.wav');
    try {
      const response = await axios.post('http://127.0.0.1:5000/transcribe_speech', formData);
      setTranscript(response.data.transcript);
    } catch (error) {
      console.error('Error transcribing speech:', error);
    }
  };

  return (
    <div>
      <ReactMic
        record={record}
        className="sound-wave"
        onStop={onStop}
        strokeColor="#000000"
        backgroundColor="#FF4081"
      />
      <button onClick={startRecording} type="button">Start Recording</button>
      <button onClick={stopRecording} type="button">Stop Recording</button>
      {transcript && <p>Transcribed Text: {transcript}</p>}
    </div>
  );
}

export default VoiceRecorder;

