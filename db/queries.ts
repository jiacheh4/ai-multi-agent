"server-only";

import { genSaltSync, hashSync } from "bcrypt-ts";
import { and, desc, eq, ne, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import { user, chat, User } from "./schema";

// Optionally, if not using email/pass login, you can
// use the Drizzle adapter for Auth.js / NextAuth
// https://authjs.dev/reference/adapter/drizzle
let client = postgres(`${process.env.POSTGRES_URL!}?sslmode=require`);
let db = drizzle(client);

export async function getUser(email: string): Promise<Array<User>> {
  try {
    return await db.select().from(user).where(eq(user.email, email));
  } catch (error) {
    console.error("Failed to get user from database");
    throw error;
  }
}

export async function createUser(email: string, password: string) {
  let salt = genSaltSync(10);
  let hash = hashSync(password, salt);

  try {
    return await db.insert(user).values({ email, password: hash });
  } catch (error) {
    console.error("Failed to create user in database");
    throw error;
  }
}

export async function saveChat({
  id,
  messages,
  userId,
}: {
  id: string;
  messages: any;
  userId: string;
}) {
  try {
    const selectedChats = await db.select().from(chat).where(eq(chat.id, id));

    if (selectedChats.length > 0) {
      return await db
        .update(chat)
        .set({
          messages: JSON.stringify(messages),
        })
        .where(eq(chat.id, id));
    }

    return await db.insert(chat).values({
      id,
      createdAt: new Date(),
      messages: JSON.stringify(messages),
      userId,
    });
  } catch (error) {
    console.error("Failed to save chat in database");
    throw error;
  }
}

export async function deleteChatById({ id }: { id: string }) {
  try {
    return await db.delete(chat).where(eq(chat.id, id));
  } catch (error) {
    console.error("Failed to delete chat by id from database");
    throw error;
  }
}

export async function deleteChatsByUserId({ id }: { id: string }) {
  try {
    return await db.delete(chat).where(eq(chat.userId, id));
  } catch (error) {
    console.error("Failed to delete chats by user id from database");
    throw error;
  }
}

export async function getChatsByUserId({ id }: { id: string }) {
  try {
    return await db
      .select()
      .from(chat)
      .where(eq(chat.userId, id))
      .orderBy(desc(chat.createdAt));
  } catch (error) {
    console.error("Failed to get chats by user from database");
    throw error;
  }
}

export async function getChatById({ id }: { id: string }) {
  try {
    const [selectedChat] = await db.select().from(chat).where(eq(chat.id, id));
    return selectedChat;
  } catch (error) {
    console.error("Failed to get chat by id from database");
    throw error;
  }
}

export async function getUserSettings(userId: string) {
  try {
    const [result] = await db
      .select({
        resumeText: user.resumeText,
        resumeIncluded: user.resumeIncluded,
        systemMessage: user.systemMessage,
      })
      .from(user)
      .where(eq(user.id, userId));
    return result ?? null;
  } catch (error) {
    console.error("Failed to get user settings from database");
    throw error;
  }
}

export async function saveUserSettings(
  userId: string,
  settings: {
    resumeText?: string | null;
    resumeIncluded?: boolean;
    systemMessage?: string | null;
  },
) {
  try {
    return await db
      .update(user)
      .set(settings)
      .where(eq(user.id, userId));
  } catch (error) {
    console.error("Failed to save user settings to database");
    throw error;
  }
}

export async function deleteDuplicateTempUsers(keepUserId: string) {
  try {
    await db.delete(chat).where(
      and(
        eq(chat.userId, sql`ANY(SELECT "id" FROM "User" WHERE "email" = 'temp@example.com' AND "id" != ${keepUserId})`),
      ),
    );
    const result = await db
      .delete(user)
      .where(and(eq(user.email, "temp@example.com"), ne(user.id, keepUserId)));
    return result;
  } catch (error) {
    console.error("Failed to delete duplicate temp users");
    throw error;
  }
}
