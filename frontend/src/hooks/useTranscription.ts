import { useState, useEffect, useRef, useCallback } from 'react';
import { logger } from '../shared/utils/logger';


export type ModelSize = 'tiny' | 'base';

interface UseTranscriptionReturn {
  isRecording: boolean;
  transcription: string;
  model: ModelSize;
  error: string | null;
  startRecording: () => void;
  stopRecording: () => void;
  setModel: (model: ModelSize) => void;
  clearTranscription: () => void;
}

export const useTranscription = (): UseTranscriptionReturn => {
  const [isRecording, setIsRecording] = useState(false);
  const [transcription, setTranscription] = useState('');
  const [model, setModelState] = useState<ModelSize>('tiny');
  const [error, setError] = useState<string | null>(null);

  const socketRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Initialize WebSocket
  const connectWebSocket = useCallback(() => {
    const socket = new WebSocket('ws://localhost:8000/ws/transcribe');
    socket.binaryType = 'arraybuffer';

    socket.onopen = () => {
      logger.info('WebSocket Connected');
      setError(null);
      // Send initial config
      socket.send(JSON.stringify({ type: 'config', model }));
    };


    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'transcription') {
        logger.debug('Received transcription', data.text);
        setTranscription(data.text);
      }
    };


    socket.onerror = (err) => {
      logger.error('WebSocket Error', err);
      setError('Connection to backend failed.');
    };


    socket.onclose = () => {
      logger.info('WebSocket Disconnected');
    };


    socketRef.current = socket;
  }, [model]);

  const setModel = (newModel: ModelSize) => {
    logger.info(`Switching model to: ${newModel}`);
    setModelState(newModel);
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ type: 'config', model: newModel }));
    }
  };


  const clearTranscription = () => {
    logger.info('Clearing transcription');
    setTranscription('');
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ type: 'clear' }));
    }
  };


  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({
        sampleRate: 16000, // Request 16kHz directly if possible
      });
      audioContextRef.current = audioContext;

      const source = audioContext.createMediaStreamSource(stream);
      
      // ScriptProcessor is deprecated but easiest for this test. 
      // For production, use AudioWorklet.
      const processor = audioContext.createScriptProcessor(4096, 1, 1);
      processorRef.current = processor;

      processor.onaudioprocess = (e) => {
        if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
          const inputData = e.inputBuffer.getChannelData(0);
          // Send as Float32 binary
          socketRef.current.send(inputData.buffer);
        }
      };

      source.connect(processor);
      processor.connect(audioContext.destination);

      logger.info('Starting recording...');
      setIsRecording(true);
      setError(null);
      
      if (!socketRef.current || socketRef.current.readyState !== WebSocket.OPEN) {
        connectWebSocket();
      }

    } catch (err) {
      logger.error('Recording Error', err);
      setError('Could not access microphone.');
    }

  };

  const stopRecording = () => {
    setIsRecording(false);
    
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    logger.info('Stopped recording');
  };


  useEffect(() => {
    connectWebSocket();
    return () => {
      stopRecording();
      if (socketRef.current) {
        socketRef.current.close();
      }
    };
  }, []); // Only on mount

  return {
    isRecording,
    transcription,
    model,
    error,
    startRecording,
    stopRecording,
    setModel,
    clearTranscription
  };
};
