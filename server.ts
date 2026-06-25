import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";

const app = express();
const PORT = 3000;

// Enable JSON middleware
app.use(express.json());

// In-memory Task Database
interface Task {
  refId: string;
  type: string;
  memberId: string;
  memberName: string;
  details: string;
  additionalInfo: string;
  status: string;
  score: string;
  actionLabel: string;
}

let inMemoryTasks: Task[] = [];
let isLoaded = false;

const GOOGLE_SHEET_CSV_URL = "https://docs.google.com/spreadsheets/d/1XlVfneJ-RXvQW7jPUL5Am9jkt7KoMeAPNkRJ4NA-_D8/export?format=csv";

// CSV Parser Helper
function parseCSV(text: string): Task[] {
  const lines = text.split(/\r?\n/).filter(line => line.trim() !== '');
  if (lines.length === 0) return [];

  // Helper to split a CSV line into fields correctly (handling quotes and escaped quotes)
  const splitLine = (line: string): string[] => {
    const fields: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        // If we see two quotes inside quotes, it's an escaped quote
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++; // Skip next quote
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        fields.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    fields.push(current.trim());
    return fields;
  };

  const firstLine = lines[0] || '';
  const headers = splitLine(firstLine).map(h => h.toLowerCase().replace(/['"()]/g, '').trim());
  
  // Find column indices based on standard Thai and English headers
  const findIndex = (aliases: string[]): number => {
    return headers.findIndex(h => aliases.some(alias => h.includes(alias)));
  };

  const refIdIdx = findIndex(['รหัสอ้างอิง', 'refid', 'id', 'ref']);
  const typeIdx = findIndex(['ประเภทคำขอ', 'ประเภท', 'type']);
  const memberIdIdx = findIndex(['รหัสสมาชิก', 'memberid', 'member_id', 'member id']);
  const memberNameIdx = findIndex(['ชื่อสมาชิก', 'ชื่อ', 'membername', 'name']);
  const detailsIdx = findIndex(['รายละเอียดคำขอ', 'รายละเอียด', 'details', 'detail']);
  const additionalInfoIdx = findIndex(['ข้อมูลเพิ่มเติม', 'ข้อมูล', 'additional', 'info', 'additionalinfo']);
  const statusIdx = findIndex(['สถานะ', 'status']);
  const scoreIdx = findIndex(['คะแนน', 'score', 'agri-score', 'agriscore']);
  const actionLabelIdx = findIndex(['การดำเนินการ', 'action', 'actionlabel']);

  const parsed: Task[] = [];
  for (let i = 1; i < lines.length; i++) {
    const fields = splitLine(lines[i]);
    if (fields.length === 0 || (fields.length === 1 && fields[0] === '')) continue;

    const getValue = (idx: number, defaultValue: string): string => {
      if (idx !== -1 && idx < fields.length) {
        let val = fields[idx];
        // Strip surrounding quotes if any
        if (val.startsWith('"') && val.endsWith('"')) {
          val = val.slice(1, -1);
        }
        return val.trim();
      }
      return defaultValue;
    };

    parsed.push({
      refId: getValue(refIdIdx, `REF-TASK-${Math.floor(1000 + Math.random() * 9000)}`),
      type: getValue(typeIdx, 'ทั่วไป'),
      memberId: getValue(memberIdIdx, 'KST-UNKNOWN'),
      memberName: getValue(memberNameIdx, 'ไม่ระบุชื่อ'),
      details: getValue(detailsIdx, ''),
      additionalInfo: getValue(additionalInfoIdx, ''),
      status: getValue(statusIdx, 'รอตรวจสอบ'),
      score: getValue(scoreIdx, 'B (เครดิตปกติ)'),
      actionLabel: getValue(actionLabelIdx, 'ดำเนินการ')
    });
  }
  return parsed;
}

// Fetch helper to populate in-memory database
async function loadTasksFromSheet() {
  const sheetUrls = [
    "https://docs.google.com/spreadsheets/d/1XlVfneJ-RXvQW7jPUL5Am9jkt7KoMeAPNkRJ4NA-_D8/export?format=csv&sheet=Tasks",
    "https://docs.google.com/spreadsheets/d/1XlVfneJ-RXvQW7jPUL5Am9jkt7KoMeAPNkRJ4NA-_D8/export?format=csv"
  ];

  let loadedSuccessfully = false;

  for (const url of sheetUrls) {
    try {
      console.log(`Fetching latest task data from Google Sheets (${url})...`);
      const response = await fetch(url);
      if (!response.ok) {
        console.warn(`Failed to fetch from ${url}: ${response.statusText}`);
        continue;
      }
      const csvText = await response.text();
      const tasks = parseCSV(csvText);
      if (tasks.length > 0) {
        inMemoryTasks = tasks;
        isLoaded = true;
        loadedSuccessfully = true;
        console.log(`Loaded ${tasks.length} tasks successfully from Google Sheets via ${url}`);
        break; // Stop trying URLs if we succeeded
      } else {
        console.warn(`No valid tasks parsed from ${url}`);
      }
    } catch (error) {
      console.error(`Error loading tasks from url ${url}:`, error);
    }
  }

  if (!loadedSuccessfully) {
    console.log("Using mock fallback data...");
    // Fallback if network or fetch fails
    inMemoryTasks = [
      {
        refId: 'REF-INS-2401',
        type: 'เคลมประกันพืชผล',
        memberId: 'KST-88902',
        memberName: 'นายสมชาย ใจดี',
        details: 'แจ้งแปลงสตรอว์เบอร์รีเสียหายจากน้ำท่วม',
        additionalInfo: 'ดูรูปถ่ายจากระบบ Face ID App',
        status: 'รอประเมินความเสียหาย',
        score: 'A (ประวัติดี)',
        actionLabel: 'ดำเนินการ'
      },
      {
        refId: 'REF-MAC-9921',
        type: 'เช่าเครื่องจักร',
        memberId: 'KST-77210',
        memberName: 'นางสมศรี มีทรัพย์',
        details: 'จองรถแทรกเตอร์ 4 ชม.',
        additionalInfo: 'วันที่ใช้: 20 มิ.ย. 67 (หักเงินผ่านบัญชีแล้ว)',
        status: 'รอจัดสรรคนขับ',
        score: 'B+ (เครดิตสูง)',
        actionLabel: 'ดูตารางคิว / อนุมัติคิว'
      },
      {
        refId: 'REF-WEL-1029',
        type: 'เบิกสวัสดิการ',
        memberId: 'KST-88902',
        memberName: 'นายสมชาย ใจดี',
        details: 'ขอเบิกค่ารักษาพยาบาล 2,500 บาท',
        additionalInfo: 'ยืนยัน OTP ผ่าน App แล้ว',
        status: 'รอโอนเงิน',
        score: 'A (ประวัติดี)',
        actionLabel: 'สั่งโอนเข้า ธ.ก.ส.'
      }
    ];
    isLoaded = true;
  }
}

// API Routes

// Get all tasks
app.get("/api/tasks", async (req, res) => {
  if (!isLoaded || inMemoryTasks.length === 0) {
    await loadTasksFromSheet();
  }
  res.json(inMemoryTasks);
});

// Sync/Reset database with Google Sheets
app.post("/api/tasks/sync", async (req, res) => {
  await loadTasksFromSheet();
  res.json({ success: true, message: "ซิงค์ฐานข้อมูลกับ Google Sheets สำเร็จ", tasks: inMemoryTasks });
});

// Update single task status or details
app.put("/api/tasks/:refId", (req, res) => {
  const { refId } = req.params;
  const updates = req.body;
  
  const index = inMemoryTasks.findIndex(t => t.refId === refId);
  if (index !== -1) {
    inMemoryTasks[index] = { ...inMemoryTasks[index], ...updates };
    res.json({ success: true, task: inMemoryTasks[index] });
  } else {
    res.status(404).json({ success: false, message: "ไม่พบข้อมูลคำขออ้างอิง" });
  }
});

// Delete task
app.delete("/api/tasks/:refId", (req, res) => {
  const { refId } = req.params;
  inMemoryTasks = inMemoryTasks.filter(t => t.refId !== refId);
  res.json({ success: true, message: `ลบคำขอ ${refId} เรียบร้อย` });
});

// Serve Frontend Vite dev server or static dist folder
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
    // Warm up cache
    loadTasksFromSheet();
  });
}

startServer();
