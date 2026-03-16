// ================================================
// KotiAsuminen – Google Apps Script
// ================================================
// Tämä skripti vastaanottaa lomakkeen tiedot sivustolta,
// tallentaa ne Google Sheetsiin ja lähettää ilmoituksen
// Telegram-ryhmään.
//
// TÄRKEÄÄ: Aina kun muutat tätä tiedostoa, tee Redeploy:
// Deploy → Hallitse käyttöönottoja → kynä → Uusi versio → Ota käyttöön
// ================================================

// Telegram-botin tunniste (saatu BotFatherilta)




// Google Sheets -välilehden nimi johon tiedot tallennetaan
const SHEET_NAME = "Soittopyynnot";

// ================================================
// doPost – pääfunktio
// Kutsutaan automaattisesti kun sivusto lähettää lomakkeen
// ================================================
function doPost(e) {
  try {
    // Parsitaan lomakkeen tiedot JSON-muodosta
    const data = parseRequestData_(e);

    // Haetaan tai luodaan taulukko
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName(SHEET_NAME);

    // Jos välilehteä ei ole, luodaan se otsikoineen
    if (!sheet) {
      sheet = ss.insertSheet(SHEET_NAME);
      sheet.appendRow([
        "Timestamp", "Form type", "Name", "Phone",
        "Email", "Call time", "Message", "Services", "GDPR", "Source"
      ]);
    }

    // Lisätään uusi rivi taulukkoon
    sheet.appendRow([
      new Date(),
      data.form_type || "contact",
      data.name || "",
      data.phone || "",
      data.email || "",
      data.call_time || "",
      data.message || "",
      Array.isArray(data.services) ? data.services.join(", ") : data.services || "",
      data.gdpr || "",
      data.source || "website"
    ]);

    // Lähetetään ilmoitus Telegramiin
    sendTelegramMessage_(buildTelegramText_(data));

    return jsonOutput_({ ok: true });

  } catch (error) {
    // Jos jokin menee pieleen, palautetaan virheviesti
    return jsonOutput_({ ok: false, error: String(error) });
  }
}

// ================================================
// doGet – terveystarkistus
// Voidaan testata selaimessa: avaa skriptin URL
// Jos näkyy "OK", skripti toimii
// ================================================
function doGet() {
  return ContentService.createTextOutput("OK").setMimeType(ContentService.MimeType.TEXT);
}

// ================================================
// parseRequestData_ – datan jäsentäjä
// Lukee JSON-datan lomakkeen pyynnöstä
// ================================================
function parseRequestData_(e) {
  if (!e || !e.postData || !e.postData.contents) {
    return e && e.parameter ? e.parameter : {};
  }
  try {
    return JSON.parse(e.postData.contents);
  } catch (err) {
    return e.parameter || {};
  }
}

// ================================================
// escapeHtml_ – HTML-merkkien suojaus
// Estää HTML-injektiot Telegram-viestissä
// ================================================
function escapeHtml_(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

// ================================================
// buildTelegramText_ – viestin rakentaja
// Muodostaa siistin HTML-viestin Telegramiin
// Näyttää eri ikonit soittopyynnölle ja yhteydenotolle
// ================================================
function buildTelegramText_(data) {
  const isCallback = (data.form_type || "contact") === "callback";
  const icon  = isCallback ? "📞" : "✉️";
  const label = isCallback ? "Soittopyyntö" : "Yhteydenotto";
  const services = Array.isArray(data.services)
    ? data.services.join(", ")
    : data.services || "";

  // Aikaleima suomalaisessa muodossa
  const now = new Date();
  const ts = now.toLocaleDateString("fi-FI") + " klo " +
    now.toLocaleTimeString("fi-FI", { hour: "2-digit", minute: "2-digit" });

  // Rakennetaan viesti rivi kerrallaan
  let lines = [
    icon + " <b>" + label + "</b>",
    "─────────────────────",
    "👤 <b>Nimi:</b> " + escapeHtml_(data.name || "-"),
    '📱 <b>Puhelin:</b> <a href="tel:' + (data.phone || "") + '">' +
      escapeHtml_(data.phone || "-") + "</a>",
  ];

  // Valinnaiset kentät lisätään vain jos ne on täytetty
  if (data.email)     lines.push("📧 <b>Sähköposti:</b> " + escapeHtml_(data.email));
  if (data.call_time) lines.push("🕐 <b>Paras aika:</b> " + escapeHtml_(data.call_time));
  if (services)       lines.push("🔧 <b>Palvelut:</b> " + escapeHtml_(services));
  if (data.message)   lines.push("💬 <b>Viesti:</b> " + escapeHtml_(data.message));

  lines.push("─────────────────────");
  lines.push("🕓 " + ts);

  return lines.join("\n");
}

// ================================================
// sendTelegramMessage_ – Telegram-lähetin
// Lähettää valmiin viestin Telegram-ryhmään
// parse_mode: "HTML" mahdollistaa lihavoinnin ja linkit
// ================================================
function sendTelegramMessage_(text) {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID ||
      TELEGRAM_BOT_TOKEN.indexOf("PASTE_") === 0 ||
      TELEGRAM_CHAT_ID.indexOf("PASTE_") === 0) {
    throw new Error("Telegram token tai chat_id puuttuu");
  }

  const url = "https://api.telegram.org/bot" + TELEGRAM_BOT_TOKEN + "/sendMessage";

  const response = UrlFetchApp.fetch(url, {
    method: "post",
    contentType: "application/json",
    payload: JSON.stringify({
      chat_id: TELEGRAM_CHAT_ID,
      text: text,
      parse_mode: "HTML",
      disable_web_page_preview: true
    }),
    muteHttpExceptions: true,
  });

  const code = response.getResponseCode();
  if (code < 200 || code >= 300) {
    throw new Error("Telegram virhe: " + response.getContentText());
  }
}

// ================================================
// jsonOutput_ – JSON-vastauksen muodostaja
// Palauttaa JSON-muotoisen vastauksen sivustolle
// ================================================
function jsonOutput_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
