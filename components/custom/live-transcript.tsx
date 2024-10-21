"use client"; // Specify that this is a client component

import React, { useEffect, useState } from 'react';

// Define the SpeechRecognition interface correctly
interface SpeechRecognition extends EventTarget {
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  onresult: (event: SpeechRecognitionEvent) => void;
  onend: () => void;
}

// Define the SpeechRecognitionEvent type
interface SpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

// Define types for results
interface SpeechRecognitionResultList {
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  isFinal: boolean;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

// Extend the global Window interface
declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognition; // Use the constructor signature
    webkitSpeechRecognition: new () => SpeechRecognition; // Use the constructor signature
  }
}

export const LiveTranscript = () => {
  const [transcript, setTranscript] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [recognition, setRecognition] = useState<SpeechRecognition | null>(null);

  useEffect(() => {
    // Check for SpeechRecognition support
    if (!('webkitSpeechRecognition' in window)) {
      alert('Your browser does not support speech recognition.');
      return;
    }

    // Create a new instance of SpeechRecognition
    const SpeechRecognitionConstructor = window.SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognitionInstance = new SpeechRecognitionConstructor();

    // Set properties on the recognition instance
    recognitionInstance.interimResults = true;
    recognitionInstance.lang = 'en-US';

    recognitionInstance.onresult = (event: SpeechRecognitionEvent) => {
      const current = event.resultIndex;
      const transcript = event.results[current][0].transcript;
      setTranscript(prev => prev + (event.results[current].isFinal ? transcript + ' ' : transcript));
    };

    recognitionInstance.onend = () => {
      setIsListening(false);
    };

    setRecognition(recognitionInstance);
  }, []);

  const handleListen = () => {
    if (isListening) {
      recognition?.stop();
    } else {
      setTranscript(''); // Clear previous transcript
      recognition?.start();
    }
    setIsListening(!isListening);
  };

  return (
    <div className="flex-[1] border rounded-md p-2 overflow-hidden">
      <h2 className="text-xl font-bold mb-2">Live Transcript</h2>
      <button onClick={handleListen} className="bg-blue-500 text-white rounded p-2">
        {isListening ? 'Stop Listening' : 'Start Listening'}
      </button>
      <div className="mt-4 border-t pt-2">
        <h3 className="font-semibold">Transcript:</h3>
        <p>{transcript || "Speak something..."}</p>
      </div>
    </div>
  );
};
