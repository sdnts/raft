import { useEffect } from "react";

type WebSocketHandlers = {
  onOpen?: (e: Event) => void;
  onMessage?: (e: MessageEvent) => void;
};

export function useWebSocket(url: string, handlers?: WebSocketHandlers) {
  useEffect(() => {
    const abortController = new AbortController();
    const ws = new WebSocket(url);

    ws.addEventListener(
      "open",
      (e) => {
        handlers?.onOpen?.(e);
      },
      { signal: abortController.signal }
    );

    ws.addEventListener(
      "message",
      (e) => {
        handlers?.onMessage?.(e);
      },
      { signal: abortController.signal }
    );

    return () => {
      abortController.abort();
    };
  }, []);

  return {};
}
