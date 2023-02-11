import { useEffect, useRef } from "react";
import { ClientMessage, deserialize } from "../rpc";

type WebSocketHandlers = {
  onOpen?: (e: Event) => void;
  onMessage?: (message: ClientMessage) => void;
  onClose?: (e: Event) => void;
};

export function useWebSocket(url: string, handlers?: WebSocketHandlers) {
  const websocket = useRef<WebSocket>();
  useEffect(() => {
    const abortController = new AbortController();
    const ws = new WebSocket(url);
    websocket.current = ws;

    ws.addEventListener(
      "open",
      (e) => {
        handlers?.onOpen?.(e);
      },
      { signal: abortController.signal }
    );

    ws.addEventListener(
      "message",
      async (e: MessageEvent<Blob>) => {
        const data = await e.data.arrayBuffer();
        const msg = deserialize<ClientMessage>(data);
        if (msg.err) {
          return;
        }
        handlers?.onMessage?.(msg.val);
      },
      { signal: abortController.signal }
    );

    ws.addEventListener(
      "close",
      (e) => {
        handlers?.onClose?.(e);
      },
      { signal: abortController.signal }
    );

    return () => {
      abortController.abort();
    };
  }, []);

  return websocket;
}
