import { Boom } from "@hapi/boom";
import makeWASocket, { DisconnectReason, type WASocket } from "@whiskeysockets/baileys";
import type {
  Channel,
  ChannelType,
  ConnectionStatus,
  ConnectionStatusHandler,
  MessageHandler,
  OutboundMessage,
  SendMessageResult,
} from "@intelligencebiz/channel-core";
import { createLogger, nextBackoffDelay, sleep, type Logger } from "@intelligencebiz/shared";
import { createEncryptedAuthState } from "../session/baileys-auth-state.js";
import type { SessionStore } from "../session/session-store.js";
import { createBaileysLogger } from "./baileys-logger.js";
import { toBaileysContent, toInboundMessage, toJid } from "./message-mapping.js";

export interface BaileysChannelConfig {
  tenantId: string;
  sessionStore: SessionStore;
  encryptionKey: string;
  logger?: Logger;
}

const QR_TTL_MS = 60_000;

export class BaileysChannel implements Channel {
  readonly tenantId: string;
  readonly channelType: ChannelType = "unofficial_baileys";

  private readonly sessionStore: SessionStore;
  private readonly encryptionKey: string;
  private readonly logger: Logger;

  private socket: WASocket | undefined;
  private status: ConnectionStatus = "disconnected";
  private ownNumber: string | undefined;
  private reconnectAttempt = 0;
  private closed = false;

  private readonly messageHandlers: MessageHandler[] = [];
  private readonly statusHandlers: ConnectionStatusHandler[] = [];

  constructor(config: BaileysChannelConfig) {
    this.tenantId = config.tenantId;
    this.sessionStore = config.sessionStore;
    this.encryptionKey = config.encryptionKey;
    this.logger = config.logger ?? createLogger(`whatsapp-worker:baileys:${config.tenantId}`);
  }

  async sendMessage(message: OutboundMessage): Promise<SendMessageResult> {
    if (!this.socket || this.status !== "connected") {
      throw new Error(
        `Cannot send message for tenant ${this.tenantId}: channel is not connected (status=${this.status})`,
      );
    }

    const sent = await this.socket.sendMessage(toJid(message.to), toBaileysContent(message.content));
    if (!sent?.key?.id) {
      throw new Error(`Baileys did not return a message id for tenant ${this.tenantId}`);
    }

    return { externalMessageId: sent.key.id, sentAt: new Date() };
  }

  onMessageReceived(handler: MessageHandler): void {
    this.messageHandlers.push(handler);
  }

  onConnectionStatusChange(handler: ConnectionStatusHandler): void {
    this.statusHandlers.push(handler);
  }

  async getConnectionStatus(): Promise<ConnectionStatus> {
    return this.status;
  }

  /** Closes the socket (if any) and opens a fresh one, replaying stored auth state. */
  async reconnect(): Promise<void> {
    this.closed = false;
    this.socket?.end(undefined);

    const { state, saveCreds } = await createEncryptedAuthState({
      tenantId: this.tenantId,
      store: this.sessionStore,
      encryptionKey: this.encryptionKey,
    });

    const socket = makeWASocket({
      auth: state,
      logger: createBaileysLogger(this.logger, { tenantId: this.tenantId }),
    });

    this.socket = socket;
    this.wireEvents(socket, saveCreds);
  }

  /** Stops reconnect attempts and closes the socket. Does not delete stored session state. */
  disconnect(): void {
    this.closed = true;
    this.socket?.end(undefined);
    this.socket = undefined;
  }

  private wireEvents(socket: WASocket, saveCreds: () => Promise<void>): void {
    socket.ev.on("creds.update", saveCreds);

    socket.ev.on("connection.update", (update) => {
      const { connection, qr, lastDisconnect } = update;

      if (qr) {
        this.emitStatus("pending_qr", { qr: { data: qr, expiresAt: new Date(Date.now() + QR_TTL_MS) } });
      }

      if (connection === "connecting") {
        this.emitStatus("connecting");
      }

      if (connection === "open") {
        this.ownNumber = socket.user?.id;
        this.reconnectAttempt = 0;
        this.emitStatus("connected");
      }

      if (connection === "close") {
        void this.handleClose(lastDisconnect);
      }
    });

    socket.ev.on("messages.upsert", ({ messages, type }) => {
      if (type !== "notify" || !this.ownNumber) return;
      for (const waMessage of messages) {
        const inbound = toInboundMessage(this.tenantId, this.ownNumber, waMessage);
        if (!inbound) continue;
        for (const handler of this.messageHandlers) {
          void Promise.resolve(handler(inbound)).catch((err) =>
            this.logger.error("message handler failed", { tenantId: this.tenantId, err: String(err) }),
          );
        }
      }
    });
  }

  private async handleClose(lastDisconnect: { error?: Error } | undefined): Promise<void> {
    const boom = lastDisconnect?.error as Boom | undefined;
    const statusCode = boom?.output?.statusCode;

    if (statusCode === DisconnectReason.loggedOut) {
      await this.sessionStore.remove(this.tenantId);
      this.emitStatus("logged_out", { reason: "Session was logged out from the phone" });
      return;
    }

    this.emitStatus("disconnected", { reason: lastDisconnect?.error?.message });

    if (this.closed) return;

    const delay = nextBackoffDelay(this.reconnectAttempt++);
    this.logger.warn("connection closed, scheduling reconnect", {
      tenantId: this.tenantId,
      delayMs: delay,
      reason: lastDisconnect?.error?.message,
    });
    await sleep(delay);
    if (!this.closed) {
      await this.reconnect();
    }
  }

  private emitStatus(
    status: ConnectionStatus,
    extra?: { qr?: { data: string; expiresAt: Date }; reason?: string },
  ): void {
    this.status = status;
    for (const handler of this.statusHandlers) {
      void Promise.resolve(
        handler({ tenantId: this.tenantId, status, ...extra }),
      ).catch((err) =>
        this.logger.error("status handler failed", { tenantId: this.tenantId, err: String(err) }),
      );
    }
  }
}
