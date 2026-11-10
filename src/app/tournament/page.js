import { getTournamentData } from "@/lib/tournament";
import TournamentClient from "./TournamentClient";
import defaultTournamentData from "@/app/data/tournament.json";

export const dynamic = "force-dynamic";

export default async function TournamentPage() {
  let data = null;
  try {
    data = await getTournamentData();
  } catch (err) {
    console.error("Error fetching tournament data on server:", err);
  }

  return <TournamentClient initialData={data || defaultTournamentData} />;
}
