import { openai } from "@ai-sdk/openai";
import { experimental_wrapLanguageModel, convertToCoreMessages, Message, streamText } from "ai";
import { z } from "zod";

import { customModel, customSetting } from "@/ai";
import { customMiddleware } from "@/ai/custom-middleware";
import { auth } from "@/app/(auth)/auth";
import { deleteChatById, getChatById, saveChat } from "@/db/queries";


// Function to get settings from client request or use defaults from customModel/customSetting
function getSettings(requestSettings: { modelId?: string; systemMessage?: string }) {
  if (!requestSettings.modelId && !requestSettings.systemMessage) {
    console.log('Custom Setting not found. Using default model and system message');
    return {
      model: customModel,
      modelId: customModel.modelId,
      systemMessage: customSetting.systemMessage
    };
  }
  
  // Otherwise, use provided settings with fallbacks to fixed defaults
  const modelId = requestSettings.modelId || customModel.modelId;
  const systemMessage = requestSettings.systemMessage || customSetting.systemMessage;
  
  // If we're still using the default model, return it
  if (modelId === customModel.modelId) {
    return {
      model: customModel,
      modelId,
      systemMessage
    };
  }
  
  // Create model based on custom modelId
  let model;
  
  switch (modelId) {
    case "gpt-3.5-turbo":
      model = experimental_wrapLanguageModel({
        model: openai("gpt-3.5-turbo"),
        middleware: customMiddleware,
      });
      break;
    case "gpt-4o-mini":
      model = experimental_wrapLanguageModel({
        model: openai("gpt-4o-mini"),
        middleware: customMiddleware,
      });
      break;
    case "o3-mini":
    default:
      // Fallback to customModel if none of the custom options match
      model = customModel;
      break;
  }
  
  return { model, modelId, systemMessage };
}

export async function POST(request: Request) {
  const { 
    id,
    messages,
    settings = {}
  }: { 
    id: string; 
    messages: Array<Message>;
    settings?: {
      modelId?: string;
      systemMessage?: string;
    }
  } = await request.json();

  const session = await auth();

  if (!session) {
    return new Response("Unauthorized", { status: 401 });
  }

  // Get model and system message from request or defaults
  const { model, modelId, systemMessage } = getSettings(settings);
  console.log(` POST w/ model: ${modelId} systemMessage: ${systemMessage.slice(0, 30)}...`);

  const isO3Mini = modelId === "o3-mini";

  const coreMessages = convertToCoreMessages(messages);

  const result = await streamText({
    model,
    system: systemMessage,
    messages: coreMessages,
    maxSteps: 5,
    
    // Bugfix: https://github.com/openai/openai-python/issues/2072
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