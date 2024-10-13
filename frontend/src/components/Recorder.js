// import React, { useState, useRef } from "react"; // Separate imports
// import axios from "axios"; // Correct axios import

// function Recorder({ gameId, playerId }) { 
//     const [isRecording, setIsRecording] = useState(false);
//     const mediaRecorderRef = useRef(null);

//     const startRecording = async () => {
//         try {
//             const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
//             mediaRecorderRef.current = new MediaRecorder(stream);
            
//             mediaRecorderRef.current.ondataavailable = async (event) => {
//                 const audioBlob = event.data;
//                 const formData = new FormData();
//                 formData.append('file', audioBlob, 'speech.wav');
//                 formData.append('game_id', gameId);
//                 formData.append('player_id', playerId);
//                 console.log(playerId);

//                 try {
//                     await axios.post('http://127.0.0.1:5000/upload_voice', formData);
//                     console.log('Upload successful'); // Optional: log success
//                 } catch (error) {
//                     console.error('Error uploading voice:', error);
//                 }
//             };

//             mediaRecorderRef.current.start();
//             setIsRecording(true);
//         } catch (error) {
//             console.error('Error accessing microphone:', error);
//         }
//     };

//     const stopRecording = () => {
//         if (mediaRecorderRef.current) {
//             mediaRecorderRef.current.stop();
//             setIsRecording(false);
//         }
//     };

//     return (
//         <div>
//             {isRecording ? (
//                 <button onClick={stopRecording}>Stop Recording</button>
//             ) : (
//                 <button onClick={startRecording}>Start Recording</button>
//             )}
//         </div>
//     );
// }

// export default Recorder;
import React, { useState, useEffect, useRef } from "react";
import axios from "axios";

function Recorder({ gameId, playerId, startRecording, onRecordingComplete }) { 
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const streamRef = useRef(null);

  useEffect(() => {
    if (startRecording && !isRecording) {
      startRecordingFunction();
    } else if (!startRecording && isRecording) {
      stopRecordingFunction();
    }
  }, [startRecording]);

  const startRecordingFunction = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      mediaRecorderRef.current = new MediaRecorder(stream);

      chunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        chunksRef.current.push(event.data);
      };

      mediaRecorderRef.current.onstop = async () => {
        const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const formData = new FormData();
        formData.append('file', audioBlob, 'speech.webm');
        formData.append('game_id', gameId);
        formData.append('player_id', playerId);

        try {
          await axios.post('http://127.0.0.1:5000/upload_voice', formData);
          console.log('Upload successful');
          if (onRecordingComplete) {
            onRecordingComplete();
          }
        } catch (error) {
          console.error('Error uploading voice:', error);
        }
        // Stop the media stream to release the microphone
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
          streamRef.current = null;
        }
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
    } catch (error) {
      console.error('Error accessing microphone:', error);
    }
  };

  const stopRecordingFunction = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  return (
    <div>
      {isRecording ? (
        <>
        <div>Recording... (Your turn to speak)</div>
        <button onClick={stopRecordingFunction}>Stop Recording</button>
        </>
        
      ) : (
        <div>Waiting for your turn...</div>
      )}
    </div>
  );
}

export default Recorder;
