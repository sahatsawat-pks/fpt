import { google } from "googleapis";
import fs from "fs";
import path from "path";

const SPREADSHEET_ID =
  process.env.GOOGLE_SHEETS_SPREADSHEET_ID || "1lbLRgFnR6OKrxlsWznPiE1rqCmaSJxkLwb-Hq-vAZYA";
const SERVICE_EMAIL =
  process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL ||
  "ballot-service@fanpantae-fanmade.iam.gserviceaccount.com";

const DEFAULT_PRIVATE_KEY = `-----BEGIN PRIVATE KEY-----
MIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQDX2Pdm1RcSJ4GG
eX67JsOR0hPbCJGtpPIbvEuIGfI/K7wK6qHY5GIuXj2CgYcXBOYzFoYNfxo6wV+s
kqdlW6Vd8OPmwu96ZXW1/PdHOv3mgCadARZBv8mgHc/SnYh+EJtjxd+ct2OnHNwM
qAm6o4aUndM8lkOcwPBdTMu16HhJJEct+r0tcpjwb0TH70Dl0H5lKVcFhj2s+i8D
aQyVTAzDTANTPjjr2RMPu/fUHR8rhBiRTmnxigpS5CZq+veu5DoFTXZiZYXR/1M1
5P4yayAcD9TveWRcLkoz6V+PPMvom2SzrXWJrg63YwQQSYUz/7t0JGkJteti2sr3
U/e3SygTAgMBAAECggEAKUVoELZ/4c3B+2dxrvE7hb9IYqIh0LTwQhNf0dc8NY30
N5Yjeig5CaqlUjXYEbOzHGObICuEZWWiGIo2DbBXTz4HJZFyXtHVjwWednU2JQOt
3mldyxaTw9TPbvMGLSyZuZsVJY7/M+3VuWnL6m7oBbSjtjr5FJjjnMNZVB/uF/XI
4X2fVQlzuE5+rw2u1MXcOAHNQI8MQYPhLA83Uu185/Tey30Ee8W18q4vOpZhAeO5
0ugtFxfads+VbchWfAvASKAkWrjuccjpynud+1wC7ElQEM2yUL+OhWtMcVdKjWLr
3Xoz87doTIU8lOAYvRsytESLBUggseBnMR2gYtl+6QKBgQDy0nUjixVIpZT1CJ+3
nHCY1Zom6R3AE/OJfhVmTBAgnKY8u5XZQEMNH/iL1ZeNuMZEESySCKJc2NAKDFoT
V97d7CAOONSkbqPuu6lULpgr3hSBZWMTgg7WhDg3ncJqhiUfS60l3J4tBmTM1hKd
FaACXctZ0XVzpSdvJZSHOnSelQKBgQDjj7/ZCI5zfz/oI5IEBEn0rmMDsLLWNW4g
pk/sb/4Ln509yk5NJSgzZ387B57t4q3mq3FAlY3wzGMq3fLpB+Svv7As64lhI3eX
+MOXZ3+4HMy4RiocAz/t1XL40fYFW2d5osuiuREwU0sMYoH402EOBeB1jclTB4e9
mpzc2wUKBwKBgQDR7ZduEilldBnSuhDzOaGy0ECEUVfyHo2XGdVAapQqzaN+sCJ9
/2u4piJIKnHrCYsHf92Lp0FPifZaKZGaVYaNUD3qbcGRI0JA/CcJa3sNueL6d3/v
dqqDVS4RDyfs1mqzosZgDFsHzBZLbOwMuIxsX1CWJ1smjusH0XKWcrgt/QKBgBxu
TU3UX9fWQinCp++QiZzkXMKNRQq2SjgSD1I++8KAAqlBqV7CEa+6co7xeM3H0GpN
aSzkgoNfRdSJPlwW/F9o154FH3jfcYWvMuCrsa1TC9DKE2DElywjyuWDdfVdYiQ0
TrTZ4mfjQDEf7ZUk869I1K5bNJgHDNKHiqmdQ5fpAoGBAJyWZWZc2KHIss+xOQLJ
DlvfK+U0Ifu40FBYTIBCYfA2UUtXtO81Cjf3hIPj+Mh0uZ7YDfdOu9GGPUBCtKcp
3NwrjBm15/89zHdjRNj61vdIImR8Wh18OEepI+EIuNQYL+g81B7Tins2uskzTEbi
mIQZIHG/9KKQxswwpRsvH3MR
-----END PRIVATE KEY-----`;

function getPrivateKey() {
  const raw = process.env.GOOGLE_PRIVATE_KEY || DEFAULT_PRIVATE_KEY;
  return raw.replace(/\\n/g, "\n");
}

export function getGoogleSheetsClient() {
  const privateKey = getPrivateKey();
  if (!privateKey || !SERVICE_EMAIL) {
    throw new Error("Missing Google Service Account credentials");
  }

  const auth = new google.auth.JWT({
    email: SERVICE_EMAIL,
    key: privateKey,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });

  return google.sheets({ version: "v4", auth });
}

export async function testGoogleSheetsConnection() {
  try {
    const sheets = getGoogleSheetsClient();
    const res = await sheets.spreadsheets.get({
      spreadsheetId: SPREADSHEET_ID,
    });
    return {
      success: true,
      title: res.data.properties?.title || "Untitled",
      sheets: (res.data.sheets || []).map((s) => s.properties?.title),
    };
  } catch (err) {
    return {
      success: false,
      error: err.message,
    };
  }
}

const DEFAULT_HEADERS = [
  "Timestamp",
  "Ballot ID",
  "แชมป์ (+10)",
  "อันดับ 1 (+5)",
  "อันดับ 2 (+4)",
  "อันดับ 3 (+3)",
  "อันดับ 4 (+2)",
  "อันดับ 5 (+1)",
  "Raw Data (JSON)",
];

/**
 * Ensures header row exists in the first tab
 */
async function ensureHeaders(sheets, sheetTitle) {
  try {
    const range = `${sheetTitle}!A1:I1`;
    const check = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range,
    });
    if (!check.data.values || check.data.values.length === 0) {
      await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range,
        valueInputOption: "USER_ENTERED",
        requestBody: { values: [DEFAULT_HEADERS] },
      });
    }
  } catch (e) {
    console.error("Error ensuring headers:", e);
  }
}

/**
 * Append a single ballot submission to the Google Sheet
 */
export async function appendBallotToSheet({
  ballotId,
  timestamp,
  championName,
  rankNames,
  rawPayload,
}) {
  const sheets = getGoogleSheetsClient();

  // Get sheet metadata to find first sheet name
  const meta = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
  const firstSheetTitle = meta.data.sheets?.[0]?.properties?.title || "Sheet1";

  await ensureHeaders(sheets, firstSheetTitle);

  const row = [
    timestamp || new Date().toLocaleString("th-TH", { timeZone: "Asia/Bangkok" }),
    ballotId || `ballot_${Date.now()}`,
    championName || "-",
    Array.isArray(rankNames?.["1"]) ? rankNames["1"].join(", ") : rankNames?.["1"] || "-",
    Array.isArray(rankNames?.["2"]) ? rankNames["2"].join(", ") : rankNames?.["2"] || "-",
    Array.isArray(rankNames?.["3"]) ? rankNames["3"].join(", ") : rankNames?.["3"] || "-",
    Array.isArray(rankNames?.["4"]) ? rankNames["4"].join(", ") : rankNames?.["4"] || "-",
    Array.isArray(rankNames?.["5"]) ? rankNames["5"].join(", ") : rankNames?.["5"] || "-",
    JSON.stringify(rawPayload || {}),
  ];

  const appendRes = await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: `${firstSheetTitle}!A:I`,
    valueInputOption: "USER_ENTERED",
    insertDataOption: "INSERT_ROWS",
    requestBody: {
      values: [row],
    },
  });

  return appendRes.data;
}

/**
 * Read all rows from the Sheet and aggregate points per candidate
 */
export async function fetchAndAggregateSheetVotes(contestantsList = []) {
  const sheets = getGoogleSheetsClient();
  const meta = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
  const firstSheetTitle = meta.data.sheets?.[0]?.properties?.title || "Sheet1";

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${firstSheetTitle}!A2:I`,
  });

  const rows = res.data.values || [];
  const tally = {}; // candidateId -> { points, votes, rankVotes, championVotes }

  // Helper to find candidate
  const findCandidate = (identifier) => {
    if (!identifier) return null;
    const str = String(identifier).trim().toLowerCase();
    return contestantsList.find(
      (c) =>
        String(c.id).toLowerCase() === str ||
        (c.name && c.name.toLowerCase() === str) ||
        (c.nickname && c.nickname.toLowerCase() === str) ||
        (c.name && c.name.toLowerCase().includes(str))
    );
  };

  const rankWeights = { "1": 5, "2": 4, "3": 3, "4": 2, "5": 1 };

  rows.forEach((row) => {
    // Column I (index 8) is raw JSON payload
    let ballotData = null;
    if (row[8]) {
      try {
        ballotData = JSON.parse(row[8]);
      } catch (e) {}
    }

    if (ballotData && ballotData.ranks) {
      // Use parsed JSON payload for 100% precision
      const ranks = ballotData.ranks || {};
      const championId = ballotData.champion;

      Object.entries(ranks).forEach(([rankStr, ids]) => {
        const weight = rankWeights[rankStr] || 1;
        const idList = Array.isArray(ids) ? ids : [ids];
        idList.forEach((id) => {
          if (!id) return;
          const match = findCandidate(id);
          const key = match ? String(match.id) : String(id);
          if (!tally[key]) {
            tally[key] = { points: 0, votes: 0, rankVotes: { "1": 0, "2": 0, "3": 0, "4": 0, "5": 0 }, championVotes: 0 };
          }
          tally[key].points += weight;
          tally[key].votes += weight;
          tally[key].rankVotes[rankStr] = (tally[key].rankVotes[rankStr] || 0) + 1;
        });
      });

      if (championId) {
        const match = findCandidate(championId);
        const key = match ? String(match.id) : String(championId);
        if (!tally[key]) {
          tally[key] = { points: 0, votes: 0, rankVotes: { "1": 0, "2": 0, "3": 0, "4": 0, "5": 0 }, championVotes: 0 };
        }
        tally[key].points += 10;
        tally[key].votes += 10;
        tally[key].championVotes = (tally[key].championVotes || 0) + 1;
      }
    } else {
      // Fallback: parse string columns
      const champStr = row[2];
      if (champStr && champStr !== "-") {
        const match = findCandidate(champStr);
        if (match) {
          const key = String(match.id);
          if (!tally[key]) {
            tally[key] = { points: 0, votes: 0, rankVotes: { "1": 0, "2": 0, "3": 0, "4": 0, "5": 0 }, championVotes: 0 };
          }
          tally[key].points += 10;
          tally[key].votes += 10;
          tally[key].championVotes = (tally[key].championVotes || 0) + 1;
        }
      }

      // Ranks 1 to 5 (columns 3 to 7)
      for (let r = 1; r <= 5; r++) {
        const colVal = row[r + 2];
        if (colVal && colVal !== "-") {
          const names = colVal.split(",").map((s) => s.trim());
          const weight = rankWeights[String(r)] || 1;
          names.forEach((n) => {
            const match = findCandidate(n);
            if (match) {
              const key = String(match.id);
              if (!tally[key]) {
                tally[key] = { points: 0, votes: 0, rankVotes: { "1": 0, "2": 0, "3": 0, "4": 0, "5": 0 }, championVotes: 0 };
              }
              tally[key].points += weight;
              tally[key].votes += weight;
              tally[key].rankVotes[String(r)] = (tally[key].rankVotes[String(r)] || 0) + 1;
            }
          });
        }
      }
    }
  });

  return {
    totalBallots: rows.length,
    tally,
  };
}
