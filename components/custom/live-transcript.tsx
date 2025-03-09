"use client"; // Specify that this is a client component

import { Mic, MicOff, Speaker } from 'lucide-react';
import * as SpeechSDK from 'microsoft-cognitiveservices-speech-sdk';
import React, { useEffect, useState, useRef } from 'react';

// Add type definition for the custom event
declare global {
  interface WindowEventMap {
    'transcript-message': CustomEvent<{ content: string }>;
  }
}

export const LiveTranscript = () => {
  const [transcript, setTranscript] = useState('');
  const [interimResult, setInterimResult] = useState(''); // New state for interim results
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [audioSource, setAudioSource] = useState<'microphone' | 'system'>('microphone');

  // Refs for speech recognizer and timer
  const recognizerRef = useRef<SpeechSDK.SpeechRecognizer | null>(null);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);

  // Configuration state
  const [config, setConfig] = useState({
    azureToken: 'PyJ5eHqYMxTMumjR5w6E9nAXsGgy39Wsn5mb8tXm0ptA3uHbKsRyJQQJ99BCACYeBjFXJ3w3AAAYACOGCFbj',
    azureRegion: 'eastus',
    language: 'en-US',
    openaiKey: '',
    gptModel: 'gpt-3.5-turbo',
    systemPrompt: ''
  });

  // Format time
  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;
  };

  // Start timer
  const startTimer = () => {
    startTimeRef.current = Date.now();
    timerIntervalRef.current = setInterval(() => {
      const currentTime = Math.floor((Date.now() - startTimeRef.current) / 1000);
      setElapsedTime(currentTime);
    }, 1000);
  };

  // Stop timer
  const stopTimer = () => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
      setElapsedTime(0);
    }
  };

  useEffect(() => {
    // Load configurations from localStorage
    const loadedConfig = {
      azureToken: localStorage.getItem('azure_token') || config.azureToken,
      azureRegion: localStorage.getItem('azure_region') || config.azureRegion,
      language: localStorage.getItem('azure_language') || config.language,
      openaiKey: localStorage.getItem('openai_key') || config.openaiKey,
      gptModel: localStorage.getItem('gpt_model') || config.gptModel,
      systemPrompt: localStorage.getItem('gpt_system_prompt') || ''
    };
    setConfig(loadedConfig);

    // Try to load saved audio source preference
    const savedAudioSource = localStorage.getItem('audio_source');
    if (savedAudioSource === 'microphone' || savedAudioSource === 'system') {
      setAudioSource(savedAudioSource);
    }

    // Cleanup function
    return () => {
      // Stop recognition and timer if component unmounts
      recognizerRef.current?.stopContinuousRecognitionAsync();
      stopTimer();
    };
  }, []);

  // Save audio source preference whenever it changes
  useEffect(() => {
    localStorage.setItem('audio_source', audioSource);
  }, [audioSource]);

  const startVoiceRecognition = () => {
    const { azureToken, azureRegion, language } = config;

    // Validate configurations
    if (!azureToken || !azureRegion) {
      setTranscript('Error: Azure token or region not configured');
      return;
    }

    try {
      // Create speech configuration
      const speechConfig = SpeechSDK.SpeechConfig.fromSubscription(azureToken, azureRegion);
      speechConfig.speechRecognitionLanguage = language;

      // Create audio config based on selected source
      let audioConfig;
      if (audioSource === 'microphone') {
        audioConfig = SpeechSDK.AudioConfig.fromDefaultMicrophoneInput();
      } else {
        // System audio requires permission and might not work in all browsers
        try {
          audioConfig = SpeechSDK.AudioConfig.fromDefaultSpeakerOutput();
        } catch (error) {
          setTranscript(`Error: System audio capture not supported or permission denied. ${error instanceof Error ? error.message : 'Unknown error'}`);
          return;
        }
      }

      // Create speech recognizer
      const recognizer = new SpeechSDK.SpeechRecognizer(speechConfig, audioConfig);
      recognizerRef.current = recognizer;

      // Handle interim recognition events (while speaking)
      recognizer.recognizing = (s, e) => {
        if (e.result.reason === SpeechSDK.ResultReason.RecognizingSpeech) {
          const text = e.result.text;
          if (text.length > 0) {
            // Update only the interim result, not the main transcript
            setInterimResult(text);
          }
        }
      };

      // Handle final recognition events (after pause in speech)
      recognizer.recognized = (s, e) => {
        if (e.result.reason === SpeechSDK.ResultReason.RecognizedSpeech) {
          const text = e.result.text;
          if (text.length > 0) {
            // Clear the interim result
            setInterimResult('');
            
            // Add the final result to the transcript
            setTranscript(prev => {
              if (prev.length > 0 && !prev.endsWith('\n')) {
                return prev + '\n' + text;
              } else {
                return prev + text;
              }
            });
          }
        }
      };

      // Start continuous recognition
      recognizer.startContinuousRecognitionAsync(
        () => {
          setIsListening(true);
          startTimer();
          console.log('Recognition started');
        },
        (err) => {
          setTranscript(`Start Failed: ${err}`);
          console.error('Recognition start failed', err);
        }
      );
    } catch (error) {
      setTranscript(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const stopVoiceRecognition = () => {
    if (recognizerRef.current) {
      recognizerRef.current.stopContinuousRecognitionAsync(
        () => {
          setIsListening(false);
          stopTimer();
          // Clear any remaining interim result
          setInterimResult('');
          console.log('Recognition stopped');
        },
        (err) => {
          console.error('Stop recognition failed', err);
        }
      );
    }
  };

  const toggleAudioSource = () => {
    // Only allow toggling when not actively listening
    if (!isListening) {
      setAudioSource(prev => prev === 'microphone' ? 'system' : 'microphone');
    }
  };

  const handleClearTranscript = () => {
    setTranscript('');
    setInterimResult('');
  };

  const handleSendTranscript = async () => {
    // Combine the finalized transcript with any interim results
    const fullTranscript = transcript + (interimResult ? 
      (transcript && !transcript.endsWith('\n') ? '\n' : '') + interimResult : '');
      
    if (!fullTranscript) return;
    try {
      setIsProcessing(true);
      // Create a custom event with the combined transcript data
      const transcriptEvent = new CustomEvent('transcript-message', {
        detail: { content: fullTranscript }
      });

      // Dispatch the event to the window
      window.dispatchEvent(transcriptEvent);
      
      console.log("Transcript event dispatched:", fullTranscript);
    } catch (error) {
      console.error("Error dispatching transcript event:", error);
    } finally {
      setIsProcessing(false);
    }
  };
  
  return (
      <div className="flex-[1] rounded-md p-1 overflow-hidden h-full flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <div className="flex gap-2">
            {/* Start/Stop button */}
            {!isListening ? (
              <button 
                onClick={startVoiceRecognition} 
                className="bg-blue-500 text-white p-2 rounded hover:bg-blue-600"
              >
                <span className="flex items-center justify-center gap-1">
                {audioSource === 'microphone' ? <Mic size={16} /> : <Speaker size={16} />}
                { 'Start' }
                </span>
              </button>
            ) : (
              <button 
                onClick={stopVoiceRecognition} 
                className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
              >
                <span className="flex items-center justify-center gap-2">
                  {<MicOff size={16} />}
                  { 'Stop' }
                </span>
              </button>
            )}

            {/* Audio source selector */}
            <button
              onClick={toggleAudioSource}
              disabled={isListening}
              className="flex items-center gap-1 p-1 border rounded hover:bg-gray-100 disabled:opacity-50"
              title={isListening ? "Can't change audio source while listening" : "Toggle audio source"}
            >
              {audioSource === 'microphone' ? (
                <>
                  <Mic size={16} />
                  <span>Mic</span>
                </>
              ) : (
                <>
                  <Speaker size={16} />
                  <span>Sys</span>
                </>
              )}
            </button>
          </div>
          
          {/* Elapsed time */}
          <div className="text-lg font-semibold">
            {formatTime(elapsedTime)}
          </div>
        </div>
        
        
        {/* Transcript display */}
        <div className="grid grid-cols-1 gap-2 h-96">
          <div className="border rounded p-2 flex flex-col">
            <h2 className="text-xs font-bold mb-2">Live Transcript</h2>
            <div className="h-72 overflow-auto mb-2 grow">
              <p>
                {transcript}
                {interimResult && (
                  <>
                    {transcript && !transcript.endsWith('\n') && '\n'}
                    <span className="text-gray-500 italic">{interimResult}</span>
                  </>
                )}
                {!transcript && !interimResult && 
                  `Ready to transcribe from ${audioSource === 'microphone' ? 'microphone' : 'system audio'}...`
                }
              </p>
            </div>
            <div className="flex gap-2 mt-auto">
              <button 
                onClick={handleSendTranscript}
                className="bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600 flex-1"
                disabled={!transcript || isProcessing}
              >
                {isProcessing ? 'Sending...' : 'Send'}
              </button>
              <button 
                onClick={handleClearTranscript}
                className="bg-gray-500 text-white px-3 py-1 rounded hover:bg-gray-600 flex-1"
                disabled={(!transcript && !interimResult) || isProcessing}
              >
                Clear
              </button>
            </div>
          </div>
        </div>
        
      </div>
    );
  };