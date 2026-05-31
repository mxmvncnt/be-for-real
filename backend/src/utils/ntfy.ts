type NtfyPublishOptions = {
  baseUrl: string;
  topic: string;
  title: string;
  message: string;
  clickUrl?: string;
  tags?: string;
  priority?: "min" | "low" | "default" | "high" | "max";
  authHeader?: string;
};

function trimTrailingSlashes(value: string) {
  return value.replace(/\/+$/, "");
}

export async function publishNtfyMessage(options: NtfyPublishOptions) {
  const url = `${trimTrailingSlashes(options.baseUrl)}/${encodeURIComponent(options.topic)}`;

  const headers: Record<string, string> = {
    "Content-Type": "text/plain; charset=utf-8",
    Title: options.title,
    Priority: options.priority ?? "default",
  };

  if (options.tags) {
    headers.Tags = options.tags;
  }

  if (options.clickUrl) {
    headers.Click = options.clickUrl;
  }

  if (options.authHeader) {
    headers.Authorization = options.authHeader;
  }

	console.log("About to fetch for notification api:");

  const response = await fetch(url, {
    method: "POST",
    headers,
    body: options.message,
  });

	console.log("About to push notification with status:", response.status);

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    throw new Error(
      `ntfy publish failed with status ${response.status}${errorText ? `: ${errorText}` : ""}`,
    );
  }
}
