import { NextResponse } from "next/server";

export async function POST() {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { valid: false, error: "OPENAI_API_KEY not configured" },
      { status: 200 }
    );
  }

  try {
    const response = await fetch("https://api.openai.com/v1/models", {
      headers: { Authorization: `Bearer ${apiKey}` },
    });

    if (response.ok) {
      return NextResponse.json({ valid: true });
    }

    const data = await response.json();
    return NextResponse.json(
      { valid: false, error: data.error?.message || `Failed (${response.status})` },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      { valid: false, error: error instanceof Error ? error.message : "Connection failed" },
      { status: 200 }
    );
  }
}
