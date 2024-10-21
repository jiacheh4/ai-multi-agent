"use client";

import { Attachment, Message } from "ai";
import { useChat } from "ai/react";
import { useEffect, useRef, useState } from "react";

import { Message as PreviewMessage } from "@/components/custom/message";

import { MultimodalInput } from "./multimodal-input";
import { Overview } from "./overview";

export function Chat({
  id,
  initialMessages,
}: {
  id: string;
  initialMessages: Array<Message>;
}) {
  const { messages, handleSubmit, input, setInput, append, isLoading, stop } =
    useChat({
      body: { id },
      initialMessages,
      onFinish: () => {
        window.history.replaceState({}, "", `/chat/${id}`);
      },
    });

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const [attachments, setAttachments] = useState<Array<Attachment>>([]);

  // Scroll to the bottom when messages are first loaded
  useEffect(() => {
    if (messages.length > 0 && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView();
    }
  }, [messages]);

  return (
    <div className="flex flex-col size-full bg-background">
      {/* Chat messages container */}
      <div className="grow flex flex-col gap-4 p-4 overflow-y-auto">
      {messages.length === 0 ? (
        <div className="flex justify-center items-center grow">
          <Overview />
        </div>
      ) : (
        messages.map((message) => (
          <PreviewMessage
            key={message.id}
            role={message.role}
            content={message.content}
            attachments={message.experimental_attachments}
            toolInvocations={message.toolInvocations}
          />
        ))
      )}

        {messages.map((message) => (
          <PreviewMessage
            key={message.id}
            role={message.role}
            content={message.content}
            attachments={message.experimental_attachments}
            toolInvocations={message.toolInvocations}
          />
        ))}

        {/* Placeholder to keep scroll position at the bottom */}
        <div ref={messagesEndRef} className="shrink-0 min-w-[24px] min-h-[24px]" />
      </div>

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
