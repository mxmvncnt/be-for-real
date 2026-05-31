const NTFY_TOPIC_URL = "https://ntfy.sh/be-for-real-reminders/sse";

export function startNtfyBrowserNotifications() {
  if (!("Notification" in window)) {
    console.warn("Browser notifications are not supported in this browser.");
    return () => {};
  }

  const connect = () => {
    const source = new EventSource(NTFY_TOPIC_URL);

    source.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as {
          title?: string;
          message?: string;
        };

        if (Notification.permission === "granted") {
          new Notification(data.title ?? "Be For Real", {
            body: data.message ?? "Time to record a new video.",
          });
        } else {
          console.log("ntfy push:", data);
        }
      } catch (error) {
        console.error("Failed to parse ntfy message:", error);
      }
    };

    source.onerror = (error) => {
      console.error("ntfy stream error:", error);
      source.close();
    };

    return source;
  };

  const requestAndConnect = async () => {
    if (Notification.permission === "default") {
      await Notification.requestPermission();
    }

    return connect();
  };

  const sourcePromise = requestAndConnect();

  return () => {
    void sourcePromise.then((source) => source.close());
  };
}