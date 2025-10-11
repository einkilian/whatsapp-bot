import express from "express";
import pkg from "whatsapp-web.js";
const { Client, LocalAuth } = pkg;
import qrcode from "qrcode-terminal";

const app = express();
app.use(express.json());

// WhatsApp-Client
const client = new Client({
  authStrategy: new LocalAuth({ dataPath: "./session" }),
  puppeteer: {
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  },
});

// QR-Code beim ersten Start
client.on("qr", qr => qrcode.generate(qr, { small: true }));
client.on("ready", () => console.log("✅ WhatsApp-Bot ist bereit!"));
client.on("authenticated", () => console.log("🔐 Authentifiziert"));
client.on("disconnected", () => console.log("❌ Verbindung verloren – wird neu aufgebaut…"));

// Einfacher Auto-Reply / Command-Handler
client.on("message", async msg => {
  try {
    const from = msg.from; // chat id
    const body = msg.body && msg.body.toLowerCase();

    // Beispiel: "ping" -> "pong"
    if (body === "ping") {
      await client.sendMessage(from, "pong");
      return;
    }

    // Beispiel: wenn Nachricht mit "/echo " beginnt, dann echo
    if (body && body.startsWith("/echo ")) {
      const toEcho = msg.body.slice(6);
      await client.sendMessage(from, toEcho || "(nothing to echo)");
      return;
    }
  } catch (e) {
    console.error("Fehler im message handler:", e);
  }
});

client.initialize();

// Endpoint zum Senden einer Nachricht
app.post("/send", async (req, res) => {
  const { chatId, message } = req.body;
  if (!chatId || !message)
    return res.status(400).json({ error: "chatId und message erforderlich" });

  try {
    await client.sendMessage(chatId, message);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Optional: Alle Chats abrufen (zum Ermitteln der Chat-IDs)
app.get("/chats", async (req, res) => {
  try {
    const chats = await client.getChats();
    res.json(chats.map(c => ({ id: c.id._serialized, name: c.name })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`🌐 API läuft auf Port ${PORT}`));
