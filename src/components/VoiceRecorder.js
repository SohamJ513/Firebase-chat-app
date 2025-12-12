import React, { useState, useRef, useEffect } from 'react';
import './VoiceRecorder.css';
import { Mic, Square, Play, Pause, Send, X, Loader } from 'lucide-react';

const VoiceRecorder = ({ onSend, onCancel }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordedAudio, setRecordedAudio] = useState(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerRef = useRef(null);
  const audioRef = useRef(null);

  // Start recording
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100
        } 
      });
      
      mediaRecorderRef.current = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });
      
      audioChunksRef.current = [];
      
      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };
      
      mediaRecorderRef.current.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { 
          type: 'audio/webm' 
        });
        const audioUrl = URL.createObjectURL(audioBlob);
        setRecordedAudio({
          blob: audioBlob,
          url: audioUrl,
          duration: recordingTime
        });
        stream.getTracks().forEach(track => track.stop());
      };
      
      mediaRecorderRef.current.start();
      setIsRecording(true);
      
      // Start timer
      setRecordingTime(0);
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
      
    } catch (error) {
      console.error('Error accessing microphone:', error);
      alert('Unable to access microphone. Please check permissions.');
    }
  };

  // Stop recording
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      clearInterval(timerRef.current);
    }
  };

  // Play recorded audio
  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  // Send voice message
  const sendVoiceMessage = async () => {
    if (!recordedAudio) return;
    
    setIsUploading(true);
    try {
      await onSend(recordedAudio.blob, recordingTime);
      setRecordedAudio(null);
      setRecordingTime(0);
    } catch (error) {
      console.error('Error sending voice message:', error);
    } finally {
      setIsUploading(false);
    }
  };

  // Cancel recording
  const cancelRecording = () => {
    if (isRecording) {
      stopRecording();
    }
    setRecordedAudio(null);
    setRecordingTime(0);
    if (onCancel) onCancel();
  };

  // Format time (MM:SS)
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (recordedAudio?.url) URL.revokeObjectURL(recordedAudio.url);
    };
  }, []);

  return (
    <div className="voice-recorder-container">
      <audio 
        ref={audioRef} 
        src={recordedAudio?.url}
        onEnded={() => setIsPlaying(false)}
        hidden
      />
      
      {!recordedAudio ? (
        // Recording UI
        <div className="recording-ui">
          <div className="recording-header">
            <div className="pulse-indicator">
              <div className="pulse-circle"></div>
              <Mic size={20} color="#fff" />
            </div>
            <span className="recording-text">
              {isRecording ? 'Recording...' : 'Ready to record'}
            </span>
            <span className="recording-time">
              {formatTime(recordingTime)}
            </span>
          </div>
          
          <div className="recording-controls">
            {!isRecording ? (
              <button 
                className="start-record-btn"
                onClick={startRecording}
                onMouseDown={startRecording}
                onTouchStart={startRecording}
              >
                <Mic size={24} />
                Hold to Record
              </button>
            ) : (
              <button 
                className="stop-record-btn"
                onClick={stopRecording}
              >
                <Square size={20} />
                Stop Recording
              </button>
            )}
            
            <button 
              className="cancel-btn"
              onClick={cancelRecording}
            >
              <X size={20} />
              Cancel
            </button>
          </div>
          
          {isRecording && (
            <div className="visualizer">
              {Array.from({ length: 20 }).map((_, i) => (
                <div 
                  key={i}
                  className="bar"
                  style={{
                    animationDelay: `${i * 0.05}s`,
                    height: `${20 + Math.random() * 30}px`
                  }}
                />
              ))}
            </div>
          )}
        </div>
      ) : (
        // Preview UI
        <div className="preview-ui">
          <div className="preview-header">
            <span className="preview-title">Voice Message Preview</span>
            <span className="preview-duration">{formatTime(recordingTime)}</span>
          </div>
          
          <div className="playback-controls">
            <button 
              className="play-btn"
              onClick={togglePlay}
              disabled={isUploading}
            >
              {isPlaying ? <Pause size={24} /> : <Play size={24} />}
            </button>
            
            <div className="progress-container">
              <div className="progress-bar">
                <div 
                  className="progress-fill"
                  style={{
                    width: audioRef.current 
                      ? `${(audioRef.current.currentTime / audioRef.current.duration) * 100}%` 
                      : '0%'
                  }}
                />
              </div>
            </div>
          </div>
          
          <div className="preview-actions">
            <button 
              className="send-btn"
              onClick={sendVoiceMessage}
              disabled={isUploading}
            >
              {isUploading ? (
                <>
                  <Loader className="spin" size={18} />
                  Uploading...
                </>
              ) : (
                <>
                  <Send size={18} />
                  Send Voice Message
                </>
              )}
            </button>
            
            <button 
              className="re-record-btn"
              onClick={cancelRecording}
              disabled={isUploading}
            >
              <X size={18} />
              Re-record
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default VoiceRecorder;