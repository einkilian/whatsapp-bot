import express from "express";
import pkg from "whatsapp-web.js";
const { Client, LocalAuth } = pkg;
import qrcode from "qrcode-terminal";
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
let clientIsReady = false;
client.on("qr", qr => qrcode.generate(qr, { small: true }));
client.on("ready", () => {
    clientIsReady = true;
    console.log("✅ WhatsApp-Bot ist bereit!");
});
client.on("authenticated", () => console.log("🔐 Authentifiziert"));
client.on("disconnected", () => console.log("❌ Verbindung verloren – wird neu aufgebaut…"));

client.on("chat_update", async (update) => {
    await fetch(`http://192.168.250.1:5678/webhook/wab/eventchatupdate`, {
        method: "POST",
    });
});

client.on("message", async msg => {
    try {
        const from = msg.from; // chat id
        const body = msg.body && msg.body.toLowerCase();

        console.log(`📩 Nachricht von ${msg._data.notifyName}: ${msg.body} (ID: ${msg.id._serialized})`);

        // Chat-Info an Backend senden
        await fetch(`http://192.168.250.1:5678/test/wab/updatechat`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: msg.id._serialized, name: msg._data.notifyName }),
        });

        // All regualr commands send to n8n backend
        if (body && body.startsWith("/")) {
            const match = msg.body.match(/^\/([^\/\s]+)(?:\/([^\/\s]+))?(?:\s+(.*))?$/);
            if (match) {
                let [, part1, part2, content] = match;
                // if there's no slash-part2 but there's remaining text, treat the first token as part2
                if (!part2 && content) {
                    const parts = content.trim().split(/\s+/);
                    part2 = parts.shift();
                    content = parts.join(' ') || undefined;
                }

                try {
                    // include '=' and encode parts
                    const response = await fetch(`http://192.168.250.1:5678/webhook/wab/checkPermission`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ cmd: `${part1}_${part2}`, chatId: from }),
                    });
                    if (response.status === 200) {
                        try {
                            await fetch(`http://192.168.250.1:5678/webhook/wab/${part1}/${part2}`, {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ content: content, chatId: from, messageId: msg.id._serialized }),
                            });
                        } catch (err) {
                            console.error("Webhook error:", err.message);
                            await client.sendMessage(from, `Dieser Command existiert nicht.`);
                        }
                    } else if (response.status === 403) {
                        await msg.reply("Für diesen Command hast du keine Berechtigung.");
                        return;
                    } else {
                        return;
                    }

                } catch (err) {
                    console.error("Webhook error:", err.message);
                }


                return;
            }
        }
        if (body && body.startsWith("t/")) {
            console.log("Processing test command:", msg.body);
            // allow optional "/part2" or a space-separated part2; content may be optional
            const match = msg.body.match(/^t\/([^\/\s]+)(?:\/([^\/\s]+))?(?:\s+(.*))?$/);
            if (match) {
                let [, part1, part2, content] = match;
                // if there's no slash-part2 but there's remaining text, treat the first token as part2
                if (!part2 && content) {
                    const parts = content.trim().split(/\s+/);
                    part2 = parts.shift();
                    content = parts.join(' ') || undefined;
                }
                console.log(`part1: ${part1}, part2: ${part2}, content: ${content}`);

                try {
                    // include '=' and encode parts
                    console.log(`Checking permission for command: ${part1}-${part2}`);
                    const response = await fetch(`http://192.168.250.1:5678/webhook/wab/checkPermission`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ cmd: `${part1}_${part2}`, chatId: from }),
                    });
                    if (response.status === 200) {
                        try {
                            await fetch(`http://192.168.250.1:5678/webhook-test/wab/${part1}/${part2}`, {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ content: content, chatId: from, messageId: msg.id._serialized }),
                            });
                        } catch (err) {
                            console.error("Webhook error:", err.message);
                            await client.sendMessage(from, `Dieser Command existiert nicht.`);
                        }
                    } else if (response.status === 403) {
                        await msg.reply("Für diesen Command hast du keine Berechtigung.");
                        return;
                    } else {
                        return;
                    }

                } catch (err) {
                    console.error("Webhook error:", err.message);
                }

                return;
            }
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
            await fetch("http://192.168.250.1:5678/webhook/wab/doneTaskOnWA", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ messageId: messageId }),
            });
        } catch (err) {
            console.error("Webhook error:", err.message);
        }
    }
});

setInterval(async () => {
    try {
        await client.getState();
    } catch {
        client.initialize();
    }
}, 60000);

setInterval(async () => {
    if (!clientIsReady) return;
    try {
        const chats = await client.getChats();
        for (const chat of chats) {
            if (chat.unreadCount > 0) await chat.sendSeen();
        }
    } catch (err) {
        console.error("Fehler beim Lesen von Chats:", err);
    }
}, 1000);


client.initialize();
// Endpoint zum Senden einer Nachricht
app.post("/send", async (req, res) => {
    const sendType = req.query.type;
    const { chatId, message, taskId } = req.body;
    if (!chatId || !message || !sendType) {
        return res.status(400).json({ error: "chatId und message erforderlich" });
    }
    if (sendType === "task") {
        try {
            const sentMessage = await client.sendMessage(chatId, message);
            await fetch("http://192.168.250.1:5678/webhook/wab/addMessageWithTask", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ messageId: sentMessage.id._serialized, taskId: taskId }),
            });
            return res.status(200).json({ success: true });
        } catch (err) {
            console.error("Send error:", err);
            return res.status(500).json({ error: err.message });
        }
    } else {
        try {
            client.sendMessage(chatId, message);
            return res.status(200).json({ success: true });
        } catch (error) {
            console.log(err)
            return res.status(500).json({ error: err.message });
        }
    }

});
app.post("/react", async (req, res) => {
    const { messageId, emoji } = req.query;
    if (!messageId || !emoji) {
        return res.status(400).json({ error: "messageId und emoji erforderlich" });
    }
    try {
        const chat = await client.getChatById(messageId.split("_")[0]);
        const message = await chat.fetchMessages({ limit: 50 });
        const targetMsg = message.find(m => m.id._serialized === messageId);
        if (!targetMsg) {
            return res.status(404).json({ error: "Nachricht nicht gefunden" });
        }
        if (emoji === "like") {
            await targetMsg.react("👍");
        } else if (emoji === "dislike") {
            await targetMsg.react("👎");
        } else {
            return res.status(400).json({ error: "Unbekanntes Emoji" });
        }
        return res.status(200).json({ success: true });
    } catch (err) {
        console.error("React error:", err);
        return res.status(500).json({ error: err.message });
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
