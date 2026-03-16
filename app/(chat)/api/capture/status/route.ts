import { auth } from "@/app/(auth)/auth";
import { getCaptureInfo } from "@/db/queries";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return Response.json("Unauthorized", { status: 401 });
  }

  const info = await getCaptureInfo(session.user.id!);
  return Response.json({
    token: info?.captureToken ?? null,
    hasToken: !!info?.captureToken,
  });
}
