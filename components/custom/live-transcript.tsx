"use client";

import { Camera, Globe, Mic, MicOff, Speaker, Wifi, WifiOff, Loader2 } from 'lucide-react';
import * as SpeechSDK from 'microsoft-cognitiveservices-speech-sdk';
import React, { useEffect, useState, useRef } from 'react';

import { CapturePopup } from './capture-popup';

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
  const [agentOnline, setAgentOnline] = useState<boolean | null>(null);
  const [agentChecking, setAgentChecking] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const [capturePopupUrl, setCapturePopupUrl] = useState<string | null>(null);
  const [captureLog, setCaptureLog] = useState<string[]>([]);

  // Refs for speech recognizer and timer
  const recognizerRef = useRef<SpeechSDK.SpeechRecognizer | null>(null);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);

  const SUPPORTED_LANGUAGES = [
    { code: 'en-US', short: 'EN', label: 'English' },
    { code: 'zh-CN', short: '中', label: '中文' },
  ] as const;

  const normalizeLanguage = (code: string) =>
    SUPPORTED_LANGUAGES.some(l => l.code === code) ? code : 'en-US';

  // Configuration state — keys come from env vars, overridable via localStorage
  const [config, setConfig] = useState({
    azureToken: process.env.NEXT_PUBLIC_AZURE_SPEECH_KEY || '',
    azureRegion: process.env.NEXT_PUBLIC_AZURE_SPEECH_REGION || '',
    language: 'en-US',
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
    const loadedConfig = {
      azureToken: localStorage.getItem('azure_token') || config.azureToken,
      azureRegion: localStorage.getItem('azure_region') || config.azureRegion,
      language: normalizeLanguage(localStorage.getItem('azure_language') || config.language),
    };
    setConfig(loadedConfig);

    const savedAudioSource = localStorage.getItem('audio_source');
    if (savedAudioSource === 'microphone' || savedAudioSource === 'system') {
      setAudioSource(savedAudioSource);
    }

    const handleAzureSettingsChange = () => {
      setConfig({
        azureToken: localStorage.getItem('azure_token') || process.env.NEXT_PUBLIC_AZURE_SPEECH_KEY || '',
        azureRegion: localStorage.getItem('azure_region') || process.env.NEXT_PUBLIC_AZURE_SPEECH_REGION || '',
        language: normalizeLanguage(localStorage.getItem('azure_language') || 'en-US'),
      });
    };
    window.addEventListener('azureSettingsChanged', handleAzureSettingsChange);

    return () => {
      recognizerRef.current?.stopContinuousRecognitionAsync();
      stopTimer();
      window.removeEventListener('azureSettingsChanged', handleAzureSettingsChange);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
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

      recognizer.canceled = (s, e) => {
        if (e.reason === SpeechSDK.CancellationReason.Error) {
          console.error('Speech recognition error:', e.errorCode, e.errorDetails);
          setTranscript(`Error: ${e.errorDetails} (code: ${e.errorCode})`);
          setIsListening(false);
          stopTimer();
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
    if (!isListening) {
      setAudioSource(prev => prev === 'microphone' ? 'system' : 'microphone');
    }
  };

  const handleLanguageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newLang = e.target.value;
    localStorage.setItem('azure_language', newLang);
    setConfig(prev => ({ ...prev, language: newLang }));
  };

  const handleClearTranscript = () => {
    setTranscript('');
    setInterimResult('');
  };

  const handleSendTranscript = async () => {
    // Combine the finalized transcript with any interim results
    const fullTranscript = transcript + (interimResult ? 
      (transcript && !transcript.endsWith('\n') ? '\n' : '') + interimResult : '');

    if (!fullTranscript || isProcessing) return;

    try {
      setIsProcessing(true);
      // Create a custom event with the combined transcript data
      const transcriptEvent = new CustomEvent('transcript-message', {
        detail: { content: fullTranscript }
      });

      // Dispatch the event to the window
      window.dispatchEvent(transcriptEvent);
      console.log("Transcript event dispatched:", fullTranscript);

      // Add a delay to ensure the button shows processing state
      await new Promise(resolve => setTimeout(resolve, 3000));

    } catch (error) {
      console.error("Error dispatching transcript event:", error);
    } finally {
      setIsProcessing(false);
    }
  };
  
  const addLog = (msg: string) => {
    const ts = new Date().toLocaleTimeString();
    setCaptureLog(prev => [...prev.slice(-19), `[${ts}] ${msg}`]);
  };

  const handleTestAgent = async () => {
    setAgentChecking(true);
    setAgentOnline(null);
    addLog("Testing connection...");
    try {
      // Check if token exists
      const statusRes = await fetch('/api/capture/status');
      if (!statusRes.ok) {
        addLog(`Status check failed: HTTP ${statusRes.status}`);
        setAgentOnline(false);
        return;
      }
      const statusData = await statusRes.json();
      if (!statusData.hasToken) {
        addLog("No capture token found. Generate one in Settings → Screen Capture.");
        setAgentOnline(false);
        return;
      }

      // Send a ping and wait for pong
      addLog("Token found. Pinging agent...");
      const pingRes = await fetch('/api/capture/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'ping' }),
      });
      if (!pingRes.ok) {
        addLog(`Ping request failed: HTTP ${pingRes.status}`);
        setAgentOnline(false);
        return;
      }

      // Poll for pong (agent should respond within 1-2s)
      let attempts = 0;
      const maxAttempts = 6;
      while (attempts < maxAttempts) {
        await new Promise(r => setTimeout(r, 500));
        const resultRes = await fetch('/api/capture/result');
        if (!resultRes.ok) break;
        const data = await resultRes.json();
        if (data.status === 'pong') {
          addLog("Agent responded — online!");
          setAgentOnline(true);
          return;
        }
        attempts++;
      }
      addLog("Agent did not respond within 3s. Is it running?");
      setAgentOnline(false);
    } catch (err) {
      addLog(`Connection error: ${err instanceof Error ? err.message : String(err)}`);
      setAgentOnline(false);
    } finally {
      setAgentChecking(false);
    }
  };

  const requestAndPollCapture = async (): Promise<string | null> => {
    addLog("Requesting capture...");
    const reqRes = await fetch('/api/capture/request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode: 'capture' }),
    });
    if (!reqRes.ok) {
      const body = await reqRes.text();
      addLog(`Request failed: HTTP ${reqRes.status} — ${body}`);
      return null;
    }
    addLog("Capture request sent. Waiting for agent to screenshot...");

    let attempts = 0;
    const maxAttempts = 20;
    while (attempts < maxAttempts) {
      await new Promise(r => setTimeout(r, 500));
      const resultRes = await fetch('/api/capture/result');
      if (!resultRes.ok) {
        addLog(`Poll failed: HTTP ${resultRes.status}`);
        return null;
      }
      const data = await resultRes.json();
      addLog(`Poll #${attempts + 1}: status=${data.status}`);
      if (data.status === 'ready' && data.url) {
        addLog("Screenshot received!");
        return data.url;
      }
      if (attempts === maxAttempts - 1) {
        addLog("Timed out — agent did not respond within 10s. Is it running?");
      }
      attempts++;
    }
    return null;
  };

  const handleCapture = async () => {
    setCapturing(true);
    try {
      const url = await requestAndPollCapture();
      if (url) setCapturePopupUrl(url);
    } catch (err) {
      addLog(`Capture error: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setCapturing(false);
    }
  };

  const handleCaptureAnother = async (): Promise<string | null> => {
    try {
      return await requestAndPollCapture();
    } catch (err) {
      addLog(`Capture error: ${err instanceof Error ? err.message : String(err)}`);
      return null;
    }
  };

  const currentLanguage = SUPPORTED_LANGUAGES.find(l => l.code === config.language) ?? SUPPORTED_LANGUAGES[0];

  return (
      <div className="flex-[1] rounded-md p-1 overflow-hidden h-full flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <div className="flex gap-2">
            {/* Elapsed time */}
            <div className="text-lg font-semibold">
              {formatTime(elapsedTime)}
            </div>
          </div>
          <div className="flex items-center gap-1">
            {/* Audio source selector */}
            <button
              onClick={toggleAudioSource}
              disabled={isListening}
              className="flex h-7 items-center gap-0.5 rounded border px-1.5 py-0.5 text-xs hover:bg-gray-100 disabled:opacity-50"
              title={isListening ? "Can't change audio source while listening" : "Toggle audio source"}
            >
              {audioSource === 'microphone' ? (
                <>
                  <Mic size={14} />
                  <span>Mic</span>
                </>
              ) : (
                <>
                  <Speaker size={14} />
                  <span>Sys</span>
                </>
              )}
            </button>

            {/* Language: closed state shows icon + EN/中; native menu shows English / 中文 */}
            <div
              className={`relative flex h-7 min-w-[3.25rem] items-center gap-0.5 rounded border px-1.5 py-0.5 hover:bg-gray-100 ${isListening ? 'opacity-50' : ''}`}
              title={isListening ? "Can't change language while listening" : "Select recognition language"}
            >
              <Globe size={14} className="pointer-events-none shrink-0" aria-hidden />
              <span className="pointer-events-none text-xs font-medium leading-none tabular-nums">
                {currentLanguage.short}
              </span>
              <select
                value={config.language}
                onChange={handleLanguageChange}
                disabled={isListening}
                aria-label="Recognition language"
                className="absolute inset-0 z-10 size-full cursor-pointer opacity-0 disabled:cursor-not-allowed dark:[&>option]:bg-neutral-900 dark:[&>option]:text-gray-100 [&>option]:bg-white [&>option]:text-gray-900"
              >
                {SUPPORTED_LANGUAGES.map(lang => (
                  <option key={lang.code} value={lang.code}>
                    {lang.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Start/Stop button */}
          {!isListening ? (
            <button 
              onClick={startVoiceRecognition} 
              className="bg-blue-500 text-white p-3 rounded hover:bg-blue-600"
            >
              <span className="flex items-center justify-center gap-1">
              {audioSource === 'microphone' ? <Mic size={16} /> : <Speaker size={16} />}
              { 'Start' }
              </span>
            </button>
          ) : (
            <button 
              onClick={stopVoiceRecognition} 
              className="bg-red-500 text-white p-3 rounded hover:bg-red-600"
            >
              <span className="flex items-center justify-center gap-2">
                {<MicOff size={16} />}
                { 'Stop' }
              </span>
            </button>
          )}
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
                className={`${isProcessing 
                  ? 'bg-yellow-500 hover:bg-yellow-600' 
                  : 'bg-blue-500 hover:bg-blue-600'} 
                  text-white px-2 py-3 rounded flex-1 transition-colors duration-200`}
                disabled={!transcript || isProcessing}
              >
                {isProcessing ? 'Sending...' : 'Send'}
              </button>
              <button 
                onClick={handleClearTranscript}
                className="bg-gray-500 text-white px-2 py-3 rounded hover:bg-gray-600 flex-1"
                disabled={(!transcript && !interimResult) || isProcessing}
              >
                Clear
              </button>
            </div>
          </div>
        </div>

        {/* Screen Capture Section */}
        <div className="border rounded p-2 flex flex-col gap-2">
          <h2 className="text-xs font-bold">Screen Capture</h2>
          <div className="flex gap-2">
            <button
              onClick={handleTestAgent}
              disabled={agentChecking}
              className="flex items-center gap-1 p-2 border rounded hover:bg-gray-100 transition-colors flex-1 justify-center"
            >
              {agentChecking ? (
                <Loader2 size={14} className="animate-spin" />
              ) : agentOnline ? (
                <Wifi size={14} className="text-green-500" />
              ) : agentOnline === false ? (
                <WifiOff size={14} className="text-red-500" />
              ) : (
                <Wifi size={14} />
              )}
              <span>
                {agentChecking ? 'Checking...' : agentOnline ? 'Agent Online' : agentOnline === false ? 'Agent Offline' : 'Test Connection'}
              </span>
            </button>
            <button
              onClick={handleCapture}
              disabled={capturing || agentOnline !== true}
              className="flex items-center gap-1 p-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 transition-colors flex-1 justify-center"
            >
              {capturing ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Camera size={14} />
              )}
              <span>{capturing ? 'Capturing...' : 'Capture Screen'}</span>
            </button>
          </div>

          {/* Capture log output */}
          {captureLog.length > 0 && (
            <div className="bg-muted/50 border rounded p-2 max-h-[120px] overflow-y-auto">
              {captureLog.map((line, i) => (
                <p key={i} className="text-[10px] font-mono text-muted-foreground leading-tight">
                  {line}
                </p>
              ))}
            </div>
          )}
        </div>
        
        {/* Capture popup rendered here */}
        {capturePopupUrl && (
          <CapturePopup
            imageUrl={capturePopupUrl}
            onClose={() => setCapturePopupUrl(null)}
            onCaptureAnother={handleCaptureAnother}
          />
        )}
      </div>
    );
  };