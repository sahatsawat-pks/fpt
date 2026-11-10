import { NextResponse } from "next/server";
import { getKVData, saveKVData } from "@/lib/kv";
import {
  readTournamentData as readData,
  writeTournamentData as writeData,
  evaluateMatch,
  normalizeTopic,
  recalculateTournamentStandings,
  syncTournamentData,
  getTournamentData,
} from "@/lib/tournament";

export {
  readData,
  writeData,
  evaluateMatch,
  normalizeTopic,
  recalculateTournamentStandings,
  syncTournamentData,
  getTournamentData,
};



export async function GET() {
  const data = await getTournamentData();
  return NextResponse.json({ success: true, data });
}

export async function POST(request) {
  try {
    const body = await request.json();
    let currentData = await getKVData("fpt_tournament", readData);
    if (!currentData) {
      currentData = readData();
    }

    const { action } = body;

    // Reset to local initial data
    if (action === "reset") {
      let freshData = readData();
      if (freshData) {
        freshData = syncTournamentData(freshData);
      }
      await saveKVData("fpt_tournament", freshData, writeData);
      return NextResponse.json({ success: true, data: freshData });
    }

    // Save full tournament payload
    if (action === "save_all" && body.data) {
      currentData = syncTournamentData(body.data);
      currentData.updatedAt = new Date().toISOString();
      await saveKVData("fpt_tournament", currentData, writeData);
      return NextResponse.json({ success: true, data: currentData });
    }

    // Set showPollTable toggle
    if (action === "set_poll_table") {
      const showPollTable = Boolean(body.showPollTable);
      currentData.showPollTable = showPollTable;
      currentData.updatedAt = new Date().toISOString();
      await saveKVData("fpt_tournament", currentData, writeData);
      return NextResponse.json({ success: true, showPollTable, data: currentData });
    }

    // Update individual match
    if (action === "save_match") {
      const { matchdayId, matchId, matchData } = body;
      if (!matchdayId || !matchId || !matchData) {
        return NextResponse.json({ success: false, error: "Missing matchdayId, matchId, or matchData" }, { status: 400 });
      }

      const mdIndex = currentData.matchdays.findIndex((md) => md.id === matchdayId);
      if (mdIndex === -1) {
        return NextResponse.json({ success: false, error: "Matchday not found" }, { status: 404 });
      }

      const matchIndex = currentData.matchdays[mdIndex].matches.findIndex((m) => m.id === matchId);
      if (matchIndex === -1) {
        return NextResponse.json({ success: false, error: "Match not found" }, { status: 404 });
      }

      // Merge match updates
      const existingMatch = currentData.matchdays[mdIndex].matches[matchIndex];
      const updatedMatch = {
        ...existingMatch,
        ...matchData,
      };

      currentData.matchdays[mdIndex].matches[matchIndex] = updatedMatch;

      // Auto-sync replay if matchData has youtubeUrl
      if (matchData.youtubeUrl !== undefined) {
        if (!Array.isArray(currentData.replays)) {
          currentData.replays = [];
        }
        const cleanUrl = String(matchData.youtubeUrl || "").trim();
        const repIdx = currentData.replays.findIndex((r) => r.matchId === matchId);
        if (cleanUrl) {
          const p1Name = updatedMatch.player1?.nickname ? `${updatedMatch.player1.nickname} (${updatedMatch.player1.name})` : (updatedMatch.player1?.name || "Player 1");
          const p2Name = updatedMatch.player2?.nickname ? `${updatedMatch.player2.nickname} (${updatedMatch.player2.name})` : (updatedMatch.player2?.name || "Player 2");
          const repTitle = `คู่ที่ ${updatedMatch.matchNumber || updatedMatch.id} (กลุ่ม ${updatedMatch.group}): ${p1Name} vs ${p2Name}`;

          if (repIdx !== -1) {
            currentData.replays[repIdx].url = cleanUrl;
            currentData.replays[repIdx].updatedAt = new Date().toISOString();
          } else {
            currentData.replays.unshift({
              id: `rep-${matchId}-${Date.now()}`,
              title: repTitle,
              url: cleanUrl,
              matchId: matchId,
              matchdayId: matchdayId,
              matchdayName: currentData.matchdays[mdIndex].name,
              group: updatedMatch.group,
              description: `${updatedMatch.player1?.topic || ""} vs ${updatedMatch.player2?.topic || ""}`,
              createdAt: new Date().toISOString(),
            });
          }
        } else if (repIdx !== -1) {
          // If url cleared, remove that match's auto-replay
          currentData.replays.splice(repIdx, 1);
        }
      }

      // Recalculate standings, contestant topic sets (set 1 & 2), and topic rankings
      currentData = syncTournamentData(currentData);
      currentData.updatedAt = new Date().toISOString();

      await saveKVData("fpt_tournament", currentData, writeData);
      return NextResponse.json({ success: true, data: currentData, updatedMatch });
    }

    // Update contestant info (name, nickname, photo, group, topics)
    if (action === "update_contestant") {
      const { name, newName, photo, nickname, group, topics } = body;
      if (!name) {
        return NextResponse.json({ success: false, error: "Contestant name is required" }, { status: 400 });
      }

      const finalName = newName && newName.trim() ? newName.trim() : name;

      // Update in contestants list
      (currentData.contestants || []).forEach((item) => {
        if (item.name === name) {
          item.name = finalName;
          if (photo !== undefined) item.photo = photo;
          if (nickname !== undefined) item.nickname = nickname;
          if (group !== undefined) item.group = group;
          if (topics !== undefined) item.topics = topics;
        }
      });

      // Update in standings (group A and B)
      ["groupA", "groupB"].forEach((grpKey) => {
        if (Array.isArray(currentData.standings?.[grpKey])) {
          currentData.standings[grpKey].forEach((item) => {
            if (item.name === name) {
              item.name = finalName;
              if (photo !== undefined) item.photo = photo;
              if (nickname !== undefined) item.nickname = nickname;
              if (group !== undefined) item.group = group;
              if (topics !== undefined) item.topics = topics;
            }
          });
        }
      });

      // Update in matchdays matches
      (currentData.matchdays || []).forEach((md) => {
        (md.matches || []).forEach((m) => {
          if (m.player1?.name === name) {
            m.player1.name = finalName;
            if (photo !== undefined) m.player1.photo = photo;
            if (nickname !== undefined) m.player1.nickname = nickname;
          }
          if (m.player2?.name === name) {
            m.player2.name = finalName;
            if (photo !== undefined) m.player2.photo = photo;
            if (nickname !== undefined) m.player2.nickname = nickname;
          }
        });
      });

      // Update in topic rankings
      (currentData.topicRankings || []).forEach((t) => {
        if (t.name === name) {
          t.name = finalName;
          if (photo !== undefined) t.photo = photo;
          if (nickname !== undefined) t.nickname = nickname;
        }
      });

      // Cross-sync to leaderboard if contestant exists there
      try {
        const lbPath = path.join(process.cwd(), "src/app/data/leaderboard.json");
        if (fs.existsSync(lbPath)) {
          const lbData = JSON.parse(fs.readFileSync(lbPath, "utf-8"));
          let lbChanged = false;
          lbData.forEach((p) => {
            if (p.name === name || (nickname && p.nickname === nickname)) {
              p.name = finalName;
              if (photo !== undefined) p.image = photo;
              if (nickname !== undefined) p.nickname = nickname;
              lbChanged = true;
            }
          });
          if (lbChanged) {
            fs.writeFileSync(lbPath, JSON.stringify(lbData, null, 2), "utf-8");
            saveKVData("fpt_leaderboard", lbData).catch(() => {});
          }
        }
      } catch (e) {}

      currentData = syncTournamentData(currentData);
      currentData.updatedAt = new Date().toISOString();
      await saveKVData("fpt_tournament", currentData, writeData);
      return NextResponse.json({ success: true, data: currentData });
    }

    // Update matchday information
    if (action === "update_matchday") {
      const { matchdayId, name, dateRange } = body;
      const md = (currentData.matchdays || []).find((m) => m.id === matchdayId);
      if (md) {
        if (name !== undefined) md.name = name;
        if (dateRange !== undefined) md.dateRange = dateRange;
        currentData.updatedAt = new Date().toISOString();
        await saveKVData("fpt_tournament", currentData, writeData);
        return NextResponse.json({ success: true, data: currentData });
      }
      return NextResponse.json({ success: false, error: "Matchday not found" }, { status: 404 });
    }

    // Bulk update matchdays
    if (action === "update_matchdays" && Array.isArray(body.matchdays)) {
      body.matchdays.forEach((incoming) => {
        const md = (currentData.matchdays || []).find((m) => m.id === incoming.id);
        if (md) {
          if (incoming.name !== undefined) md.name = incoming.name;
          if (incoming.dateRange !== undefined) md.dateRange = incoming.dateRange;
        }
      });
      currentData = syncTournamentData(currentData);
      currentData.updatedAt = new Date().toISOString();
      await saveKVData("fpt_tournament", currentData, writeData);
      return NextResponse.json({ success: true, data: currentData });
    }

    // Bulk update contestant photos
    if (action === "bulk_update_photos" && body.photos && typeof body.photos === "object") {
      const photosMap = body.photos; // { [name]: photoUrl }

      Object.entries(photosMap).forEach(([name, rawUrl]) => {
        let photo = typeof rawUrl === "string" ? rawUrl.trim() : "";
        if (photo.startsWith("http://")) photo = photo.replace("http://", "https://");
        if (photo.includes("?authuser=")) photo = photo.split("?authuser=")[0];

        const updateInArray = (arr) => {
          if (!Array.isArray(arr)) return;
          arr.forEach((item) => {
            if (item.name === name) item.photo = photo;
          });
        };

        updateInArray(currentData.contestants);
        updateInArray(currentData.standings?.groupA);
        updateInArray(currentData.standings?.groupB);

        (currentData.matchdays || []).forEach((md) => {
          (md.matches || []).forEach((m) => {
            if (m.player1?.name === name) m.player1.photo = photo;
            if (m.player2?.name === name) m.player2.photo = photo;
          });
        });

        (currentData.topicRankings || []).forEach((t) => {
          if (t.name === name) t.photo = photo;
        });

        // Cross sync to leaderboard
        try {
          const lbPath = path.join(process.cwd(), "src/app/data/leaderboard.json");
          if (fs.existsSync(lbPath)) {
            const lbData = JSON.parse(fs.readFileSync(lbPath, "utf-8"));
            let lbChanged = false;
            lbData.forEach((p) => {
              if (p.name === name) {
                p.image = photo;
                lbChanged = true;
              }
            });
            if (lbChanged) {
              fs.writeFileSync(lbPath, JSON.stringify(lbData, null, 2), "utf-8");
              saveKVData("fpt_leaderboard", lbData).catch(() => {});
            }
          }
        } catch (e) {}
      });

      currentData = syncTournamentData(currentData);
      currentData.updatedAt = new Date().toISOString();
      await saveKVData("fpt_tournament", currentData, writeData);
      return NextResponse.json({ success: true, data: currentData });
    }

    // Save or update entire replays list
    if (action === "save_replays" && Array.isArray(body.replays)) {
      currentData.replays = body.replays;
      currentData.updatedAt = new Date().toISOString();
      await saveKVData("fpt_tournament", currentData, writeData);
      return NextResponse.json({ success: true, data: currentData });
    }

    // Add or update single replay
    if (action === "save_replay" && body.replay) {
      if (!Array.isArray(currentData.replays)) {
        currentData.replays = [];
      }
      const incoming = body.replay;
      const replayId = incoming.id || `rep-${Date.now()}`;
      const existingIdx = currentData.replays.findIndex((r) => r.id === replayId);
      const replayItem = {
        ...incoming,
        id: replayId,
        updatedAt: new Date().toISOString(),
      };
      if (existingIdx !== -1) {
        currentData.replays[existingIdx] = replayItem;
      } else {
        currentData.replays.unshift(replayItem);
      }

      // If replay links to a match, also sync youtubeUrl to that match
      if (incoming.matchId && incoming.matchdayId) {
        const md = (currentData.matchdays || []).find((m) => m.id === incoming.matchdayId);
        if (md) {
          const match = (md.matches || []).find((m) => m.id === incoming.matchId);
          if (match) {
            match.youtubeUrl = incoming.url || incoming.youtubeUrl || "";
          }
        }
      }

      currentData.updatedAt = new Date().toISOString();
      await saveKVData("fpt_tournament", currentData, writeData);
      return NextResponse.json({ success: true, data: currentData, replay: replayItem });
    }

    // Delete single replay
    if (action === "delete_replay" && body.id) {
      if (Array.isArray(currentData.replays)) {
        const toDelete = currentData.replays.find((r) => r.id === body.id);
        currentData.replays = currentData.replays.filter((r) => r.id !== body.id);
        if (toDelete?.matchId && toDelete?.matchdayId) {
          const md = (currentData.matchdays || []).find((m) => m.id === toDelete.matchdayId);
          if (md) {
            const match = (md.matches || []).find((m) => m.id === toDelete.matchId);
            if (match && match.youtubeUrl === toDelete.url) {
              delete match.youtubeUrl;
            }
          }
        }
      }
      currentData.updatedAt = new Date().toISOString();
      await saveKVData("fpt_tournament", currentData, writeData);
      return NextResponse.json({ success: true, data: currentData });
    }

    // Force recalculate standings
    if (action === "recalculate_standings") {
      currentData = syncTournamentData(currentData);
      currentData.updatedAt = new Date().toISOString();
      await saveKVData("fpt_tournament", currentData, writeData);
      return NextResponse.json({ success: true, data: currentData });
    }

    return NextResponse.json({ success: false, error: "Unknown action" }, { status: 400 });
  } catch (error) {
    console.error("Error in tournament POST:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
