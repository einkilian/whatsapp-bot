# WhatsApp-Bot
```markdown
# WhatsApp-Bot

Ein einfacher WhatsApp-Bot mit `whatsapp-web.js`.

Voraussetzungen

- Node.js (16+ empfohlen) oder Docker

Installation (lokal)

```powershell
npm install
```

Start (lokal)

```powershell
npm start
```

Beim ersten Start wird ein QR-Code im Terminal angezeigt. Scanne ihn mit WhatsApp (Einstellungen -> Verknüpfte Geräte -> Gerät verknüpfen).

API Endpoints

- POST /send { chatId, message } - sendet eine Nachricht an `chatId`
- GET /chats - listet bekannte Chats mit `id` und `name`

Docker

Mit Docker Compose kannst du den Bot in einem Container starten und die Session persistent auf dem Host speichern.

```powershell
docker compose up --build -d
docker compose logs -f whatsapp-bot
```

Der QR-Code erscheint in den Container-Logs beim ersten Start. Die Session wird in `./session` auf dem Host gespeichert.

Hinweise

- Session-Daten werden in `./session` gespeichert. Behandle sie vertraulich.
- Falls das Image kein Chromium enthält, setze `CHROME_PATH` auf die ausführbare Chromium/Chrome-Datei. In der mitgelieferten Dockerfile ist `CHROME_PATH=/usr/bin/chromium` gesetzt.

```
