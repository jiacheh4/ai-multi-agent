"use client";

import { Attachment, Message, ChatRequestOptions, CreateMessage } from "ai";
import { useChat } from "ai/react";
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
  resumeText?: string;
  preferredLanguage?: string;
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
      const resumeIncluded = localStorage.getItem("resumeIncluded") === "true";
      const storedResume = resumeIncluded ? localStorage.getItem("resumeText") : null;
      const storedLanguage = localStorage.getItem("preferredLanguage");
      
      const newSettings: ChatSettings = {};
      if (storedModelId) newSettings.modelId = storedModelId;
      if (storedSystemMessage) newSettings.systemMessage = storedSystemMessage;
      if (storedResume) newSettings.resumeText = storedResume;
      if (storedLanguage && storedLanguage !== 'default') newSettings.preferredLanguage = storedLanguage;
      
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
      const resumeIncluded = localStorage.getItem("resumeIncluded") === "true";
      const storedResume = resumeIncluded ? localStorage.getItem("resumeText") : null;
      const storedLanguage = localStorage.getItem("preferredLanguage");
      
      const newSettings: ChatSettings = {};
      if (storedModelId) newSettings.modelId = storedModelId;
      if (storedSystemMessage) newSettings.systemMessage = storedSystemMessage;
      if (storedResume) newSettings.resumeText = storedResume;
      if (storedLanguage && storedLanguage !== 'default') newSettings.preferredLanguage = storedLanguage;
      
      setSettings(newSettings);
    };
    
    // Listen for the custom settingsChanged event
    document.addEventListener("settingsChanged", handleSettingsChange);
    
    return () => {
      document.removeEventListener("settingsChanged", handleSettingsChange);
    };
  }, []);
  
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [attachments, setAttachments] = useState<Array<Attachment>>([]);
  const [initialScrollDone, setInitialScrollDone] = useState(false);
  const [shouldScrollAfterUserMessage, setShouldScrollAfterUserMessage] = useState(false);
  
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
  
  // Custom submit handler that triggers scroll after user message
  // Using the correct type signature to match what MultimodalInput expects
  const customHandleSubmit = useCallback(
    (
      event?: { preventDefault?: () => void } | undefined,
      chatRequestOptions?: ChatRequestOptions | undefined
    ) => {
      // Set flag to scroll after the user message is added
      setShouldScrollAfterUserMessage(true);
      // Submit the form using the original handleSubmit
      return handleSubmit(event, chatRequestOptions);
    }, 
    [handleSubmit]
  );

  // Track the previous message count to detect new messages
  const prevMessagesCountRef = useRef(initialMessages.length);
  
  // Add the event listener for the transcript message
  useEffect(() => {
    const handleTranscriptMessage = (event: CustomEvent<{ content: string; attachments?: Array<{ url: string; name: string; contentType: string }> }>) => {
      if (event.detail && event.detail.content) {
        setShouldScrollAfterUserMessage(true);
        append(
          {
            role: 'user',
            content: event.detail.content,
          },
          event.detail.attachments
            ? { experimental_attachments: event.detail.attachments }
            : undefined,
        );
      }
    };

    // Add event listener when component mounts
    window.addEventListener('transcript-message', handleTranscriptMessage as EventListener);

    // Remove event listener when component unmounts
    return () => {
      window.removeEventListener('transcript-message', handleTranscriptMessage as EventListener);
    };
  }, [append]); // Include append in the dependency array

  // SIMPLIFIED SCROLL LOGIC:
  // 1. Scroll on initial load (once)
  // 2. Scroll when user sends a message
  useEffect(() => {
    // Check if messages have changed since last render
    const messageCountChanged = prevMessagesCountRef.current !== messages.length;
    
    // Only scroll on initial load
    if (messages.length > 0 && !initialScrollDone && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'auto' });
      setInitialScrollDone(true);
    }
    // Scroll when user sends a message
    else if (shouldScrollAfterUserMessage && messageCountChanged && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
      setShouldScrollAfterUserMessage(false);
    }
    
    // Update previous count
    prevMessagesCountRef.current = messages.length;
  }, [messages.length, initialScrollDone, shouldScrollAfterUserMessage]);
  
  // Add manual scroll to bottom button
  const scrollToBottom = useCallback(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, []);

  // Optimization: Only render what's needed
  const visibleMessages = useMemo(() => {
    // If you have very long conversations, consider limiting to last N messages
    // return messages.slice(-50); // Show only last 50 messages
    return messages;
  }, [messages]);

  // Custom append function that also triggers scroll
  // Use the exact same type signature as the original append function
  const customAppend = useCallback((
    message: Message | CreateMessage, 
    chatRequestOptions?: ChatRequestOptions
  ) => {
    setShouldScrollAfterUserMessage(true);
    return append(message, chatRequestOptions);
  }, [append]);

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

      {/* Scroll to bottom button - always show when there are messages */}
      {messages.length > 0 && (
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
      <form 
        className="flex flex-row gap-2 p-4 items-end w-full" 
        onSubmit={(e) => {
          e.preventDefault();
          setShouldScrollAfterUserMessage(true);
          handleSubmit(e);
        }}
      >
        <MultimodalInput
          input={input}
          setInput={setInput}
          handleSubmit={customHandleSubmit}
          isLoading={isLoading}
          stop={stop}
          attachments={attachments}
          setAttachments={setAttachments}
          messages={messages}
          append={customAppend}
        />
      </form>
    </div>
  );
}