import "server-only";

import { connect as connectNet, type Socket } from "node:net";
import { connect as connectTls, type TLSSocket } from "node:tls";
import { randomUUID } from "node:crypto";

import { buildMimeMessage } from "./configured-email-adapters";
import type { EmailProviderAdapter, EmailSyncResult } from "./email-adapters";
import type { ProviderMode } from "./types";
import type { ValidatedSmtpConfiguration } from "./smtp";

type SmtpResponse = { code: number; text: string };
type SmtpSocket = Socket | TLSSocket;

function response(socket: SmtpSocket): Promise<SmtpResponse> {
  return new Promise((resolve, reject) => {
    let buffer = "";
    const cleanup = () => {
      socket.off("data", onData);
      socket.off("error", onError);
      socket.off("timeout", onTimeout);
    };
    const onError = (error: Error) => {
      cleanup();
      reject(error);
    };
    const onTimeout = () => {
      cleanup();
      reject(new Error("SMTP operation timed out."));
    };
    const onData = (chunk: Buffer) => {
      buffer += chunk.toString("utf8");
      const lines = buffer.split(/\r?\n/).filter(Boolean);
      const final = lines.findLast((line) => /^\d{3} /.test(line));
      if (!final) return;
      cleanup();
      resolve({ code: Number(final.slice(0, 3)), text: lines.join("\n") });
    };
    socket.on("data", onData);
    socket.once("error", onError);
    socket.once("timeout", onTimeout);
  });
}

async function command(
  socket: SmtpSocket,
  value: string,
  accepted: number[],
): Promise<SmtpResponse> {
  socket.write(`${value}\r\n`);
  const result = await response(socket);
  if (!accepted.includes(result.code))
    throw new Error(`SMTP command failed with ${result.code}.`);
  return result;
}

async function openSocket(
  configuration: ValidatedSmtpConfiguration,
): Promise<SmtpSocket> {
  const socket = configuration.secure
    ? connectTls({
        host: configuration.address,
        port: configuration.port,
        servername: configuration.host,
        rejectUnauthorized: true,
      })
    : connectNet({
        host: configuration.address,
        port: configuration.port,
        family: configuration.family,
      });
  socket.setTimeout(10_000);
  await new Promise<void>((resolve, reject) => {
    const event = configuration.secure ? "secureConnect" : "connect";
    socket.once(event, resolve);
    socket.once("error", reject);
  });
  const greeting = await response(socket);
  if (greeting.code !== 220)
    throw new Error("SMTP server greeting was rejected.");
  return socket;
}

async function authenticate(
  configuration: ValidatedSmtpConfiguration,
): Promise<SmtpSocket> {
  let socket = await openSocket(configuration);
  const hello = await command(socket, "EHLO orliqo.local", [250]);
  if (!configuration.secure) {
    if (!hello.text.toUpperCase().includes("STARTTLS"))
      throw new Error("SMTP server does not advertise STARTTLS.");
    await command(socket, "STARTTLS", [220]);
    socket.setTimeout(0);
    socket = connectTls({
      socket,
      servername: configuration.host,
      rejectUnauthorized: true,
    });
    socket.setTimeout(10_000);
    await new Promise<void>((resolve, reject) => {
      (socket as TLSSocket).once("secureConnect", resolve);
      socket.once("error", reject);
    });
    await command(socket, "EHLO orliqo.local", [250]);
  }
  await command(socket, "AUTH LOGIN", [334]);
  await command(
    socket,
    Buffer.from(configuration.username, "utf8").toString("base64"),
    [334],
  );
  await command(
    socket,
    Buffer.from(configuration.password, "utf8").toString("base64"),
    [235],
  );
  return socket;
}

export function createSmtpAdapter(
  configuration: ValidatedSmtpConfiguration & {
    mode: Exclude<ProviderMode, "demo">;
  },
): EmailProviderAdapter {
  return {
    provider: "smtp",
    mode: configuration.mode,
    async send(draft) {
      const requestId = randomUUID();
      let socket: SmtpSocket | null = null;
      try {
        socket = await authenticate(configuration);
        await command(socket, `MAIL FROM:<${draft.from}>`, [250]);
        await command(socket, `RCPT TO:<${draft.to}>`, [250, 251]);
        await command(socket, "DATA", [354]);
        const mime = buildMimeMessage(draft).replace(/^\./gm, "..");
        const queued = await command(socket, `${mime}\r\n.`, [250]);
        await command(socket, "QUIT", [221]).catch(() => undefined);
        const queueId =
          queued.text.match(/(?:queued as|id[=: ]+)\s*([a-z\d._-]+)/i)?.[1] ??
          requestId;
        return {
          ok: true,
          delivered: true,
          providerMessageId: queueId,
          threadId: draft.threadId,
          requestId,
          mode: configuration.mode,
        };
      } catch (error) {
        return {
          ok: false,
          mode: configuration.mode,
          requestId,
          error: {
            code: "provider_unavailable",
            message:
              error instanceof Error ? error.message : "SMTP delivery failed.",
            retryable: true,
          },
        };
      } finally {
        socket?.destroy();
      }
    },
    async test() {
      let socket: SmtpSocket | null = null;
      try {
        socket = await authenticate(configuration);
        await command(socket, "QUIT", [221]).catch(() => undefined);
        return {
          ok: true,
          mode: configuration.mode,
          checkedAt: new Date().toISOString(),
        };
      } catch {
        return {
          ok: false,
          mode: configuration.mode,
          checkedAt: new Date().toISOString(),
          errorCode: "provider_unavailable",
          retryable: true,
        };
      } finally {
        socket?.destroy();
      }
    },
    async sync(): Promise<EmailSyncResult> {
      return {
        ok: true,
        cursor: "unsupported",
        received: 0,
        mode: configuration.mode,
      };
    },
    async refresh() {
      return this.test();
    },
    async disconnect() {
      return { ok: true, revoked: false };
    },
    async health() {
      return this.test();
    },
  };
}
