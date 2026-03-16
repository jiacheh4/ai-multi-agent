import { auth } from "@/app/(auth)/auth";
import { setCaptureUrl } from "@/db/queries";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return Response.json("Unauthorized", { status: 401 });
  }

  let mode = "pending";
  try {
    const body = await request.json();
    if (body.mode === "ping") mode = "ping";
  } catch {
    // no body = default capture mode
  }

  await setCaptureUrl(session.user.id!, mode);
  return Response.json({ success: true });
}
