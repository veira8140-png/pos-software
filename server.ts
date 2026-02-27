import express from "express";
import { createServer as createViteServer } from "vite";
import session from "express-session";
import cookieParser from "cookie-parser";
import axios from "axios";
import { google } from "googleapis";

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(cookieParser());
app.use(session({
  secret: process.env.SESSION_SECRET || "veira-secret-123",
  resave: false,
  saveUninitialized: true,
  cookie: { secure: true, sameSite: 'none' }
}));

// --- GOOGLE OAUTH CONFIG ---
const getGoogleRedirectUri = () => {
  if (process.env.GOOGLE_REDIRECT_URI) return process.env.GOOGLE_REDIRECT_URI;
  // Use APP_URL from environment if available, fallback to localhost for local dev
  const baseUrl = process.env.APP_URL || "http://localhost:3000";
  return `${baseUrl.replace(/\/$/, "")}/auth/google/callback`;
};

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  getGoogleRedirectUri()
);

// Log configuration status (without secrets)
console.log("Google Integration Config:");
console.log("- Client ID:", process.env.GOOGLE_CLIENT_ID ? "Set" : "MISSING");
console.log("- Client Secret:", process.env.GOOGLE_CLIENT_SECRET ? "Set" : "MISSING");
console.log("- Redirect URI:", getGoogleRedirectUri());

const GOOGLE_SCOPES = [
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/drive.file'
];

// --- INTEGRATION SERVICES ---

const syncEngine = {
  async syncToGoogleSheets(sales: any[], tokens: any) {
    oauth2Client.setCredentials(tokens);
    const sheets = google.sheets({ version: 'v4', auth: oauth2Client });
    
    // 1. Find or create the "Veira Sales Ledger" spreadsheet
    const drive = google.drive({ version: 'v3', auth: oauth2Client });
    const response = await drive.files.list({
      q: "name = 'Veira Sales Ledger' and mimeType = 'application/vnd.google-apps.spreadsheet'",
      fields: 'files(id, name)',
    });

    let spreadsheetId = response.data.files?.[0]?.id;

    if (!spreadsheetId) {
      const spreadsheet = await sheets.spreadsheets.create({
        requestBody: {
          properties: { title: 'Veira Sales Ledger' },
          sheets: [{ properties: { title: 'Sales' } }]
        }
      });
      spreadsheetId = spreadsheet.data.spreadsheetId!;
      
      // Add headers
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: 'Sales!A1',
        valueInputOption: 'RAW',
        requestBody: {
          values: [['Transaction ID', 'Timestamp', 'Customer', 'Total', 'Payment Method', 'Staff', 'Items Count', 'Status']]
        }
      });
    }

    // 2. Append data
    const values = sales.map(sale => [
      sale.id,
      new Date(sale.timestamp).toLocaleString(),
      sale.customerName || 'Walk-in',
      sale.total,
      sale.paymentMethod,
      sale.staffName,
      sale.items.length,
      sale.status
    ]);

    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: 'Sales!A2',
      valueInputOption: 'RAW',
      requestBody: { values }
    });

    return spreadsheetId;
  },

  async backupToGoogleDrive(data: any, tokens: any) {
    oauth2Client.setCredentials(tokens);
    const drive = google.drive({ version: 'v3', auth: oauth2Client });
    
    // 1. Find or create "/Veira Backups" folder
    const folderResponse = await drive.files.list({
      q: "name = 'Veira Backups' and mimeType = 'application/vnd.google-apps.folder'",
      fields: 'files(id, name)',
    });

    let folderId = folderResponse.data.files?.[0]?.id;

    if (!folderId) {
      const folder = await drive.files.create({
        requestBody: {
          name: 'Veira Backups',
          mimeType: 'application/vnd.google-apps.folder'
        },
        fields: 'id'
      });
      folderId = folder.data.id!;
    }

    // 2. Upload JSON snapshot
    const fileName = `Veira_Backup_${new Date().toISOString().split('T')[0]}.json`;
    await drive.files.create({
      requestBody: {
        name: fileName,
        parents: [folderId]
      },
      media: {
        mimeType: 'application/json',
        body: JSON.stringify(data, null, 2)
      }
    });
  }
};

// --- API ROUTES ---

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// OAuth URL Generator
app.get("/api/auth/google/url", (req, res) => {
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    return res.status(500).json({ error: "Google Client ID or Secret is missing in environment variables." });
  }
  try {
    const url = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: GOOGLE_SCOPES,
      prompt: 'consent'
    });
    res.json({ url });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// OAuth Callback Handlers
app.get("/auth/google/callback", async (req, res) => {
  const { code } = req.query;
  try {
    const { tokens } = await oauth2Client.getToken(code as string);
    (req.session as any).googleTokens = tokens;
    
    res.send(`
      <html><body><script>
        if (window.opener) {
          window.opener.postMessage({ type: 'OAUTH_SUCCESS', provider: 'google' }, '*');
          window.close();
        } else {
          window.location.href = '/';
        }
      </script></body></html>
    `);
  } catch (error: any) {
    res.status(500).send(`Auth failed: ${error.message}`);
  }
});

app.get("/auth/zoho/callback", (req, res) => {
  res.send(`
    <html><body><script>
      if (window.opener) {
        window.opener.postMessage({ type: 'OAUTH_SUCCESS', provider: 'zoho' }, '*');
        window.close();
      } else {
        window.location.href = '/';
      }
    </script></body></html>
  `);
});

app.get("/auth/qbo/callback", (req, res) => {
  res.send(`
    <html><body><script>
      if (window.opener) {
        window.opener.postMessage({ type: 'OAUTH_SUCCESS', provider: 'qbo' }, '*');
        window.close();
      } else {
        window.location.href = '/';
      }
    </script></body></html>
  `);
});

// Sync Trigger
app.post("/api/sync", async (req, res) => {
  const { provider, data } = req.body;
  const tokens = (req.session as any).googleTokens;

  if (provider === 'google' && !tokens) {
    return res.status(401).json({ success: false, error: "Google not connected" });
  }

  try {
    if (provider === 'google') {
      await syncEngine.syncToGoogleSheets(data.sales, tokens);
      await syncEngine.backupToGoogleDrive(data, tokens);
    }
    res.json({ success: true, message: `Sync completed for ${provider}` });
  } catch (error: any) {
    console.error("Sync error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// --- VITE MIDDLEWARE ---
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
