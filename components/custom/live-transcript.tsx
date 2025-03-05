"use client"; // Specify that this is a client component

import { Mic, MicOff } from 'lucide-react';
import * as SpeechSDK from 'microsoft-cognitiveservices-speech-sdk';
import React, { useEffect, useState, useRef } from 'react';

export const LiveTranscript = () => {
  const [transcript, setTranscript] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [aiResponse, setAiResponse] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);

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

    // Cleanup function
    return () => {
      // Stop recognition and timer if component unmounts
      recognizerRef.current?.stopContinuousRecognitionAsync();
      stopTimer();
    };
  }, []);

  const startCopilot = () => {
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

      // Use default microphone input
      const audioConfig = SpeechSDK.AudioConfig.fromDefaultMicrophoneInput();

      // Create speech recognizer
      const recognizer = new SpeechSDK.SpeechRecognizer(speechConfig, audioConfig);
      recognizerRef.current = recognizer;

      // Handle recognition events
      recognizer.recognized = (s, e) => {
        if (e.result.reason === SpeechSDK.ResultReason.RecognizedSpeech) {
          const text = e.result.text;
          if (text.length > 0) {
            setTranscript(prev => prev + '\n' + text);
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

  const stopCopilot = () => {
    if (recognizerRef.current) {
      recognizerRef.current.stopContinuousRecognitionAsync(
        () => {
          setIsListening(false);
          stopTimer();
          console.log('Recognition stopped');
        },
        (err) => {
          console.error('Stop recognition failed', err);
        }
      );
    }
  };

  const handleAskGPT = async () => {
    if (!config.openaiKey) {
      alert('Please set up OpenAI API Key in settings');
      return;
    }

    setIsProcessing(true);
    try {
      const openai = new OpenAI({ 
        apiKey: config.openaiKey, 
        dangerouslyAllowBrowser: true 
      });

      const fullPrompt = `${config.systemPrompt}\n${transcript}`;

      const stream = await openai.chat.completions.create({
        model: config.gptModel,
        messages: [{ role: "user", content: fullPrompt }],
        stream: true,
      });

      let responseText = '';
      for await (const chunk of stream) {
        const text = chunk.choices[0]?.delta?.content || "";
        responseText += text;
        setAiResponse(responseText);
      }
    } catch (error) {
      console.error('GPT Request Error:', error);
      setAiResponse(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsProcessing(false);
    }
  };
  
  return (
      <div className="flex-[1] rounded-md p-1 overflow-hidden h-full flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <div className="text-lg font-semibold">
            {formatTime(elapsedTime)}
          </div>
          <div className="flex gap-2">
            {!isListening ? (
              <button 
                onClick={startCopilot} 
                className="bg-blue-500 text-white p-2 rounded hover:bg-blue-600"
              >
                <span className="flex items-center justify-center gap-1">
                {<Mic size={16} />}
                { 'Start Listening' }
                </span>
              </button>
            ) : (
              <button 
                onClick={stopCopilot} 
                className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
              >
                <span className="flex items-center justify-center gap-2">
                  {<MicOff size={16} />}
                  { 'Stop Listening' }
                </span>
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="border rounded p-2">
            <h2 className="text-xl font-bold mb-2">Live Transcript</h2>
            <div className="h-48 overflow-auto">
              <p>{transcript || "Speak something..."}</p>
            </div>
          </div>

          <div className="border rounded p-2">
            <div className="flex justify-between items-center mb-2">
              <h2 className="text-xl font-bold">GPT Response</h2>
              <button 
                onClick={handleAskGPT} 
                disabled={!transcript || isProcessing}
                className="bg-green-500 text-white px-2 py-1 rounded disabled:opacity-50"
              >
                {isProcessing ? 'Processing...' : 'Ask GPT'}
              </button>
            </div>
            <div className="h-48 overflow-auto">
              {isProcessing ? (
                <div>Generating response...</div>
              ) : (
                <p>{aiResponse || "No response yet"}</p>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };


//   return (
//     <div className="flex-[1] rounded-md p-1 overflow-hidden h-full flex flex-col">
//       <button 
//         onClick={handleListen} 
//         className={`w-full text-white rounded p-2 transition-colors ${
//           isListening 
//             ? 'bg-red-500 hover:bg-red-600' 
//             : 'bg-blue-500 hover:bg-blue-600'
//         }`}>
//         <span className="flex items-center justify-center gap-2">
//           {isListening ? <MicOff size={16} /> : <Mic size={16} />}
//           {isListening ? 'Stop Listening' : 'Start Listening'}
//         </span>
//       </button>
//       <h2 className="text-xl font-bold mt-2 mb-1">Live Transcript</h2>
//       <div className="flex-1 overflow-auto">
//         <div className="mt-auto border-t pt-2">
//           <h3 className="font-semibold">Transcript:</h3>
//           <p>{transcript || "Speak something..."}</p>
//         </div>
//       </div>
//     </div>
//   );
// };