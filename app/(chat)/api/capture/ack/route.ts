import { getUserByCaptureToken, setCaptureUrl } from "@/db/queries";

export async function POST(request: Request) {
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.replace("Bearer ", "");

  if (!token) {
    return Response.json("Unauthorized", { status: 401 });
  }

  const userRow = await getUserByCaptureToken(token);
  if (!userRow) {
    return Response.json("Invalid token", { status: 401 });
  }

  await setCaptureUrl(userRow.id, "pong");
  return Response.json({ success: true });
}
