import { useEffect, useRef, useState, useCallback } from "react";

export function useSocket(url: string) {
  const socketRef = useRef<WebSocket | null>(null);
  const [messages, setMessages] = useState<string[]>([]);

  // Connect + set up listeners
  useEffect(() => {
    const ws = new WebSocket(url);
    socketRef.current = ws;

    ws.onopen = () => console.log("✅ websocket connected");
    ws.onmessage = (e) => setMessages((prev) => [...prev, e.data]);
    ws.onerror = (e) => console.error("WebSocket error:", e);
    ws.onclose = () => console.log("💤 websocket closed");

    // Clean‑up on unmount or URL change
    return () => ws.close();
  }, [url]);

  // Helper to send only when the socket is ready
  const send = useCallback((data: string) => {
    const ws = socketRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) ws.send(data);
    else console.warn("WebSocket not ready");
  }, []);

  return { messages, send };
}
