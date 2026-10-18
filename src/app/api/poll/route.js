import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { getKVData, saveKVData } from "@/lib/kv";

const POLL_FILE = path.join(process.cwd(), "src/app/data/poll.json");

const DEFAULT_POLL = [
  { pollRank: 1, name: "ศุภกร นิลสุวรรณ", nickname: "หมี", topic: "วง Coldplay", percent: "10.26%" },
  { pollRank: 2, name: "สหัสวรรษ นิจพันธ์", nickname: "พีท", topic: "รถไฟฟ้าไทย", percent: "7.43%" },
  { pollRank: 3, name: "กันตชาติ ศรีเพ็ชร", nickname: "กัปตัน", topic: "สโมสรฟุตบอลลิเวอร์พูล", percent: "7.20%" },
  { pollRank: 4, name: "สิปโปทัย ศรีบุญเรือง", nickname: "กัส", topic: "ประวัติศาสตร์กรุงรัตนโกสินทร์", percent: "6.39%" },
  { pollRank: 5, name: "คุณอินทร์ บุญสิน", nickname: "อินทร์", topic: "วง Queen", percent: "6.27%" },
  { pollRank: 6, name: "ภควัต ศรศุกลรัตน์", nickname: "อาร์ม", topic: "การเมืองไทย", percent: "5.72%" },
  { pollRank: 7, name: "เชาว์วรรธน์ จันทร์สุข", nickname: "ก๊อง", topic: "Workpoint", percent: "5.39%" },
  { pollRank: 8, name: "ธวัชชัย แสงสว่าง", nickname: "ปืน", topic: "ไอ้มดแดง", percent: "5.22%" },
  { pollRank: 9, name: "ธนกร สุขปาน", nickname: "ออม", topic: "เพลงลูกทุ่ง", percent: "5.02%" },
  { pollRank: 10, name: "นัทธภพ ธนวัฒนาเจริญ", nickname: "นนท์", topic: "Battle Spirits", percent: "4.42%" },
  { pollRank: 11, name: "พัชราภรณ์ ขวัญพรหมสี", nickname: "เอิร์น", topic: "Honkai Impact 3rd", percent: "4.06%" },
  { pollRank: 12, name: "ณัฐภัทร แก้วสินธุ์", nickname: "นที", topic: "MasterChef Thailand", percent: "4.02%" },
  { pollRank: 13, name: "ณัฐดนัย วงศ์ปัญญา", nickname: "แฟรงค์", topic: "Honkai: Star Rail", percent: "3.94%" },
  { pollRank: 14, name: "พีรภัทร หมื่นหาญ", nickname: "พีม", topic: "Club Friday The Series", percent: "3.61%" },
  { pollRank: 15, name: "ปวัน ธนพรพันธ์", nickname: "ป๊ะ", topic: "รายการ Taskmaster", percent: "3.36%" },
  { pollRank: 16, name: "ณัฐวุฒิ โนรี", nickname: "แสตมป์", topic: "Thai Boy Love Series", percent: "3.26%" },
  { pollRank: 17, name: "ณฤกร วงศบูรณะ", nickname: "ตฤณ", topic: "Tattoo Colour", percent: "3.02%" },
  { pollRank: 18, name: "พัทธ์ศีล ปุญศิริ", nickname: "ศีล", topic: "บอร์ดเกม", percent: "2.96%" },
  { pollRank: 19, name: "รติพงษ์ กมลเกียรติพัฒน์", nickname: "นิว", topic: "ไพ่ทาโรต์", percent: "2.81%" },
  { pollRank: 20, name: "ธนพัฒน์ สง่าแสง", nickname: "แบงค์", topic: "48Group Thailand", percent: "2.30%" },
  { pollRank: 21, name: "ฤทธิชัย ภูสิญามณี", nickname: "ริท", topic: "วง Serious Bacon", percent: "1.71%" },
  { pollRank: 22, name: "นิธิกร วิชัยวงศ์", nickname: "ก๊อปปี้", topic: "ขบวนการ 5 สี", percent: "1.66%" },
];

function readLocalPoll() {
  try {
    if (!fs.existsSync(POLL_FILE)) {
      try {
        fs.mkdirSync(path.dirname(POLL_FILE), { recursive: true });
        fs.writeFileSync(POLL_FILE, JSON.stringify(DEFAULT_POLL, null, 2), "utf-8");
      } catch (e) {}
      return DEFAULT_POLL;
    }
    const content = fs.readFileSync(POLL_FILE, "utf-8");
    return JSON.parse(content);
  } catch (err) {
    console.error("Error reading poll data:", err);
    return DEFAULT_POLL;
  }
}

function writeLocalPoll(data) {
  try {
    fs.mkdirSync(path.dirname(POLL_FILE), { recursive: true });
    fs.writeFileSync(POLL_FILE, JSON.stringify(data, null, 2), "utf-8");
  } catch (err) {
    if (err.code !== "EROFS") {
      console.error("Error writing poll data:", err);
    }
  }
}

export async function GET() {
  const data = await getKVData("fpt_poll", readLocalPoll);
  return NextResponse.json({ success: true, data: data || DEFAULT_POLL });
}

export async function POST(request) {
  try {
    const body = await request.json();

    // Reset poll to default
    if (body.action === "reset") {
      await saveKVData("fpt_poll", DEFAULT_POLL, writeLocalPoll);
      return NextResponse.json({ success: true, data: DEFAULT_POLL, message: "รีเซ็ตข้อมูลผลโพลล์เป็นค่าเริ่มต้นแล้ว" });
    }

    // Replace all items (for reordering or batch save)
    if (body.action === "save_all" && Array.isArray(body.items)) {
      const sanitized = body.items.map((item, idx) => ({
        pollRank: Number(item.pollRank) || idx + 1,
        name: String(item.name || "").trim(),
        nickname: String(item.nickname || "").trim(),
        topic: String(item.topic || "").trim(),
        percent: String(item.percent || "").trim() || "0.00%",
      }));
      // Sort by pollRank ascending
      sanitized.sort((a, b) => a.pollRank - b.pollRank);
      await saveKVData("fpt_poll", sanitized, writeLocalPoll);
      return NextResponse.json({ success: true, data: sanitized, message: "บันทึกผลโพลล์ทั้งหมดเรียบร้อยแล้ว" });
    }

    // Update single item
    let current = await getKVData("fpt_poll", readLocalPoll);
    if (!Array.isArray(current)) current = [...DEFAULT_POLL];

    if (body.action === "delete" && body.pollRank) {
      current = current.filter((item) => Number(item.pollRank) !== Number(body.pollRank));
      // Re-index remaining ranks
      current = current.map((item, i) => ({ ...item, pollRank: i + 1 }));
      await saveKVData("fpt_poll", current, writeLocalPoll);
      return NextResponse.json({ success: true, data: current });
    }

    if (body.action === "add") {
      const newRank = current.length + 1;
      const newItem = {
        pollRank: newRank,
        name: String(body.name || "ผู้เข้าแข่งขันใหม่").trim(),
        nickname: String(body.nickname || "").trim(),
        topic: String(body.topic || "-").trim(),
        percent: String(body.percent || "0.00%").trim(),
      };
      current.push(newItem);
      await saveKVData("fpt_poll", current, writeLocalPoll);
      return NextResponse.json({ success: true, data: current });
    }

    return NextResponse.json({ success: false, error: "Invalid action" }, { status: 400 });
  } catch (err) {
    console.error("Error in poll API:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
