import type { proto, AnyMessageContent, WAMessage } from "@whiskeysockets/baileys";
import type { InboundMessage, MessageContent } from "@intelligencebiz/channel-core";

export function toJid(phoneOrJid: string): string {
  if (phoneOrJid.includes("@")) return phoneOrJid;
  const digits = phoneOrJid.replace(/\D/g, "");
  return `${digits}@s.whatsapp.net`;
}

export function toBaileysContent(content: MessageContent): AnyMessageContent {
  switch (content.type) {
    case "text":
      return { text: content.text };
    case "image":
      return { image: { url: content.url }, caption: content.caption };
    case "video":
      return { video: { url: content.url }, caption: content.caption };
    case "audio":
      return { audio: { url: content.url }, mimetype: "audio/mp4", ptt: false };
    case "document":
      return {
        document: { url: content.url },
        fileName: content.filename,
        caption: content.caption,
        mimetype: "application/octet-stream",
      };
  }
}

/**
 * Extracts text content from an inbound WhatsApp message. Inbound media
 * (image/video/audio/document) is represented only by its caption, if
 * any — downloading and re-hosting inbound media is a separate feature
 * beyond this MVP pass, so messages with no extractable text are dropped.
 */
function extractContent(message: proto.IMessage | null | undefined): MessageContent | null {
  if (!message) return null;
  if (message.conversation) {
    return { type: "text", text: message.conversation };
  }
  if (message.extendedTextMessage?.text) {
    return { type: "text", text: message.extendedTextMessage.text };
  }
  const caption =
    message.imageMessage?.caption ??
    message.videoMessage?.caption ??
    message.documentMessage?.caption;
  if (caption) {
    return { type: "text", text: caption };
  }
  return null;
}

export function toInboundMessage(tenantId: string, to: string, waMessage: WAMessage): InboundMessage | null {
  const content = extractContent(waMessage.message);
  const remoteJid = waMessage.key.remoteJid;
  const externalMessageId = waMessage.key.id;

  if (!content || !remoteJid || !externalMessageId || waMessage.key.fromMe) {
    return null;
  }

  const timestampSeconds = Number(waMessage.messageTimestamp ?? 0);

  return {
    tenantId,
    channelType: "unofficial_baileys",
    externalMessageId,
    from: remoteJid,
    to,
    content,
    timestamp: timestampSeconds > 0 ? new Date(timestampSeconds * 1000) : new Date(),
  };
}
