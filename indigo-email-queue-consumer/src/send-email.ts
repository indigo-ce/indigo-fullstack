interface PlunkSuccessResponse {
  success: boolean;
  timestamp: string;
}

export async function sendEmailWithPlunk(
  to: string,
  subject: string,
  body: string,
  plunkAPIKey: string,
  sendEmailFrom?: string
): Promise<PlunkSuccessResponse> {
  const fromString = sendEmailFrom || "Indigo Stack <noreply@indigo.example>";
  const match = fromString.match(/^(.+?)\s*<(.+?)>$/);

  const from = match
    ? {name: match[1].trim(), email: match[2].trim()}
    : {name: "Indigo Stack", email: fromString};

  const response = await fetch("https://next-api.useplunk.com/v1/send", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${plunkAPIKey}`
    },
    body: JSON.stringify({to, subject, body, from, subscribed: false})
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(
      `Plunk API error: ${(result as any).message || JSON.stringify(result)}`
    );
  }

  return result as PlunkSuccessResponse;
}
