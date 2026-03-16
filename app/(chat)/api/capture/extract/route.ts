import { openai } from "@ai-sdk/openai";
import { generateText } from "ai";

import { auth } from "@/app/(auth)/auth";

const EXTRACTION_PROMPT = `Extract ALL text from this image exactly as shown. This is a coding problem (likely LeetCode format).

Critical rules for accuracy:
- Preserve the EXACT formatting, indentation, and layout
- Pay extreme attention to these commonly confused characters:
  - 1 (one) vs l (lowercase L) vs I (uppercase i)
  - 0 (zero) vs O (uppercase o)
  - [] (square brackets) vs () (parentheses) vs {} (curly braces)
  - Distinguish carefully between: - (hyphen), – (en dash), — (em dash)
  - ' (straight quote) vs ' ' (curly quotes)
- For arrays and matrices: reproduce bracket types exactly as shown, e.g. nums[i], grid[row][col], [[1,2],[3,4]]
- For mathematical expressions: use ^ for superscripts (e.g. 10^9, 2^31), preserve <= >= != == exactly
- For constraints like "1 <= n <= 10^5", reproduce the exact notation shown
- Preserve code block formatting: function signatures, variable names, and syntax exactly as displayed
- If the image contains Example inputs/outputs, reproduce them precisely including all brackets, commas, and spacing

Output ONLY the extracted text. Do not add explanations or commentary.`;

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return Response.json("Unauthorized", { status: 401 });
  }

  const { image } = await request.json();
  if (!image) {
    return Response.json({ error: "No image provided" }, { status: 400 });
  }

  try {
    const result = await generateText({
      model: openai("gpt-5.4"),
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: EXTRACTION_PROMPT },
            { type: "image", image },
          ],
        },
      ],
    });

    return Response.json({ text: result.text });
  } catch (error) {
    console.error("Failed to extract text from image:", error);
    return Response.json({ error: "Text extraction failed" }, { status: 500 });
  }
}
