import { auth } from "@/app/(auth)/auth";
import { getCaptureInfo, setCaptureUrl } from "@/db/queries";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return Response.json("Unauthorized", { status: 401 });
  }

  const info = await getCaptureInfo(session.user.id!);
  const captureUrl = info?.captureUrl ?? null;

  let status: "idle" | "pending" | "ping" | "pong" | "ready" = "idle";
  if (captureUrl === "pending") {
    status = "pending";
  } else if (captureUrl === "ping") {
    status = "ping";
  } else if (captureUrl === "pong") {
    status = "pong";
    // Auto-reset after reading pong
    await setCaptureUrl(session.user.id!, null);
  } else if (captureUrl) {
    status = "ready";
  }

  return Response.json({
    status,
    url: status === "ready" ? captureUrl : null,
  });
}
