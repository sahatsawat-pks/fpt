import { getTournamentData, syncTournamentData } from "@/lib/tournament";
import TournamentClient from "./TournamentClient";
import defaultTournamentData from "@/app/data/tournament.json";
import { getKVData } from "@/lib/kv";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

export default async function TournamentPage() {
  let data = null;
  try {
    data = await getTournamentData();
  } catch (err) {
    console.error("Error fetching tournament data on server:", err);
  }
  if (!data) data = defaultTournamentData;

  // Read settings for tournamentUpdateUpToMatch, awardOverride, penaltyOverride
  let cutoff = "all";
  let awardOverride = "auto";
  let penaltyOverride = "auto";
  try {
    const rawSettings = await getKVData("fpt_settings", () => {
      const p = path.join(process.cwd(), "src/app/data/settings.json");
      if (fs.existsSync(p)) return JSON.parse(fs.readFileSync(p, "utf-8"));
      return {};
    });
    if (rawSettings && rawSettings.tournamentUpdateUpToMatch !== undefined) {
      cutoff = rawSettings.tournamentUpdateUpToMatch;
    }
    if (rawSettings && rawSettings.tournamentAwardOverride) {
      awardOverride = rawSettings.tournamentAwardOverride;
    }
    if (rawSettings && rawSettings.tournamentPenaltyOverride) {
      penaltyOverride = rawSettings.tournamentPenaltyOverride;
    }
  } catch (e) {}

  let displayData = data;
  if (cutoff !== "all" && !isNaN(Number(cutoff))) {
    const maxMatchNum = Number(cutoff);
    try {
      const cloned = JSON.parse(JSON.stringify(data));
      const filteredMatchdays = [];
      (cloned.matchdays || []).forEach((md) => {
        const validMatches = (md.matches || []).filter((m) => {
          const num = Number(m.matchNumber) || 999;
          return num <= maxMatchNum;
        });
        if (validMatches.length > 0) {
          md.matches = validMatches;
          filteredMatchdays.push(md);
        }
      });
      cloned.matchdays = filteredMatchdays;
      displayData = syncTournamentData(cloned);
    } catch (err) {
      console.error("Error filtering tournament matches for cutoff:", err);
      displayData = data;
    }
  }

  return (
    <TournamentClient
      initialData={displayData}
      isPublicView={true}
      cutoffMatch={cutoff}
      awardOverride={awardOverride}
      penaltyOverride={penaltyOverride}
    />
  );
}
