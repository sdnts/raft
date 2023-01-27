import type { LinksFunction, MetaFunction } from "@remix-run/cloudflare";
import {
  Links,
  LiveReload,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
} from "@remix-run/react";
import clsx from "clsx";
import styles from "./styles.css";

export const meta: MetaFunction = () => ({
  charset: "utf-8",
  title: "Raft",
  viewport: "width=device-width,initial-scale=1",
});

export const links: LinksFunction = () => {
  return [
    { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
    { rel: "preconnect", href: "https://fonts.bunny.net" },
    {
      rel: "stylesheet",
      href: "https://fonts.bunny.net/css?family=jetbrains-mono:200,400,700",
    },
    { rel: "stylesheet", href: styles },
  ];
};

export default function App() {
  return (
    <html lang="en">
      <head>
        <Meta />
        <Links />
      </head>
      <body
        className={clsx(
          "w-screen h-screen m-0 p-0 overflow-hidden",
          "bg-black",
          "font-mono",
          "flex flex-col items-center"
        )}
      >
        <Outlet />
        <ScrollRestoration />
        <Scripts />
        <LiveReload />
      </body>
    </html>
  );
}
