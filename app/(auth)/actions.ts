"use server";

import { z } from "zod";

import { signIn, signOut, auth } from "@/app/(auth)/auth";
import { createUser, getUser, deleteChatsByUserId } from "@/db/queries";

const authFormSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export interface LoginActionState {
  status: "idle" | "in_progress" | "success" | "failed" | "invalid_data";
}

// -----------------------------SKIP LOGIN-----------------------------
export interface SkipActionState {
  status: "idle" | "in_progress" | "success" | "failed";
}

const generateTempCredentials = () => {
  return {
    email: `temp@example.com`,
    password: `temp`,
  };
};

export const skipLogin = async (
  _: SkipActionState
): Promise<SkipActionState> => {
  try {
    const tempCredentials = generateTempCredentials();
    
    // Create a temporary user
    await createUser(
      tempCredentials.email, 
      tempCredentials.password, 
      //true // isTemporary flag (you'll need to add this to your user schema)
    );
    
    // Sign in with temporary credentials
    await signIn("credentials", {
      email: tempCredentials.email,
      password: tempCredentials.password,
      redirect: false,
    });

    return { status: "success" };
  } catch (error) {
    console.error("Skip login error:", error);
    return { status: "failed" };
  }
};

export const cleanupTempSession = async (): Promise<void> => {
  try {
    // Get the current user from the session
    const session = await auth();
    
    if (session?.user?.email?.startsWith('temp')) {
      // Delete the temporary user's chat
      if (session.user.id) {
        await deleteChatsByUserId({ id: session.user.id });
      } else {
        throw new Error("User ID is undefined");
      }
      
      // Sign out
      await signOut({ redirect: false });
    }
  } catch (error) {
    console.error("Cleanup session error:", error);
  }
};

export async function handleSignOut() {
  // Cleanup temporary session
  await cleanupTempSession();

  await signOut({
    redirectTo: "/",
  });
}
// -----------------------------END OF SKIP LOGIN-----------------------------


export const login = async (
  _: LoginActionState,
  formData: FormData,
): Promise<LoginActionState> => {
  try {
    const validatedData = authFormSchema.parse({
      email: formData.get("email"),
      password: formData.get("password"),
    });

    await signIn("credentials", {
      email: validatedData.email,
      password: validatedData.password,
      redirect: false,
    });

    return { status: "success" };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { status: "invalid_data" };
    }

    return { status: "failed" };
  }
};

export interface RegisterActionState {
  status:
    | "idle"
    | "in_progress"
    | "success"
    | "failed"
    | "user_exists"
    | "invalid_data";
}

export const register = async (
  _: RegisterActionState,
  formData: FormData,
): Promise<RegisterActionState> => {
  try {
    const validatedData = authFormSchema.parse({
      email: formData.get("email"),
      password: formData.get("password"),
    });

    let [user] = await getUser(validatedData.email);

    if (user) {
      return { status: "user_exists" } as RegisterActionState;
    } else {
      await createUser(validatedData.email, validatedData.password);
      await signIn("credentials", {
        email: validatedData.email,
        password: validatedData.password,
        redirect: false,
      });

      return { status: "success" };
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { status: "invalid_data" };
    }

    return { status: "failed" };
  }
};
