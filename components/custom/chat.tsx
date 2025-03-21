"use client";

import { Attachment, Message } from "ai";
import { useChat } from "ai/react";
import { throttle } from "lodash";
import { useEffect, useRef, useState, useCallback, useMemo } from "react";

import { Message as PreviewMessage } from "@/components/custom/message";

import { MultimodalInput } from "./multimodal-input";
import { Overview } from "./overview";

// Add this type definition for the custom event
declare global {
  interface WindowEventMap {
    'transcript-message': CustomEvent<{ content: string }>;
    'settingsChanged': CustomEvent;
  }
}

// Type for settings
interface ChatSettings {
  modelId?: string;
  systemMessage?: string;
}

export function Chat({
  id,
  initialMessages,
}: {
  id: string;
  initialMessages: Array<Message>;
}) {
  // State for custom settings from localStorage
  const [settings, setSettings] = useState<ChatSettings>({});
  
  // Load settings from localStorage on component mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const storedModelId = localStorage.getItem("selectedModel");
      const storedSystemMessage = localStorage.getItem("systemMessage");
      
      // Only set settings if they exist in localStorage
      const newSettings: ChatSettings = {};
      if (storedModelId) newSettings.modelId = storedModelId;
      if (storedSystemMessage) newSettings.systemMessage = storedSystemMessage;
      
      if (Object.keys(newSettings).length > 0) {
        setSettings(newSettings);
      }
    }
  }, []);
  
  // Listen for changes to localStorage
  useEffect(() => {
    const handleSettingsChange = () => {
      const storedModelId = localStorage.getItem("selectedModel");
      const storedSystemMessage = localStorage.getItem("systemMessage");
      
      const newSettings: ChatSettings = {};
      if (storedModelId) newSettings.modelId = storedModelId;
      if (storedSystemMessage) newSettings.systemMessage = storedSystemMessage;
      
      setSettings(newSettings);
    };
    
    // Listen for the custom settingsChanged event
    document.addEventListener("settingsChanged", handleSettingsChange);
    
    return () => {
      document.removeEventListener("settingsChanged", handleSettingsChange);
    };
  }, []);
  
  const { messages, handleSubmit, input, setInput, append, isLoading, stop } =
    useChat({
      body: { 
        id,
        // Only include settings if they exist
        ...(Object.keys(settings).length > 0 && { settings })
      },
      initialMessages,
      onFinish: () => {
        window.history.replaceState({}, "", `/chat/${id}`);
      },
    });

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [attachments, setAttachments] = useState<Array<Attachment>>([]);
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true);
  const prevMessagesLengthRef = useRef(initialMessages.length);

  // Add debounced rendering optimization
  const visibleMessages = useMemo(() => {
    return messages;
  }, [messages]);
  
  // Add the event listener for the transcript message
  useEffect(() => {
    // Event handler function
    const handleTranscriptMessage = (event: CustomEvent<{ content: string }>) => {
      if (event.detail && event.detail.content) {
        // Send the transcript content using append
        append({
          role: 'user',
          content: event.detail.content,
        });
      }
    };

    // Add event listener when component mounts
    window.addEventListener('transcript-message', handleTranscriptMessage as EventListener);

    // Remove event listener when component unmounts
    return () => {
      window.removeEventListener('transcript-message', handleTranscriptMessage as EventListener);
    };
  }, [append]); // Include append in the dependency array

  // Set up scroll detection to determine if user has scrolled away
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Use throttled scroll handler to improve performance
    const handleScroll = throttle(() => {
      if (!container) return;
      
      const { scrollTop, scrollHeight, clientHeight } = container;
      const isAtBottom = Math.abs(scrollHeight - scrollTop - clientHeight) < 100;
      
      // Only update if the value is changing to avoid unnecessary re-renders
      if (isAtBottom !== shouldAutoScroll) {
        setShouldAutoScroll(isAtBottom);
      }
    }, 100); // Throttle to avoid excessive calculations

    container.addEventListener('scroll', handleScroll);
    return () => {
      handleScroll.cancel(); // Cancel any pending throttled calls
      container.removeEventListener('scroll', handleScroll);
    };
  }, [shouldAutoScroll]);

  // Handle initial load scrolling
  useEffect(() => {
    if (messages.length > 0 && messagesEndRef.current && shouldAutoScroll) {
      requestAnimationFrame(() => {
        if (messagesEndRef.current) {
          messagesEndRef.current.scrollIntoView({ behavior: 'auto' });
        }
      });
    }

    // Update previous message length
    prevMessagesLengthRef.current = messages.length;
  }, [messages, shouldAutoScroll]);

  // separate the callback from throttle
  const scrollToBottomCallback = useCallback(() => {
    if (messagesEndRef.current && shouldAutoScroll) {
      requestAnimationFrame(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
      });
    }
  }, [shouldAutoScroll]);
  
  // Memoize the throttled version of the callback
  const throttledScrollToBottom = useMemo(
    () => throttle(scrollToBottomCallback, 250), // Throttle to max once every 250ms
    [scrollToBottomCallback]
  );
  
  // Cleanup throttle on unmount
  useEffect(() => {
    return () => {
      throttledScrollToBottom.cancel();
    };
  }, [throttledScrollToBottom]);

  // Handle auto-scrolling during AI response generation
  useEffect(() => {
    if (isLoading && shouldAutoScroll) {
      throttledScrollToBottom();
    }
  }, [isLoading, shouldAutoScroll, messages.length, throttledScrollToBottom]);

  // Manual scroll to bottom function
  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'auto' });
      setShouldAutoScroll(true);
    }
  };

  return (
    <div className="flex flex-col size-full bg-background">
      {/* Chat messages container */}
      <div 
        ref={containerRef}
        className="grow flex flex-col gap-4 p-4 overflow-y-auto"
      >
        {visibleMessages.length === 0 ? (
          <div className="flex justify-center items-center grow">
            <Overview />
          </div>
        ) : (
          visibleMessages.map((message) => (
            <PreviewMessage
              key={message.id}
              role={message.role}
              content={message.content}
              attachments={message.experimental_attachments}
              toolInvocations={message.toolInvocations}
            />
          ))
        )}

        {/* Placeholder to keep scroll position at the bottom */}
        <div ref={messagesEndRef} className="shrink-0 min-w-[24px] min-h-[24px]" />
      </div>

      {/* Scroll to bottom button - show when not at bottom and there are messages */}
      {!shouldAutoScroll && messages.length > 0 && (
        <button
          onClick={scrollToBottom}
          className="absolute bottom-28 px-3 py-2 bg-primary text-primary-foreground rounded-full shadow-md hover:bg-primary/90 transition-all"
          aria-label="Scroll to bottom"
        >
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            width="24" 
            height="24" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2" 
            strokeLinecap="round" 
            strokeLinejoin="round"
          >
            <polyline points="6 9 12 15 18 9"></polyline>
          </svg>
        </button>
      )}

      {/* Input form */}
      <form className="flex flex-row gap-2 p-4 items-end w-full">
        <MultimodalInput
          input={input}
          setInput={setInput}
          handleSubmit={handleSubmit}
          isLoading={isLoading}
          stop={stop}
          attachments={attachments}
          setAttachments={setAttachments}
          messages={messages}
          append={append}
        />
      </form>
    </div>
  );
}