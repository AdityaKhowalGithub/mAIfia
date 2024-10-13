import React, { useState, useRef } from "react"; // Separate imports
import axios from "axios"; // Correct axios import

function Recorder({ gameId, playerId }) { 
    const [isRecording, setIsRecording] = useState(false);
    const mediaRecorderRef = useRef(null);

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorderRef.current = new MediaRecorder(stream);
            
            mediaRecorderRef.current.ondataavailable = async (event) => {
                const audioBlob = event.data;
                const formData = new FormData();
                formData.append('file', audioBlob, 'speech.wav');
                formData.append('game_id', gameId);
                formData.append('player_id', playerId);
                console.log(playerId);

                try {
                    await axios.post('http://127.0.0.1:5000/upload_voice', formData);
                    console.log('Upload successful'); // Optional: log success
                } catch (error) {
                    console.error('Error uploading voice:', error);
                }
            };

            mediaRecorderRef.current.start();
            setIsRecording(true);
        } catch (error) {
            console.error('Error accessing microphone:', error);
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
        }
    };

    return (
        <div>
            {isRecording ? (
                <button onClick={stopRecording}>Stop Recording</button>
            ) : (
                <button onClick={startRecording}>Start Recording</button>
            )}
        </div>
    );
}

export default Recorder;
