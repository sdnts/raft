import type { ClientMessage } from "@raft/common";
import { unpack } from "msgpackr";
import { useEffect, useRef } from "react";

type WebSocketHandlers = {
  onOpen?: (e: Event) => void;
  onMessage?: (message: ClientMessage) => void;
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
        const msg: ClientMessage = unpack(new Uint8Array(data));
        handlers?.onMessage?.(msg);
      },
      { signal: abortController.signal }
    );

    return () => {
      abortController.abort();
    };
  }, []);

  return websocket;
}
