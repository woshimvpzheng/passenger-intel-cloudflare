export function jsonResponse(payload, statusCode = 200) {
  return new Response(JSON.stringify(payload), {
    status: statusCode,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

export async function legacyResult(response) {
  return {
    statusCode: response.status,
    headers: Object.fromEntries(response.headers.entries()),
    body: await response.text(),
  };
}

export function legacyHandler(defaultHandler) {
  return async function handler(event = {}, context = {}) {
    const rawUrl = event.rawUrl || event.path || "http://127.0.0.1/";
    const url = new URL(rawUrl.startsWith("http") ? rawUrl : `http://127.0.0.1${rawUrl}`);
    for (const [key, value] of Object.entries(event.queryStringParameters || {})) {
      url.searchParams.set(key, value);
    }
    const response = await defaultHandler(new Request(url, {
      method: event.httpMethod || "GET",
      body: event.body || undefined,
    }), context);
    return legacyResult(response);
  };
}

export function oldJsonResponse(payload, statusCode = 200) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    },
    body: JSON.stringify(payload),
  };
}

export function parseQuery(event = {}) {
  return event.queryStringParameters || {};
}

export function badRequest(message) {
  return jsonResponse({ ok: false, message }, 400);
}
