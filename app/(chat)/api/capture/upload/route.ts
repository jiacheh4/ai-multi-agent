import { put } from "@vercel/blob";

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

  const formData = await request.formData();
  const file = formData.get("file") as File;

  if (!file) {
    return Response.json({ error: "No file uploaded" }, { status: 400 });
  }

  const fileBuffer = await file.arrayBuffer();
  const blob = await put(`capture-${Date.now()}.png`, fileBuffer, {
    access: "public",
  });

  await setCaptureUrl(userRow.id, blob.url);
  return Response.json({ success: true });
}
