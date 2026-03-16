import { getUserByCaptureToken } from "@/db/queries";

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.replace("Bearer ", "");

  if (!token) {
    return Response.json("Unauthorized", { status: 401 });
  }

  const result = await getUserByCaptureToken(token);
  if (!result) {
    return Response.json("Invalid token", { status: 401 });
  }

  const url = result.captureUrl;
  return Response.json({
    pending: url === "pending" || url === "ping",
    mode: url === "ping" ? "ping" : url === "pending" ? "capture" : "idle",
  });
}
