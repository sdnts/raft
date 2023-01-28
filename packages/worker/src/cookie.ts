import { Err, Ok, Result } from "ts-results";
import { Env, isDev } from ".";

const COOKIE_NAME = "cluster";

export async function verifyCookie(
  cookieHeader: string,
  env: Env
): Promise<Result<string, Response>> {
  const cookies = cookieHeader.split(";");
  if (cookies.length !== 1) {
    return Err(
      new Response("Too many cookies", {
        status: 400,
      })
    );
  }

  const [name, value] = cookies[0].split("=");
  if (name !== COOKIE_NAME) {
    return Err(
      new Response("Could not find cluster cookie", {
        status: 400,
      })
    );
  }

  const encoder = new TextEncoder();
  const [clusterId] = value.split(".");
  const ok = isDev(env)
    ? value === (await signCookie(clusterId, env)) // Miniflare does not implement `timingSafeEqual`
    : crypto.subtle.timingSafeEqual(
        encoder.encode(value),
        encoder.encode(await signCookie(clusterId, env))
      );

  if (ok) return Ok(clusterId);
  return Err(
    new Response("Malformed cluster cookie (signature verification failure)", {
      status: 403,
    })
  );
}

export async function signCookie(
  clusterId: string,
  env: Pick<Env, "cookieSecret">
): Promise<string> {
  const key = await getKey(env, "sign");
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(clusterId)
  );

  return `${clusterId}.${arrayBufferToString(signature)}`;
}

function getKey(
  env: Pick<Env, "cookieSecret">,
  usage: "sign" | "verify"
): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const secret = encoder.encode(env.cookieSecret);

  return crypto.subtle.importKey(
    "raw",
    secret,
    { name: "HMAC", hash: "SHA-256" },
    false,
    [usage]
  );
}

function arrayBufferToString(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);

  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++)
    binary += String.fromCharCode(bytes[i]);

  return btoa(binary).replace(/\=+$/, "");
}
