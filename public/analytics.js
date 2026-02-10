(function () {
  const scriptTag = document.currentScript;
  const publicKey = scriptTag?.getAttribute("data-public-key");
  const scriptSrc = scriptTag?.src || "";
  const apiOrigin = scriptSrc ? new URL(scriptSrc).origin : window.location.origin;
  const API_URL = apiOrigin + "/api/analytics/collect";

  if (!publicKey) {
    console.error("Analytics: data-public-key attribute is required");
    return;
  }

  const SESSION_KEY = "firecrawler_session_id";

  const generateId = () => {
    if (window.crypto?.randomUUID) {
      return window.crypto.randomUUID();
    }
    return `sess_${Math.random().toString(36).slice(2)}_${Date.now()}`;
  };

  const getSessionId = () => {
    let sessionId = localStorage.getItem(SESSION_KEY);
    if (!sessionId) {
      sessionId = generateId();
      localStorage.setItem(SESSION_KEY, sessionId);
    }
    return sessionId;
  };

  const sessionId = getSessionId();
  const eventQueue = [];
  let flushTimeout = null;

  const enqueueEvent = (event) => {
    eventQueue.push(event);
    if (eventQueue.length >= 5) {
      flushEvents();
      return;
    }
    if (!flushTimeout) {
      flushTimeout = window.setTimeout(flushEvents, 3000);
    }
  };

  const flushEvents = () => {
    if (flushTimeout) {
      window.clearTimeout(flushTimeout);
      flushTimeout = null;
    }
    if (eventQueue.length === 0) return;
    const batch = eventQueue.splice(0, eventQueue.length);
    batch.forEach((payload) => {
      fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        keepalive: true,
      }).catch(() => {
        // Silently ignore analytics failures
      });
    });
  };

  const sendEvent = (eventType, data = {}) => {
    enqueueEvent({
      publicKey,
      sessionId,
      eventType,
      path: window.location.pathname,
      referrer: document.referrer || undefined,
      userAgent: navigator.userAgent,
      timestamp: new Date().toISOString(),
      ...data,
    });
  };

  sendEvent("SESSION_START");

  window.addEventListener("load", () => {
    const navEntry = performance.getEntriesByType("navigation")[0];
    const loadTimeMs = navEntry ? Math.round(navEntry.duration) : undefined;
    sendEvent("PAGEVIEW", {
      loadTimeMs,
    });
  });

  document.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    const elementTag = target.tagName.toLowerCase();
    const elementText = target.textContent
      ? target.textContent.trim().slice(0, 80)
      : undefined;
    sendEvent("CLICK", {
      elementTag,
      elementText,
    });
  });

  window.addEventListener("beforeunload", flushEvents);
})();
