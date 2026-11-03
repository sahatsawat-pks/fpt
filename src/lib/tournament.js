import fs from "fs";
import path from "path";
import { getKVData, saveKVData } from "@/lib/kv";

const DATA_FILE = path.join(process.cwd(), "src/app/data/tournament.json");

export function readTournamentData() {
  try {
    if (!fs.existsSync(DATA_FILE)) {
      return null;
    }
    const content = fs.readFileSync(DATA_FILE, "utf-8");
    return JSON.parse(content);
  } catch (err) {
    console.error("Error reading tournament.json:", err);
    return null;
  }
}

export function writeTournamentData(data) {
  try {
    fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), "utf-8");
  } catch (err) {
    if (err.code !== "EROFS") {
      console.error("Error writing tournament.json:", err);
    }
  }
}

// Calculate match category points & winner
export function evaluateMatch(p1Scores, p2Scores, manualP1LP = null, manualP2LP = null) {
  const categories = ["3sec", "qa", "jigsaw", "attribute"];
  let cp1 = 0;
  let cp2 = 0;
  const categoryResults = {};

  categories.forEach((cat) => {
    const s1 = typeof p1Scores?.[cat] === "number" ? p1Scores[cat] : null;
    const s2 = typeof p2Scores?.[cat] === "number" ? p2Scores[cat] : null;

    if (s1 === null && s2 === null) {
      categoryResults[cat] = null;
      return;
    }

    const val1 = s1 || 0;
    const val2 = s2 || 0;

    if (val1 > val2) {
      cp1 += 1;
      categoryResults[cat] = "player1";
    } else if (val2 > val1) {
      cp2 += 1;
      categoryResults[cat] = "player2";
    } else if (val1 > 0 && val1 === val2) {
      cp1 += 1;
      cp2 += 1;
      categoryResults[cat] = "draw";
    } else {
      categoryResults[cat] = null;
    }
  });

  const sum1 = categories.reduce((acc, cat) => acc + (typeof p1Scores?.[cat] === "number" ? p1Scores[cat] : 0), 0);
  const sum2 = categories.reduce((acc, cat) => acc + (typeof p2Scores?.[cat] === "number" ? p2Scores[cat] : 0), 0);

  let winner = null;
  let autoLp1 = 0;
  let autoLp2 = 0;

  if (cp1 > cp2) {
    winner = "player1";
    if (cp1 >= 4 && cp2 === 0) {
      autoLp1 = 5;
      autoLp2 = -2;
    } else if (cp1 >= 4) {
      autoLp1 = 4;
      autoLp2 = 0;
    } else if (cp1 === 3 && cp2 === 0) {
      autoLp1 = 3;
      autoLp2 = -1;
    } else {
      autoLp1 = 3;
      autoLp2 = 0;
    }
  } else if (cp2 > cp1) {
    winner = "player2";
    if (cp2 >= 4 && cp1 === 0) {
      autoLp2 = 5;
      autoLp1 = -2;
    } else if (cp2 >= 4) {
      autoLp2 = 4;
      autoLp1 = 0;
    } else if (cp2 === 3 && cp1 === 0) {
      autoLp2 = 3;
      autoLp1 = -1;
    } else {
      autoLp2 = 3;
      autoLp1 = 0;
    }
  } else if (cp1 === cp2 && (sum1 > 0 || sum2 > 0)) {
    winner = "draw";
    autoLp1 = 1;
    autoLp2 = 1;
  }

  const lp1 = manualP1LP !== null && manualP1LP !== undefined && manualP1LP !== "" ? Number(manualP1LP) : autoLp1;
  const lp2 = manualP2LP !== null && manualP2LP !== undefined && manualP2LP !== "" ? Number(manualP2LP) : autoLp2;

  return {
    cp1,
    cp2,
    sum1,
    sum2,
    winner,
    lp1,
    lp2,
    categoryResults,
  };
}

export function normalizeTopic(str) {
  return (str || "")
    .trim()
    .normalize("NFC")
    .replace(/ซึบาสะ/g, "สึบาสะ")
    .toLowerCase();
}

// Recalculate standings from matchdays
export function recalculateTournamentStandings(currentData) {
  const statsMap = {};

  // Initialize stats for all contestants in both groups
  ["groupA", "groupB"].forEach((grp) => {
    (currentData.standings?.[grp] || []).forEach((c) => {
      statsMap[c.name] = {
        name: c.name,
        nickname: c.nickname,
        photo: c.photo || "",
        group: grp === "groupA" ? "A" : "B",
        leaguePoints: 0,
        win: 0,
        lose: 0,
        draw: 0,
        categoriesWon: 0,
        categoriesLost: 0,
        totalScore: 0,
        topics: c.topics || [],
      };
    });
  });

  // Iterate over all completed matches
  (currentData.matchdays || []).forEach((md) => {
    (md.matches || []).forEach((m) => {
      if (m.status !== "completed") return;

      const p1Name = m.player1?.name;
      const p2Name = m.player2?.name;

      if (p1Name && statsMap[p1Name]) {
        const s = statsMap[p1Name];
        s.leaguePoints += Number(m.player1?.leaguePoint) || 0;
        s.categoriesWon += Number(m.player1?.categoryPoints) || 0;
        s.categoriesLost += Number(m.player2?.categoryPoints) || 0;
        s.totalScore += Number(m.player1?.sum) || 0;
        if (m.winner === "player1") s.win += 1;
        else if (m.winner === "player2") s.lose += 1;
        else if (m.winner === "draw") s.draw += 1;
      }

      if (p2Name && statsMap[p2Name]) {
        const s = statsMap[p2Name];
        s.leaguePoints += Number(m.player2?.leaguePoint) || 0;
        s.categoriesWon += Number(m.player2?.categoryPoints) || 0;
        s.categoriesLost += Number(m.player1?.categoryPoints) || 0;
        s.totalScore += Number(m.player2?.sum) || 0;
        if (m.winner === "player2") s.win += 1;
        else if (m.winner === "player1") s.lose += 1;
        else if (m.winner === "draw") s.draw += 1;
      }
    });
  });

  const sortAndRank = (list) => {
    const sorted = [...list].sort((a, b) => {
      if (b.leaguePoints !== a.leaguePoints) return b.leaguePoints - a.leaguePoints;
      const diffB = b.categoriesWon - b.categoriesLost;
      const diffA = a.categoriesWon - a.categoriesLost;
      if (diffB !== diffA) return diffB - diffA;
      if (a.categoriesWon !== b.categoriesWon) return b.categoriesWon - a.categoriesWon;
      if (a.categoriesLost !== b.categoriesLost) return b.categoriesLost - a.categoriesLost;
      if (a.draw !== b.draw) return b.draw - a.draw;
      return b.totalScore - a.totalScore;
    });

    return sorted.map((item, idx) => {
      const diff = item.categoriesWon - item.categoriesLost;
      return {
        ...item,
        rank: idx + 1,
        scoreDiff: diff > 0 ? `+${diff}` : String(diff),
      };
    });
  };

  const groupAList = Object.values(statsMap).filter((x) => x.group === "A");
  const groupBList = Object.values(statsMap).filter((x) => x.group === "B");

  return {
    groupA: sortAndRank(groupAList),
    groupB: sortAndRank(groupBList),
  };
}

// Synchronize all standings, contestant topic sets (set 1 & set 2), and topic rankings from completed matches
export function syncTournamentData(currentData) {
  if (!currentData) return currentData;

  // 1. Recalculate standings from matchdays
  const newStandings = recalculateTournamentStandings(currentData);
  currentData.standings = newStandings;

  // 2. Map all contestants & initialize topics template with set1 and set2
  const contestantMap = {};

  const ensureTopicsTemplate = (topicsList) => {
    return (topicsList || []).map((top) => {
      const topicName = typeof top === "string" ? top : top.topic;
      return {
        topic: topicName,
        set1: { "3sec": null, qa: null, jigsaw: null, attribute: null, sum: 0, played: false },
        set2: { "3sec": null, qa: null, jigsaw: null, attribute: null, sum: 0, played: false },
      };
    });
  };

  (currentData.contestants || []).forEach((c) => {
    contestantMap[c.name] = { ...c, topics: ensureTopicsTemplate(c.topics) };
    if (c.nickname) contestantMap[c.nickname] = contestantMap[c.name];
  });

  ["groupA", "groupB"].forEach((grp) => {
    (currentData.standings?.[grp] || []).forEach((c) => {
      if (!contestantMap[c.name]) {
        contestantMap[c.name] = { ...c, topics: ensureTopicsTemplate(c.topics) };
        if (c.nickname) contestantMap[c.nickname] = contestantMap[c.name];
      }
    });
  });

  // 3. Scan all completed matches in order across all matchdays
  const allTopicPerformances = [];

  (currentData.matchdays || []).forEach((md) => {
    (md.matches || []).forEach((m) => {
      if (m.status !== "completed") return;

      [m.player1, m.player2].forEach((p) => {
        if (!p || !p.name || !p.topic) return;
        const c = contestantMap[p.name] || (p.nickname && contestantMap[p.nickname]);
        if (!c) return;

        const normMatchTopic = normalizeTopic(p.topic);
        let topObj = c.topics.find((x) => normalizeTopic(x.topic) === normMatchTopic);

        if (!topObj) {
          topObj = {
            topic: p.topic,
            set1: { "3sec": null, qa: null, jigsaw: null, attribute: null, sum: 0, played: false },
            set2: { "3sec": null, qa: null, jigsaw: null, attribute: null, sum: 0, played: false },
          };
          c.topics.push(topObj);
        }

        const scoreObj = {
          "3sec": p.scores?.["3sec"] !== undefined && p.scores?.["3sec"] !== null ? Number(p.scores["3sec"]) : null,
          qa: p.scores?.qa !== undefined && p.scores?.qa !== null ? Number(p.scores.qa) : null,
          jigsaw: p.scores?.jigsaw !== undefined && p.scores?.jigsaw !== null ? Number(p.scores.jigsaw) : null,
          attribute: p.scores?.attribute !== undefined && p.scores?.attribute !== null ? Number(p.scores.attribute) : null,
          sum: Number(p.sum) || 0,
          played: true,
          matchId: m.id,
          matchday: md.name || md.id,
        };

        let isSet2 = false;
        if (p.set === "set2") {
          isSet2 = true;
        } else if (p.set === "set1") {
          isSet2 = false;
        } else {
          // auto detection
          if (topObj.set1.played && !topObj.set2.played && topObj.set1.matchId !== m.id) {
            isSet2 = true;
          }
        }

        if (isSet2) {
          topObj.set2 = scoreObj;
        } else {
          topObj.set1 = scoreObj;
        }

        allTopicPerformances.push({
          contestantName: c.name,
          nickname: c.nickname,
          photo: c.photo || "",
          group: c.group || "A",
          topic: p.topic,
          setLabel: isSet2 ? "ชุดที่ 2" : "ชุดที่ 1",
          scores: {
            "3sec": scoreObj["3sec"],
            qa: scoreObj.qa,
            jigsaw: scoreObj.jigsaw,
            attribute: scoreObj.attribute,
          },
          sum: scoreObj.sum,
          matchId: m.id,
          matchday: md.name || md.id,
        });
      });
    });
  });

  // 4. Mirror synced topics back into standings
  ["groupA", "groupB"].forEach((grp) => {
    (currentData.standings?.[grp] || []).forEach((c) => {
      const updated = contestantMap[c.name];
      if (updated) {
        c.topics = updated.topics;
      }
    });
  });

  // 5. Update topicRankings sorted by sum descending (tie-breakers: attribute, jigsaw, qa, 3sec)
  allTopicPerformances.sort((a, b) => {
    if (b.sum !== a.sum) return b.sum - a.sum;
    if ((b.scores.attribute ?? 0) !== (a.scores.attribute ?? 0)) return (b.scores.attribute ?? 0) - (a.scores.attribute ?? 0);
    if ((b.scores.jigsaw ?? 0) !== (a.scores.jigsaw ?? 0)) return (b.scores.jigsaw ?? 0) - (a.scores.jigsaw ?? 0);
    if ((b.scores.qa ?? 0) !== (a.scores.qa ?? 0)) return (b.scores.qa ?? 0) - (a.scores.qa ?? 0);
    return (b.scores["3sec"] ?? 0) - (a.scores["3sec"] ?? 0);
  });

  currentData.topicRankings = allTopicPerformances.map((item, idx) => {
    if (idx > 0 && allTopicPerformances[idx - 1].sum === item.sum) {
      const prevRank = allTopicPerformances[idx - 1].rank || idx;
      allTopicPerformances[idx].rank = prevRank;
      return { ...item, rank: prevRank };
    }
    const r = idx + 1;
    allTopicPerformances[idx].rank = r;
    return { ...item, rank: r };
  });

  return currentData;
}

export async function getTournamentData() {
  let data = await getKVData("fpt_tournament", readTournamentData);
  if (!data) data = readTournamentData();
  if (data) {
    data = syncTournamentData(data);
  }
  return data;
}
