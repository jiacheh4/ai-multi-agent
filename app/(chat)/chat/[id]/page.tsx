import { CoreMessage } from "ai";
import { notFound } from "next/navigation";

import { auth } from "@/app/(auth)/auth";
import { Chat as PreviewChat } from "@/components/custom/chat";
import { LiveTranscript } from "@/components/custom/live-transcript";
import { getChatById } from "@/db/queries";
import { Chat } from "@/db/schema";
import { convertToUIMessages, generateUUID } from "@/lib/utils";

export default async function Page({ params }: { params: any }) {
  const { id } = params;
  const chatFromDb = await getChatById({ id });

  if (!chatFromDb) {
    notFound();
  }

  // type casting
  const chat: Chat = {
    ...chatFromDb,
    messages: convertToUIMessages(chatFromDb.messages as Array<CoreMessage>),
  };

  const session = await auth();

  if (!session || !session.user) {
    return notFound();
  }

  if (session.user.id !== chat.userId) {
    return notFound();
  }

  // Generate a new UUID for the transcript Chat
  const transcriptId = generateUUID();

  return (
    <div className="flex h-screen space-x-2 p-2">
      {/* Main Chat component with input */}
      <div className="flex-[3] border rounded-md p-2 overflow-hidden">
        <PreviewChat id={chat.id} initialMessages={chat.messages} />
      </div>
      {/* Live transcript Chat component */}
      <div className="flex-[1] border rounded-md p-2 overflow-hidden">
        <LiveTranscript />
      </div>
    </div>
  );
}
