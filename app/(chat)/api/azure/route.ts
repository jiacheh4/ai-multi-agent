import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const { key, region } = await request.json();

  if (!key || !region) {
    return NextResponse.json(
      { valid: false, error: "Azure Speech key or region not configured" },
      { status: 200 }
    );
  }

  try {
    const response = await fetch(
      `https://${region}.api.cognitive.microsoft.com/sts/v1.0/issueToken`,
      {
        method: "POST",
        headers: {
          "Ocp-Apim-Subscription-Key": key,
          "Content-Length": "0",
        },
      }
    );

    if (response.ok) {
      return NextResponse.json({ valid: true });
    }

    const errorText = await response.text();
    return NextResponse.json(
      { valid: false, error: `Authentication failed (${response.status}): ${errorText}` },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      { valid: false, error: error instanceof Error ? error.message : "Connection failed" },
      { status: 200 }
    );
  }
}
