import { convertToCoreMessages, Message, streamText } from "ai";
import { z } from "zod";

import { customModel } from "@/ai";
import { auth } from "@/app/(auth)/auth";
import { deleteChatById, getChatById, saveChat } from "@/db/queries";

export async function POST(request: Request) {
  const { id, messages }: { id: string; messages: Array<Message> } =
    await request.json();

  const session = await auth();

  if (!session) {
    return new Response("Unauthorized", { status: 401 });
  }

  const isO3Mini = customModel.modelId === "o3-mini";

  const coreMessages = convertToCoreMessages(messages);

  const result = await streamText({
    model: customModel,
    system:`
    You are an Interview Assistant, playing the role of the interviewee (the user). 
    Your responses should be well-structured, using the following format:

    ### Title: 
    Provide a clear and concise title for your response.

    ### Summary:
    Begin with a clear, concise summary of your main point or conclusion. This should directly address the question asked.

    ### Key Points:
    - Present logical and coherent statements that support your summary.
    - Use **bold** text to highlight important concepts.
    - Consider using _italics_ for emphasis on specific terms.

    ### Supporting Details:
    - For each key point, provide brief details or examples to back up your statements. 
    - Ensure these examples are relevant and showcase your skills or experiences.

    ### Code Example in Python (ignore this part if it is not coding question):
    - If it is a coding question, please include the code in python, use the common approach first, and then optimal solutions, and then include follow-up questions.

    Remember:
    - Keep responses direct and to the point.
    - Structure your answers logically to demonstrate critical thinking and problem-solving abilities.
    - Ensure your answers are organized, detailed, and easy to read for maximum comprehension.`,

    messages: coreMessages,
    maxSteps: 5,

    ...(isO3Mini ? {temperature: 1, topP: 1} : {}),

    tools: {
      getWeather: {
        description: "Get the current weather at a location",
        parameters: z.object({
          latitude: z.number(),
          longitude: z.number(),
        }),
        execute: async ({ latitude, longitude }) => {
          const response = await fetch(
            `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m&hourly=temperature_2m&daily=sunrise,sunset&timezone=auto`,
          );

          const weatherData = await response.json();
          return weatherData;
        },
      },
    },
    onFinish: async ({ responseMessages }) => {
      if (session.user && session.user.id) {
        try {
          await saveChat({
            id,
            messages: [...coreMessages, ...responseMessages],
            userId: session.user.id,
          });
        } catch (error) {
          console.error("Failed to save chat");
        }
      }
    },
    experimental_telemetry: {
      isEnabled: true,
      functionId: "stream-text",
    },
  });

  return result.toDataStreamResponse({});
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return new Response("Not Found", { status: 404 });
  }

  const session = await auth();

  if (!session || !session.user) {
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    const chat = await getChatById({ id });

    if (chat.userId !== session.user.id) {
      return new Response("Unauthorized", { status: 401 });
    }

    await deleteChatById({ id });

    return new Response("Chat deleted", { status: 200 });
  } catch (error) {
    return new Response("An error occurred while processing your request", {
      status: 500,
    });
  }
}
