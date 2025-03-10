"use client";

import { Attachment, ToolInvocation } from "ai";
import { motion } from "framer-motion";
import { ReactNode } from "react";

import { BotIcon, UserIcon } from "./icons";
import { Markdown } from "./markdown";
import { PreviewAttachment } from "./preview-attachment";
import { Weather } from "./weather";

export const Message = ({
  role,
  content,
  toolInvocations,
  attachments,
}: {
  role: string;
  content: string | ReactNode;
  toolInvocations: Array<ToolInvocation> | undefined;
  attachments?: Array<Attachment>;
}) => {
  return (
    <motion.div
    className={`flex flex-row gap-4 px-4 w-full md:px-0 first-of-type:pt-20 mb-6`}
      initial={{ y: 5, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
    >
      {role === "assistant" && (
        <div className="size-[24px] flex flex-col justify-center items-center shrink-0 text-zinc-400">
          <BotIcon />
        </div>
      )}

      <div className={`flex flex-col gap-2 w-full ${role === "user" ? "items-end pl-[32px]" : ""}`}>
        {content && (
          <div className={`text-zinc-800 dark:text-zinc-300 flex flex-col gap-4 ${role === "user" ? "items-end" : "max-w-[calc(100%-32px)]"}`}>
            <div className={`text-left ${role === "user" ? "max-w-fit bg-zinc-200 dark:bg-zinc-900 rounded-lg px-5 py-2" : ""}`}>
              <Markdown>{content as string}</Markdown>
            </div>
          </div>
        )}

        {toolInvocations && (
          <div className="flex flex-col gap-4">
            {toolInvocations.map((toolInvocation) => {
              const { toolName, toolCallId, state } = toolInvocation;

              if (state === "result") {
                const { result } = toolInvocation;

                return (
                  <div key={toolCallId}>
                    {toolName === "getWeather" ? (
                      <Weather weatherAtLocation={result} />
                    ) : null}
                  </div>
                );
              } else {
                return (
                  <div key={toolCallId} className="skeleton">
                    {toolName === "getWeather" ? <Weather /> : null}
                  </div>
                );
              }
            })}
          </div>
        )}

        {attachments && (
          <div className={`flex flex-row gap-2 ${role === "user" ? "justify-end" : ""}`}>
            {attachments.map((attachment) => (
              <PreviewAttachment key={attachment.url} attachment={attachment} />
            ))}
          </div>
        )}
      </div>
      
      {role === "user" && (
        <div className="size-[24px] flex flex-col justify-center items-center shrink-0 text-zinc-400">
          <UserIcon />
        </div>
      )}
    </motion.div>
  );
};