type AnthropicTextBlock = { type: "text"; text: string };
type AnthropicImageBlock = {
  type: "image";
  source: { type: "base64"; media_type: "image/png"; data: string };
};

export type AnthropicUserContent = string | (AnthropicTextBlock | AnthropicImageBlock)[];

export async function callAnthropicMessages(params: {
  apiKey: string;
  model: string;
  system: string;
  user: AnthropicUserContent;
  maxTokens?: number;
}): Promise<{ text: string | null; error: string | null }> {
  const userContent =
    typeof params.user === "string"
      ? [{ type: "text" as const, text: params.user }]
      : params.user;

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": params.apiKey,
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: params.model,
      max_tokens: params.maxTokens ?? 4096,
      system: params.system,
      messages: [{ role: "user", content: userContent }],
      temperature: 0.2,
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    console.error("[anthropic] HTTP", res.status, body);
    return {
      text: null,
      error: `Anthropic API error ${res.status}${body ? `: ${body.slice(0, 200)}` : ""}`,
    };
  }

  const data = (await res.json()) as {
    content?: { type: string; text?: string }[];
  };
  const textBlock = data.content?.find((block) => block.type === "text");
  return { text: textBlock?.text ?? null, error: textBlock?.text ? null : "Empty Anthropic response" };
}

export function anthropicUserWithImage(userText: string, imagePng: Buffer): AnthropicUserContent {
  return [
    {
      type: "image",
      source: {
        type: "base64",
        media_type: "image/png",
        data: imagePng.toString("base64"),
      },
    },
    { type: "text", text: userText },
  ];
}
