import { auth } from "@/app/(auth)/auth";
import { getUserSettings, saveUserSettings } from "@/db/queries";

export async function GET() {
  const session = await auth();

  if (!session || !session.user) {
    return Response.json("Unauthorized!", { status: 401 });
  }

  const settings = await getUserSettings(session.user.id!);
  return Response.json(settings ?? { resumeText: null, resumeIncluded: false, systemMessage: null });
}

export async function POST(request: Request) {
  const session = await auth();

  if (!session || !session.user) {
    return Response.json("Unauthorized!", { status: 401 });
  }

  const body = await request.json();
  const { resumeText, resumeIncluded, systemMessage } = body;

  await saveUserSettings(session.user.id!, {
    resumeText: resumeText ?? null,
    resumeIncluded: resumeIncluded ?? false,
    systemMessage: systemMessage ?? null,
  });

  return Response.json({ success: true });
}
