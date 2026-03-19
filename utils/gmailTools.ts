import { apiFetch } from "./api";

export async function searchEmails(params: unknown): Promise<string> {
  const { query, maxResults = 5 } = params as {
    query: string;
    maxResults?: number;
  };

  try {
    const res = await apiFetch("/gmail/search", {
      method: "POST",
      body: JSON.stringify({ query, max_results: maxResults }),
    });

    if (res.status === 401) {
      return "Error: Not signed in to Google. Please sign in first.";
    }

    const data = await res.json();
    if (!res.ok) {
      return `Error searching emails: ${data.detail ?? res.statusText}`;
    }

    return data.result;
  } catch (error) {
    return `Error searching emails: ${error}`;
  }
}

export async function readEmail(params: unknown): Promise<string> {
  const { messageId } = params as { messageId: string };

  try {
    const res = await apiFetch("/gmail/read", {
      method: "POST",
      body: JSON.stringify({ message_id: messageId }),
    });

    if (res.status === 401) {
      return "Error: Not signed in to Google. Please sign in first.";
    }

    const data = await res.json();
    if (!res.ok) {
      return `Error reading email: ${data.detail ?? res.statusText}`;
    }

    return data.result;
  } catch (error) {
    return `Error reading email: ${error}`;
  }
}

export async function sendEmail(params: unknown): Promise<string> {
  const { to, subject, body } = params as {
    to: string;
    subject: string;
    body: string;
  };

  try {
    const res = await apiFetch("/gmail/send", {
      method: "POST",
      body: JSON.stringify({ to, subject, body }),
    });

    if (res.status === 401) {
      return "Error: Not signed in to Google. Please sign in first.";
    }

    const data = await res.json();
    if (!res.ok) {
      return `Error sending email: ${data.detail ?? res.statusText}`;
    }

    return data.result;
  } catch (error) {
    return `Error sending email: ${error}`;
  }
}
