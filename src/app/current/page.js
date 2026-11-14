import { getTournamentData } from "@/lib/tournament";
import CurrentClient from "./CurrentClient";
import defaultTournamentData from "@/app/data/tournament.json";

export const dynamic = "force-dynamic";

export default async function CurrentPage() {
  let data = null;
  try {
    data = await getTournamentData();
  } catch (err) {
    console.error("Error fetching tournament data on server:", err);
  }

  return <CurrentClient initialData={data || defaultTournamentData} />;
}
