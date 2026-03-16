import { auth } from "@/app/(auth)/auth";
import { generateCaptureToken } from "@/db/queries";

export async function POST() {
  const session = await auth();
  if (!session?.user) {
    return Response.json("Unauthorized", { status: 401 });
  }

  const token = await generateCaptureToken(session.user.id!);
  return Response.json({ token });
}
