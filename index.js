import express from "express";
import pkg from "whatsapp-web.js";
const { Client, LocalAuth } = pkg;
import qrcode from "qrcode-terminal";
import axios from "axios";
import fetch from "node-fetch";
import dotenv from "dotenv";
dotenv.config();

const app = express();
app.use(express.json());

// Env / config (helpful for Docker)
const SESSION_PATH = process.env.SESSION_PATH || "./session";
const PORT = process.env.PORT || 3001;
const CHROME_PATH = process.env.CHROME_PATH || undefined;

// WhatsApp-Client
const clientConfig = {
    authStrategy: new LocalAuth({ dataPath: SESSION_PATH }),
    puppeteer: {
        headless: true,
        args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
    },
};

if (CHROME_PATH) clientConfig.puppeteer.executablePath = CHROME_PATH;

const client = new Client(clientConfig);

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
client.on("message_reaction", async (reaction) => {

    const messageId = reaction.msgId._serialized;
    const emoji = reaction.reaction;

    if (!reaction.msgId.fromMe) {
        return;
    }

    // Nur Daumen-hoch berücksichtigen
    if (emoji === "👍") {
        try {
            await fetch("http://192.168.250.1:5678/webhook/doneTaskOnWA", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ messageId: messageId }),
            });
        } catch (err) {
            console.error("Webhook error:", err.message);
        }
    }
});

client.initialize();

// Endpoint zum Senden einer Nachricht
app.post("/send", async (req, res) => {
    const { chatId, message, taskId } = req.body;
    if (!chatId || !message)
        return res.status(400).json({ error: "chatId und message erforderlich" });

    try {
        const sentMessage = await client.sendMessage(chatId, message);
        await fetch("http://192.168.250.1:5678/webhook/addMessageWithTask", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ messageId: sentMessage.id._serialized, taskId: taskId }),
        });
        res.status(200).json({ success: true });
        return;
    } catch (err) {
        console.error("Send error:", err);
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

app.listen(PORT, () => console.log(`🌐 API läuft auf Port ${PORT}`));
