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

interface Member {
  id: string;
  name: string;
  crops: string;
  area: string;
  score: string;
  debt: number;
  lastActive: string;
}

let inMemoryTasks: Task[] = [];
let isLoaded = false;

let inMemoryMembers: Member[] = [];
let isMembersLoaded = false;

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

// CRM Member CSV Parser Helper
function parseMemberCSV(text: string): Member[] {
  const lines = text.split(/\r?\n/).filter(line => line.trim() !== '');
  if (lines.length === 0) return [];

  const splitLine = (line: string): string[] => {
    const fields: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
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

  const findIndex = (aliases: string[]): number => {
    return headers.findIndex(h => aliases.some(alias => h.includes(alias)));
  };

  const idIdx = findIndex(['รหัสสมาชิก', 'memberid', 'member_id', 'id']);
  const nameIdx = findIndex(['ชื่อสมาชิก', 'ชื่อเกษตรกร', 'ชื่อ', 'membername', 'name']);
  const cropsIdx = findIndex(['พืชผลหลัก', 'พืชผล', 'พืชหลัก', 'crops', 'crop', 'ประเภทคำขอ']);
  const areaIdx = findIndex(['พื้นที่', 'ที่อยู่', 'area', 'address', 'ข้อมูลเพิ่มเติม']);
  const scoreIdx = findIndex(['คะแนนความน่าเชื่อถือ', 'คะแนน', 'agri-score', 'score', 'status']);
  const debtIdx = findIndex(['ยอดหนี้', 'หนี้', 'debt', 'amount']);
  const lastActiveIdx = findIndex(['ออฟไลน์ล่าสุด', 'เข้าใช้งานล่าสุด', 'lastactive', 'active', 'สถานะ']);

  const parsed: Member[] = [];
  for (let i = 1; i < lines.length; i++) {
    const fields = splitLine(lines[i]);
    if (fields.length === 0 || (fields.length === 1 && fields[0] === '')) continue;

    const getValue = (idx: number, defaultValue: string): string => {
      if (idx !== -1 && idx < fields.length) {
        let val = fields[idx];
        if (val.startsWith('"') && val.endsWith('"')) {
          val = val.slice(1, -1);
        }
        return val.trim();
      }
      return defaultValue;
    };

    const id = getValue(idIdx, `KST-${Math.floor(10000 + Math.random() * 90000)}`);
    const name = getValue(nameIdx, 'ไม่ระบุชื่อ');
    const crops = getValue(cropsIdx, 'สตรอว์เบอร์รี, ลำไย');
    const area = getValue(areaIdx, '15 ไร่ (ต.แม่ริม)');
    
    let rawScore = getValue(scoreIdx, 'B');
    if (rawScore.includes('A')) rawScore = 'A';
    else if (rawScore.includes('B+')) rawScore = 'B+';
    else if (rawScore.includes('B')) rawScore = 'B';
    else if (rawScore.includes('C')) rawScore = 'C';
    else if (rawScore.includes('D')) rawScore = 'D';
    else if (rawScore.includes('F')) rawScore = 'F';

    const debtStr = getValue(debtIdx, '15000');
    const debt = parseInt(debtStr.replace(/[^0-9]/g, '')) || 15000;
    
    const lastActive = getValue(lastActiveIdx, 'วันนี้ 10:45 น.');

    parsed.push({ id, name, crops, area, score: rawScore, debt, lastActive });
  }
  return parsed;
}

// Fetch helper to populate CRM member in-memory database
async function loadMembersFromSheet() {
  const sheetUrls = [
    "https://docs.google.com/spreadsheets/d/1XlVfneJ-RXvQW7jPUL5Am9jkt7KoMeAPNkRJ4NA-_D8/gviz/tq?tqx=out:csv&sheet=CRM",
    "https://docs.google.com/spreadsheets/d/1XlVfneJ-RXvQW7jPUL5Am9jkt7KoMeAPNkRJ4NA-_D8/export?format=csv&sheet=CRM"
  ];

  let loadedSuccessfully = false;

  for (const url of sheetUrls) {
    try {
      console.log(`Fetching CRM member data from Google Sheets (${url})...`);
      const response = await fetch(url);
      if (!response.ok) {
        console.warn(`Failed to fetch from ${url}: ${response.statusText}`);
        continue;
      }
      const csvText = await response.text();
      const parsedMembers = parseMemberCSV(csvText);
      if (parsedMembers.length > 0) {
        inMemoryMembers = parsedMembers;
        isMembersLoaded = true;
        loadedSuccessfully = true;
        console.log(`Loaded ${parsedMembers.length} CRM members successfully from Google Sheets via ${url}`);
        break;
      } else {
        console.warn(`No valid CRM members parsed from ${url}`);
      }
    } catch (error) {
      console.error(`Error loading CRM members from url ${url}:`, error);
    }
  }

  if (!loadedSuccessfully) {
    console.log("Using mock fallback CRM member data...");
    inMemoryMembers = [
      { id: 'KST-88902', name: 'นายสมชาย ใจดี', crops: 'สตรอว์เบอร์รี, ลำไย', area: '15 ไร่ (ต.แม่ริม)', score: 'A', debt: 24500, lastActive: 'วันนี้ 10:45 น.' },
      { id: 'KST-77210', name: 'นางสมศรี มีทรัพย์', crops: 'ข้าวไรซ์เบอร์รี่, ผักสวนครัว', area: '8 ไร่ (ต.สันป่าตอง)', score: 'B+', debt: 10000, lastActive: 'เมื่อวาน 15:30 น.' },
      { id: 'KST-65001', name: 'นายวิชัย รักษ์ดี', crops: 'ข้าวโพดเลี้ยงสัตว์', area: '20 ไร่ (ต.แม่แจ่ม)', score: 'D', debt: 45000, lastActive: '15 มิ.ย. 67' }
    ];
    isMembersLoaded = true;
  }
}

// Fetch helper to populate in-memory database
async function loadTasksFromSheet() {
  const sheetUrls = [
    "https://docs.google.com/spreadsheets/d/1XlVfneJ-RXvQW7jPUL5Am9jkt7KoMeAPNkRJ4NA-_D8/gviz/tq?tqx=out:csv&sheet=Tasks",
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

// Get all CRM members
app.get("/api/members", async (req, res) => {
  if (!isMembersLoaded || inMemoryMembers.length === 0) {
    await loadMembersFromSheet();
  }
  res.json(inMemoryMembers);
});

// Sync CRM members from sheet
app.post("/api/members/sync", async (req, res) => {
  await loadMembersFromSheet();
  res.json({ success: true, message: "ซิงค์รายชื่อสมาชิกกับ Google Sheets สำเร็จ", members: inMemoryMembers });
});

// Create new member
app.post("/api/members", (req, res) => {
  const newMember = req.body;
  if (!newMember.id) {
    newMember.id = `KST-${Math.floor(10000 + Math.random() * 90000)}`;
  }
  if (!newMember.lastActive) {
    newMember.lastActive = 'เพิ่งเปิดตัว';
  }
  inMemoryMembers.push(newMember);
  res.json({ success: true, member: newMember });
});

// Update member
app.put("/api/members/:id", (req, res) => {
  const { id } = req.params;
  const updates = req.body;
  const index = inMemoryMembers.findIndex(m => m.id === id);
  if (index !== -1) {
    inMemoryMembers[index] = { ...inMemoryMembers[index], ...updates };
    res.json({ success: true, member: inMemoryMembers[index] });
  } else {
    res.status(404).json({ success: false, message: "ไม่พบข้อมูลสมาชิก" });
  }
});

// Delete member
app.delete("/api/members/:id", (req, res) => {
  const { id } = req.params;
  inMemoryMembers = inMemoryMembers.filter(m => m.id !== id);
  res.json({ success: true, message: `ลบสมาชิก ${id} สำเร็จ` });
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
    loadMembersFromSheet();
  });
}

startServer();
