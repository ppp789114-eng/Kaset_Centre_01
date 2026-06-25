import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithPopup, GoogleAuthProvider, User as FirebaseUser } from 'firebase/auth';
import { 
  LayoutDashboard, 
  Inbox, 
  Users, 
  ShoppingBag, 
  DollarSign, 
  Truck, 
  MessageSquare, 
  Search, 
  Bell, 
  LogOut, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  ChevronRight, 
  UserCheck, 
  MapPin, 
  Sparkles, 
  Smartphone, 
  Send, 
  TrendingUp, 
  BatteryCharging, 
  Filter, 
  AlertTriangle,
  Info,
  Check,
  ShieldCheck,
  Building2,
  Calendar,
  AlertCircle,
  RefreshCw,
  Plus,
  Edit,
  Trash2,
  UserPlus,
  Database,
  CloudUpload
} from 'lucide-react';

// Firebase Client Config for Google Auth
const firebaseConfig = {
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "mythical-ceremony-xwjrd",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:78807806056:web:495b79ce3487b3c17ecbdd",
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyBXZ2ybTR0i0WjUgMHvoau5M2GrllHM-Q0",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "mythical-ceremony-xwjrd.firebaseapp.com",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "mythical-ceremony-xwjrd.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "78807806056"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();
provider.addScope('https://www.googleapis.com/auth/spreadsheets');

// Interfaces for State Management
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

interface MarketProduct {
  id: string;
  name: string;
  sellerName: string;
  sellerId: string;
  price: number;
  unit: string;
  stock: number;
  standards: string;
  aiNotes: string;
  imageUrl: string;
}

interface Order {
  id: string;
  productName: string;
  buyerName: string;
  destination: string;
  amount: number;
  date: string;
  status: 'pending' | 'shipping' | 'completed';
}

interface ChatMessage {
  sender: 'farmer' | 'ai' | 'admin';
  text: string;
  time: string;
}

export default function App() {
  // --- Auth State ---
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(() => {
    return localStorage.getItem('kaset_admin_logged') === 'true';
  });
  const [username, setUsername] = useState<string>('Admin');
  const [password, setPassword] = useState<string>('AdminAdmin');
  const [authError, setAuthError] = useState<string>('');

  // --- Google Sheets OAuth State ---
  const [googleAccessToken, setGoogleAccessToken] = useState<string | null>(() => {
    return sessionStorage.getItem('google_sheets_token');
  });
  const [googleUser, setGoogleUser] = useState<FirebaseUser | null>(null);
  const [isConnectingSheets, setIsConnectingSheets] = useState<boolean>(false);

  // --- Navigation & UI State ---
  const [currentView, setCurrentView] = useState<string>('dashboard');
  const [marketTab, setMarketTab] = useState<'qc' | 'active' | 'orders' | 'demand'>('qc');
  const [toast, setToast] = useState<{ show: boolean; msg: string; type: 'success' | 'info' | 'warning' }>({
    show: false,
    msg: '',
    type: 'success'
  });

  // --- Dynamic Data States ---
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoadingTasks, setIsLoadingTasks] = useState<boolean>(true);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  const [members, setMembers] = useState<Member[]>([]);
  const [isLoadingMembers, setIsLoadingMembers] = useState<boolean>(true);
  const [isSyncingCRM, setIsSyncingCRM] = useState<boolean>(false);

  // States for Member Dialog / Modal CRUD Form
  const [memberFormOpen, setMemberFormOpen] = useState<boolean>(false);
  const [memberFormType, setMemberFormType] = useState<'add' | 'edit'>('add');
  const [memberFormValue, setMemberFormValue] = useState<Partial<Member>>({
    id: '',
    name: '',
    crops: '',
    area: '',
    score: 'B',
    debt: 0,
    lastActive: 'วันนี้ 10:45 น.'
  });

  const [marketProducts, setMarketProducts] = useState<MarketProduct[]>([
    {
      id: 'market-row-1',
      name: 'สตรอว์เบอร์รี พันธุ์ 80 ปลอดสารพิษ',
      sellerName: 'นายสมชาย ใจดี',
      sellerId: 'KST-88902',
      price: 150,
      unit: 'กก.',
      stock: 50,
      standards: 'มีใบ GAP ตรงกับรหัสผู้ขาย',
      aiNotes: 'AI ตรวจรูปภาพสตรอว์เบอร์รี: สีแดงสดสม่ำเสมอ สมบูรณ์ 98%',
      imageUrl: 'https://images.unsplash.com/photo-1542319630-eb4fae23ef34?auto=format&fit=crop&w=400&q=80'
    },
    {
      id: 'market-row-2',
      name: 'มะม่วงน้ำดอกไม้ เกรดส่งออก',
      sellerName: 'นางสมศรี มีทรัพย์',
      sellerId: 'KST-77210',
      price: 65,
      unit: 'กก.',
      stock: 200,
      standards: 'ใบ GAP ใกล้หมดอายุ (เหลือ 1 เดือน)',
      aiNotes: 'AI ตรวจรูปภาพมะม่วง: ผิวนวลสวย ไม่มีจุดดำเด่นชัด',
      imageUrl: 'https://images.unsplash.com/photo-1550828520-4cb496926fc9?auto=format&fit=crop&w=400&q=80'
    }
  ]);

  const [orders, setOrders] = useState<Order[]>([
    { id: '#ORD-2026-991', productName: 'สตรอว์เบอร์รี พันธุ์ 80', buyerName: 'คุณใจดี รักเกษตร', destination: 'กรุงเทพมหานคร', amount: 750, date: '25 มิ.ย. 67, 10:30 น.', status: 'pending' },
    { id: '#ORD-2026-992', productName: 'เมล็ดกาแฟอาราบิก้า คั่วกลาง', buyerName: 'บจก. คาเฟ่แอล', destination: 'เชียงใหม่', amount: 1520, date: '24 มิ.ย. 67, 14:15 น.', status: 'shipping' }
  ]);

  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    { sender: 'farmer', text: 'สวัสดีครับ ดินที่แปลงผมตรวจแล้ว pH 6.5 ตอนนี้สตรอว์เบอร์รีใบเหลือง ทำไงดีครับ', time: '10:40 น.' },
    { sender: 'ai', text: 'สวัสดีครับ จากข้อมูล ดิน pH 6.5 เหมาะสมดี แต่อาการใบเหลืองอาจเกิดจากการขาดไนโตรเจนหรือธาตุเหล็ก แนะนำให้เสริมปุ๋ยสูตร 15-15-15 และสังเกตระบบน้ำพ่นฝอยครับ ต้องการให้คำนวณปริมาณปุ๋ยสำหรับพื้นที่ของคุณไหมครับ?', time: '10:41 น.' },
    { sender: 'farmer', text: 'อยากคุยกับนักวิชาการสหกรณ์ตัวจริงครับ กลัวแปลงส้ม/สตรอว์เบอร์รี่เป็นโรคแอนแทรคโนส', time: '10:45 น.' }
  ]);

  const [currentChatInput, setCurrentChatInput] = useState<string>('');
  
  // --- Google Sheet to Firestore Import States ---
  const [importSheetUrl, setImportSheetUrl] = useState<string>('https://docs.google.com/spreadsheets/d/1XlVfneJ-RXvQW7jPUL5Am9jkt7KoMeAPNkRJ4NA-_D8');
  const [importSheetName, setImportSheetName] = useState<string>('CRM');
  const [isImporting, setIsImporting] = useState<boolean>(false);
  const [importResult, setImportResult] = useState<{
    success: boolean;
    message: string;
    count?: number;
    total?: number;
    preview?: any[];
  } | null>(null);

  // --- Filter states ---
  const [taskSearchQuery, setTaskSearchQuery] = useState<string>('');
  const [memberSearchQuery, setMemberSearchQuery] = useState<string>('');

  // --- Modal states ---
  const [selectedModal, setSelectedModal] = useState<'claim' | 'member' | null>(null);
  const [selectedMemberProfile, setSelectedMemberProfile] = useState<Member | null>(null);

  // --- Interactive Yield Chart Metric ---
  const [selectedCropChart, setSelectedCropChart] = useState<'strawberry' | 'longan'>('strawberry');

  // Trigger Toast Helper
  const triggerToast = (msg: string, type: 'success' | 'info' | 'warning' = 'success') => {
    setToast({ show: true, msg, type });
  };

  // --- Client-Side CRM Fallback Loader & Parser ---
  const fetchDirectCRMFromSheets = async (): Promise<Member[]> => {
    const crmUrls = [
      "https://docs.google.com/spreadsheets/d/1XlVfneJ-RXvQW7jPUL5Am9jkt7KoMeAPNkRJ4NA-_D8/gviz/tq?tqx=out:csv&sheet=CRM",
      "https://docs.google.com/spreadsheets/d/1XlVfneJ-RXvQW7jPUL5Am9jkt7KoMeAPNkRJ4NA-_D8/export?format=csv&sheet=CRM"
    ];
    for (const url of crmUrls) {
      try {
        const response = await fetch(url);
        if (response.ok) {
          const text = await response.text();
          const parsed = parseClientMemberCSV(text);
          if (parsed.length > 0) {
            return parsed;
          }
        }
      } catch (e) {
        console.error("Direct sheet CRM fetch failed:", url, e);
      }
    }
    throw new Error("Could not load from CRM sheet directly");
  };

  const parseClientMemberCSV = (text: string): Member[] => {
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

      const debtStr = getValue(debtIdx, '15000');
      const debt = parseInt(debtStr.replace(/[^0-9]/g, '')) || 15000;
      
      const lastActive = getValue(lastActiveIdx, 'วันนี้ 10:45 น.');

      parsed.push({ id, name, crops, area, score: rawScore, debt, lastActive });
    }
    return parsed;
  };

  const fetchMembers = async () => {
    try {
      setIsLoadingMembers(true);
      const res = await fetch('/api/members');
      if (res.ok) {
        const data = await res.json();
        setMembers(data);
      } else {
        console.warn("API load failed, trying direct CRM sheets fetch...");
        const sheetMembers = await fetchDirectCRMFromSheets();
        setMembers(sheetMembers);
        triggerToast("เชื่อมต่อฐานข้อมูล CRM ตรงจาก Google Sheets สำเร็จ", "success");
      }
    } catch (err) {
      console.warn("Failed to load members from API, trying direct sheets fetch...", err);
      try {
        const sheetMembers = await fetchDirectCRMFromSheets();
        setMembers(sheetMembers);
        triggerToast("เชื่อมต่อฐานข้อมูล CRM ตรงจาก Google Sheets สำเร็จ", "success");
      } catch (directErr) {
        console.error("Both API and direct sheets fetch failed for CRM:", directErr);
        setMembers([
          { id: 'KST-88902', name: 'นายสมชาย ใจดี', crops: 'สตรอว์เบอร์รี, ลำไย', area: '15 ไร่ (ต.แม่ริม)', score: 'A', debt: 24500, lastActive: 'วันนี้ 10:45 น.' },
          { id: 'KST-77210', name: 'นางสมศรี มีทรัพย์', crops: 'ข้าวไรซ์เบอร์รี่, ผักสวนครัว', area: '8 ไร่ (ต.สันป่าตอง)', score: 'B+', debt: 10000, lastActive: 'เมื่อวาน 15:30 น.' },
          { id: 'KST-65001', name: 'นายวิชัย รักษ์ดี', crops: 'ข้าวโพดเลี้ยงสัตว์', area: '20 ไร่ (ต.แม่แจ่ม)', score: 'D', debt: 45000, lastActive: '15 มิ.ย. 67' }
        ]);
      }
    } finally {
      setIsLoadingMembers(false);
    }
  };

  const handleSyncCRM = async () => {
    try {
      setIsSyncingCRM(true);
      const res = await fetch('/api/members/sync', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setMembers(data.members);
        triggerToast(`ซิงค์ฐานข้อมูล CRM จาก Google Sheets สำเร็จ! พบข้อมูลทั้งหมด ${data.members.length} รายการ`, 'success');
      } else {
        console.warn("API CRM sync failed, trying direct sheets sync...");
        const sheetMembers = await fetchDirectCRMFromSheets();
        setMembers(sheetMembers);
        triggerToast(`ซิงค์ข้อมูล CRM สดจาก Google Sheets โดยตรงสำเร็จ! พบทั้งหมด ${sheetMembers.length} รายการ`, 'success');
      }
    } catch (err) {
      console.warn("API CRM sync error, trying direct sheets sync...", err);
      try {
        const sheetMembers = await fetchDirectCRMFromSheets();
        setMembers(sheetMembers);
        triggerToast(`ซิงค์ข้อมูล CRM สดจาก Google Sheets โดยตรงสำเร็จ! พบทั้งหมด ${sheetMembers.length} รายการ`, 'success');
      } catch (directErr) {
        triggerToast('เกิดข้อผิดพลาดในการเชื่อมต่อคลาวด์และ Google Sheets สำหรับ CRM', 'warning');
      }
    } finally {
      setIsSyncingCRM(false);
    }
  };

  const handleCreateMember = async (memberData: Partial<Member>) => {
    try {
      const res = await fetch('/api/members', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(memberData)
      });
      if (res.ok) {
        const data = await res.json();
        setMembers(prev => [...prev, data.member]);
        triggerToast(`เพิ่มข้อมูลสมาชิก ${data.member.name} เรียบร้อยแล้ว`, 'success');
        setMemberFormOpen(false);
      } else {
        const mockNew = {
          ...memberData,
          id: memberData.id || `KST-${Math.floor(10000 + Math.random() * 90000)}`,
          lastActive: 'เพิ่งอัปเดต'
        } as Member;
        setMembers(prev => [...prev, mockNew]);
        triggerToast(`เพิ่มข้อมูลสมาชิก ${mockNew.name} เรียบร้อยแล้ว (ภายในเว็บ)`, 'success');
        setMemberFormOpen(false);
      }
    } catch (err) {
      triggerToast('เกิดข้อผิดพลาดในการบันทึกข้อมูลสมาชิก', 'warning');
    }
  };

  const handleUpdateMember = async (id: string, updates: Partial<Member>) => {
    try {
      const res = await fetch(`/api/members/${id}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(updates)
      });
      if (res.ok) {
        const data = await res.json();
        setMembers(prev => prev.map(m => m.id === id ? data.member : m));
        // If we are showing this profile, update the profile view too
        if (selectedMemberProfile && selectedMemberProfile.id === id) {
          setSelectedMemberProfile(data.member);
        }
        triggerToast(`อัปเดตข้อมูลสมาชิก ${updates.name || id} เรียบร้อยแล้ว`, 'success');
        setMemberFormOpen(false);
      } else {
        const updated = { ...selectedMemberProfile, ...updates } as Member;
        setMembers(prev => prev.map(m => m.id === id ? updated : m));
        if (selectedMemberProfile && selectedMemberProfile.id === id) {
          setSelectedMemberProfile(updated);
        }
        triggerToast(`อัปเดตข้อมูลสมาชิก ${updates.name || id} เรียบร้อยแล้ว (ภายในเว็บ)`, 'success');
        setMemberFormOpen(false);
      }
    } catch (err) {
      triggerToast('เกิดข้อผิดพลาดในการอัปเดตข้อมูลสมาชิก', 'warning');
    }
  };

  const handleDeleteMember = async (id: string) => {
    if (!confirm('คุณแน่ใจหรือไม่ที่จะลบรายชื่อสมาชิกรายนี้ออกจากฐานข้อมูลสหกรณ์?')) return;
    try {
      const res = await fetch(`/api/members/${id}`, { 
        method: 'DELETE',
        headers: getAuthHeaders()
      });
      if (res.ok) {
        setMembers(prev => prev.filter(m => m.id !== id));
        triggerToast(`ลบรายชื่อสมาชิกสำเร็จ`, 'success');
        setSelectedModal(null);
      } else {
        setMembers(prev => prev.filter(m => m.id !== id));
        triggerToast(`ลบรายชื่อสมาชิกสำเร็จ (ภายในเว็บ)`, 'success');
        setSelectedModal(null);
      }
    } catch (err) {
      triggerToast('เกิดข้อผิดพลาดในการลบข้อมูลสมาชิก', 'warning');
    }
  };

  // --- Client-Side Google Sheets Fallback Loader ---
  const GOOGLE_SHEET_CSV_URLS = [
    "https://docs.google.com/spreadsheets/d/1XlVfneJ-RXvQW7jPUL5Am9jkt7KoMeAPNkRJ4NA-_D8/gviz/tq?tqx=out:csv&sheet=Tasks",
    "https://docs.google.com/spreadsheets/d/1XlVfneJ-RXvQW7jPUL5Am9jkt7KoMeAPNkRJ4NA-_D8/export?format=csv&sheet=Tasks",
    "https://docs.google.com/spreadsheets/d/1XlVfneJ-RXvQW7jPUL5Am9jkt7KoMeAPNkRJ4NA-_D8/export?format=csv"
  ];

  const parseClientCSV = (text: string): Task[] => {
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
  };

  const fetchDirectFromSheets = async (): Promise<Task[]> => {
    for (const url of GOOGLE_SHEET_CSV_URLS) {
      try {
        const response = await fetch(url);
        if (response.ok) {
          const text = await response.text();
          const parsed = parseClientCSV(text);
          if (parsed.length > 0) {
            return parsed;
          }
        }
      } catch (e) {
        console.error("Direct sheet fetch failed:", url, e);
      }
    }
    throw new Error("Could not load from any Google Sheets URL directly");
  };

  // Fetch Tasks on Mount
  const fetchTasks = async () => {
    try {
      setIsLoadingTasks(true);
      const res = await fetch('/api/tasks');
      if (res.ok) {
        const data = await res.json();
        setTasks(data);
      } else {
        console.warn("API load failed, trying direct sheets fetch...");
        const sheetTasks = await fetchDirectFromSheets();
        setTasks(sheetTasks);
        triggerToast("เชื่อมต่อฐานข้อมูลตรงจาก Google Sheets สำเร็จ", "success");
      }
    } catch (err) {
      console.warn("Failed to load tasks from API, trying direct sheets fetch...", err);
      try {
        const sheetTasks = await fetchDirectFromSheets();
        setTasks(sheetTasks);
        triggerToast("เชื่อมต่อฐานข้อมูลตรงจาก Google Sheets สำเร็จ", "success");
      } catch (directErr) {
        console.error("Both API and direct sheets fetch failed:", directErr);
        triggerToast("ไม่สามารถโหลดข้อมูลจาก Google Sheets ได้ กรุณาตรวจสอบสิทธิ์การแชร์ลิงก์", "warning");
      }
    } finally {
      setIsLoadingTasks(false);
    }
  };

  // Synchronize view state with window location path (supports /import)
  useEffect(() => {
    const handleLocationChange = () => {
      if (window.location.pathname === '/import') {
        setCurrentView('import');
      } else {
        // Only override if we're on root path to preserve normal component views
        if (window.location.pathname === '/' || window.location.pathname === '') {
          setCurrentView('dashboard');
        }
      }
    };
    handleLocationChange();
    window.addEventListener('popstate', handleLocationChange);
    return () => window.removeEventListener('popstate', handleLocationChange);
  }, []);

  const navigateToView = (view: string) => {
    setCurrentView(view);
    if (view === 'import') {
      window.history.pushState({}, '', '/import');
    } else {
      window.history.pushState({}, '', '/');
    }
  };

  useEffect(() => {
    fetchTasks();
    fetchMembers();
  }, []);

  // Sync Database with Sheet
  const handleSyncDatabase = async () => {
    try {
      setIsSyncing(true);
      const res = await fetch('/api/tasks/sync', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setTasks(data.tasks);
        triggerToast(`ซิงค์ข้อมูลจาก Google Sheets เรียบร้อยแล้ว! พบข้อมูลทั้งหมด ${data.tasks.length} รายการ`, 'success');
      } else {
        console.warn("API sync failed, trying direct sheets sync...");
        const sheetTasks = await fetchDirectFromSheets();
        setTasks(sheetTasks);
        triggerToast(`ซิงค์ข้อมูลสดจาก Google Sheets โดยตรงสำเร็จ! พบทั้งหมด ${sheetTasks.length} รายการ`, 'success');
      }
    } catch (err) {
      console.warn("API sync error, trying direct sheets sync...", err);
      try {
        const sheetTasks = await fetchDirectFromSheets();
        setTasks(sheetTasks);
        triggerToast(`ซิงค์ข้อมูลสดจาก Google Sheets โดยตรงสำเร็จ! พบทั้งหมด ${sheetTasks.length} รายการ`, 'success');
      } catch (directErr) {
        triggerToast('เกิดข้อผิดพลาดในการเชื่อมต่อคลาวด์และ Google Sheets', 'warning');
      }
    } finally {
      setIsSyncing(false);
    }
  };

  // Import Sheet to Firestore Handler
  const handleImportSheet = async () => {
    if (!importSheetUrl || !importSheetName) {
      triggerToast('กรุณาระบุลิงก์ Google Sheets และชื่อแผ่นงาน', 'warning');
      return;
    }
    try {
      setIsImporting(true);
      setImportResult(null);
      const res = await fetch('/api/import-sheet', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          sheetUrl: importSheetUrl,
          sheetName: importSheetName
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setImportResult({
          success: true,
          message: data.message,
          count: data.count,
          total: data.total,
          preview: data.preview
        });
        triggerToast(`นำเข้าสำเร็จ! บันทึกแล้ว ${data.count} แถวลง Firestore`, 'success');
        // Reload local app state if sheet matches
        if (importSheetName.toUpperCase() === 'CRM') {
          fetchMembers();
        } else if (importSheetName.toUpperCase() === 'TASKS') {
          fetchTasks();
        }
      } else {
        setImportResult({
          success: false,
          message: data.message || 'เกิดข้อผิดพลาดในการนำเข้าข้อมูล'
        });
        triggerToast(data.message || 'เกิดข้อผิดพลาดในการนำเข้า', 'warning');
      }
    } catch (err: any) {
      console.error(err);
      setImportResult({
        success: false,
        message: err.message || 'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้'
      });
      triggerToast('ล้มเหลวในการส่งข้อมูลนำเข้า', 'warning');
    } finally {
      setIsImporting(false);
    }
  };

  useEffect(() => {
    if (toast.show) {
      const timer = setTimeout(() => {
        setToast(prev => ({ ...prev, show: false }));
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [toast.show]);

  // Handle Login Action
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanUser = username.trim().toLowerCase();
    const cleanPass = password.trim();

    if (cleanUser === 'admin' && (cleanPass === 'admin' || cleanPass === 'Admin' || cleanPass === 'AdminAdmin')) {
      setIsLoggedIn(true);
      localStorage.setItem('kaset_admin_logged', 'true');
      triggerToast('เข้าสู่ระบบสำเร็จ ยินดีต้อนรับ จ.ส.อ. สมเกียรติ', 'success');
      setAuthError('');
    } else {
      setAuthError('รหัสผ่านหรือรหัสเจ้าหน้าที่ไม่ถูกต้อง กรุณาใช้ Admin / AdminAdmin');
    }
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    localStorage.removeItem('kaset_admin_logged');
    triggerToast('ออกจากระบบเรียบร้อย', 'info');
  };

  // --- Google Sheets Sync Helpers ---
  const getAuthHeaders = (additionalHeaders: Record<string, string> = {}) => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...additionalHeaders
    };
    if (googleAccessToken) {
      headers['X-Google-Access-Token'] = googleAccessToken;
      
      const match = importSheetUrl.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
      const sheetId = match ? match[1] : '1XlVfneJ-RXvQW7jPUL5Am9jkt7KoMeAPNkRJ4NA-_D8';
      headers['X-Google-Spreadsheet-Id'] = sheetId;
    }
    return headers;
  };

  const handleGoogleSignIn = async () => {
    setIsConnectingSheets(true);
    try {
      const result = await signInWithPopup(auth, provider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      if (credential?.accessToken) {
        setGoogleAccessToken(credential.accessToken);
        setGoogleUser(result.user);
        sessionStorage.setItem('google_sheets_token', credential.accessToken);
        triggerToast(`เชื่อมต่อ Google Sheets สำเร็จ! บัญชี: ${result.user.email}`, 'success');
      } else {
        throw new Error('ไม่ได้รับ Access Token จากบัญชี Google');
      }
    } catch (err: any) {
      console.error('Google Sign-In failed:', err);
      triggerToast('ไม่สามารถเชื่อมต่อ Google Sheets ได้: ' + (err.message || ''), 'warning');
    } finally {
      setIsConnectingSheets(false);
    }
  };

  const handleGoogleSignOut = async () => {
    try {
      await auth.signOut();
      setGoogleAccessToken(null);
      setGoogleUser(null);
      sessionStorage.removeItem('google_sheets_token');
      triggerToast('ยกเลิกการเชื่อมต่อ Google Sheets แล้ว', 'info');
    } catch (err) {
      console.error('Sign-out error:', err);
    }
  };

  // Task Actions
  const handleApproveTask = async (refId: string, customMsg?: string) => {
    try {
      // Call server PUT to set status or DELETE to complete
      const res = await fetch(`/api/tasks/${refId}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({ status: 'ดำเนินการแล้ว' })
      });
      if (res.ok) {
        triggerToast(customMsg || `ดำเนินการคำขอ ${refId} และบันทึกลงฐานข้อมูลแล้ว`, 'success');
        // Delete locally so it's completed
        setTasks(prev => prev.filter(t => t.refId !== refId));
      }
    } catch (err) {
      triggerToast('ไม่สามารถอัปเดตสถานะในเซิร์ฟเวอร์ได้', 'warning');
    }
  };

  // Market QC Actions
  const handleQCProduct = (id: string, approve: boolean) => {
    if (approve) {
      triggerToast('อนุมัติผลิตภัณฑ์เรียบร้อยแล้ว สินค้ารับการรับรองและแสดงบนแอพพลิเคชัน!', 'success');
    } else {
      triggerToast('ปฏิเสธผลิตภัณฑ์เรียบร้อยแล้ว ส่งข้อเสนอแนะกลับไปยังเกษตรกร', 'warning');
    }
    setMarketProducts(prev => prev.filter(p => p.id !== id));
  };

  // Change Order Status
  const handleShipOrder = (orderId: string) => {
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: 'shipping' } : o));
    triggerToast(`จัดเตรียมสินค้า ${orderId} เรียบร้อยแล้ว นัดรถ Kaset Lalamove เข้ารับพัสดุ`, 'success');
  };

  // Chat Responses Helper
  const handleSendChatMessage = () => {
    if (!currentChatInput.trim()) return;
    const newMsg: ChatMessage = {
      sender: 'admin',
      text: currentChatInput,
      time: new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }) + ' น.'
    };
    setChatMessages(prev => [...prev, newMsg]);
    const inputSaved = currentChatInput;
    setCurrentChatInput('');
    
    // Auto simulated farmer reply after 1.5s
    setTimeout(() => {
      let replyText = 'ขอบคุณมากครับเจ้าหน้าที่ จะนำคำแนะนำไปปฏิบัติตามครับ';
      if (inputSaved.includes('ปุ๋ย')) {
        replyText = 'สูตรนี้สามารถหาซื้อได้ที่สหกรณ์สาขา 2 เลยใช่ไหมครับ?';
      } else if (inputSaved.includes('ตรวจ') || inputSaved.includes('แปลง')) {
        replyText = 'ขอบคุณครับ ถ้างั้นผมจองโดรนเกษตรเข้ามาช่วยพ่นสารบำรุงด้วยนะครับ';
      }
      setChatMessages(prev => [...prev, {
        sender: 'farmer',
        text: replyText,
        time: new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }) + ' น.'
      }]);
      triggerToast('มีข้อความตอบกลับใหม่จากเกษตรกร', 'info');
    }, 2000);
  };

  // Filtered Tasks
  const filteredTasks = tasks.filter(t => 
    t.memberName.includes(taskSearchQuery) || 
    t.refId.includes(taskSearchQuery) ||
    t.type.includes(taskSearchQuery)
  );

  // --- RENDERING LOGIN SCREEN ---
  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 font-sans antialiased text-slate-800">
        <div className="w-full max-w-5xl bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col md:flex-row border border-slate-800">
          
          {/* Left Panel: Branding */}
          <div className="w-full md:w-1/2 bg-slate-950 p-8 md:p-14 flex flex-col justify-between text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 w-80 h-80 bg-blue-600 rounded-full blur-[120px] opacity-25 -mr-40 -mt-40"></div>
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-700 rounded-full blur-[100px] opacity-25 -ml-32 -mb-32"></div>
            
            <div className="relative z-10 flex flex-col gap-6">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 bg-gradient-to-tr from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center font-bold text-2xl italic shadow-lg shadow-blue-500/20">KC</div>
                <div>
                  <span className="text-2xl font-bold tracking-tight text-white block">Kaset Centre</span>
                  <span className="text-xs text-blue-400 font-medium">Smart Operations Management Portal</span>
                </div>
              </div>

              <div className="mt-10">
                <h1 className="text-4xl font-extrabold leading-tight mb-4 tracking-tight">
                  ระบบหลังบ้าน <br/>
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-teal-300 font-black">
                    สหกรณ์อัจฉริยะ
                  </span>
                </h1>
                <p className="text-slate-400 max-w-sm text-sm leading-relaxed">
                  พอร์ทัลกลางควบคุมคุณภาพ การจัดการคำขอสินเชื่อ ทะเบียนประวัติสิทธิเกษตรกร โลจิสติกส์ และระบบอนุมัติคิวปฏิบัติงานอัจฉริยะสำหรับเจ้าหน้าที่สหกรณ์ Kaset Centre
                </p>
              </div>
            </div>

            <div className="relative z-10 mt-12 md:mt-0">
              <div className="flex gap-3 mb-4">
                <div className="px-3 py-1 bg-slate-900 rounded-full text-[10px] uppercase tracking-wider text-slate-400 font-bold border border-slate-800">
                  v5.12-stable
                </div>
                <div className="px-3 py-1 bg-slate-900 rounded-full text-[10px] uppercase tracking-wider text-emerald-400 font-bold border border-slate-800 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span> Security Active
                </div>
              </div>
              <p className="text-xs text-slate-500">© 2026 Kaset Centre Platform. All rights reserved.</p>
            </div>
          </div>

          {/* Right Panel: Login Form */}
          <div className="w-full md:w-1/2 p-8 md:p-16 flex flex-col justify-center bg-white">
            <div className="mb-8">
              <h2 className="text-3xl font-extrabold text-slate-900">เข้าสู่ระบบ / Admin Login</h2>
              <p className="text-slate-500 text-sm mt-1.5">ป้อนข้อมูลประจำตัวผู้ปฏิบัติการเพื่อเข้าควบคุมระบบ</p>
            </div>

            {authError && (
              <div className="mb-6 p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{authError}</span>
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-5">
              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2">Username (ชื่อผู้ใช้)</label>
                <div className="relative">
                  <input 
                    type="text" 
                    value={username} 
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-medium text-sm" 
                    required 
                  />
                  <div className="absolute inset-y-0 right-3 flex items-center text-slate-400">
                    <Users className="w-4 h-4" />
                  </div>
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest">Password (รหัสผ่าน)</label>
                  <span className="text-xs text-slate-400 font-medium">คำใบ้: Admin / AdminAdmin</span>
                </div>
                <div className="relative">
                  <input 
                    type="password" 
                    value={password} 
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-medium text-sm" 
                    required 
                  />
                  <div className="absolute inset-y-0 right-3 flex items-center text-slate-400">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 py-1">
                <input 
                  type="checkbox" 
                  id="remember" 
                  className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500" 
                  defaultChecked 
                />
                <label htmlFor="remember" className="text-xs text-slate-500 select-none">จดจำอุปกรณ์นี้สำหรับการทำงาน 30 วัน</label>
              </div>

              <button 
                type="submit" 
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2 transition-all text-sm mt-3"
              >
                ยืนยันตัวเข้าปฏิบัติการ
                <ChevronRight className="w-4 h-4" />
              </button>
            </form>

            <div className="mt-8 pt-8 border-t border-slate-100 flex items-center gap-3">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="text-[11px] text-slate-400 font-medium">เซิร์ฟเวอร์สำนักงานใหญ่: เชื่อมต่อปกติ</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Filter members list based on query
  const filteredMembers = members.filter(m => {
    const q = memberSearchQuery.toLowerCase();
    return (
      (m.name || '').toLowerCase().includes(q) || 
      (m.crops || '').toLowerCase().includes(q) || 
      (m.area || '').toLowerCase().includes(q) ||
      (m.id || '').toLowerCase().includes(q)
    );
  });

  // --- RENDERING MAIN DASHBOARD WORKSPACE ---
  return (
    <div className="min-h-screen bg-slate-50 flex overflow-hidden font-sans text-slate-800">
      
      {/* Toast Notification */}
      {toast.show && (
        <div className="fixed top-6 right-6 bg-slate-900 border border-slate-800 text-white px-5 py-4 rounded-2xl shadow-2xl z-50 flex items-center gap-3 transition-all duration-300 animate-bounce max-w-sm">
          <div className="w-8 h-8 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0">
            <Sparkles className="w-4 h-4" />
          </div>
          <span className="text-xs font-semibold text-slate-100 leading-relaxed">{toast.msg}</span>
        </div>
      )}

      {/* Main Sidebar */}
      <aside className="w-64 bg-slate-950 text-slate-300 border-r border-slate-800 flex flex-col shrink-0 h-screen z-20">
        {/* Brand Header */}
        <div className="h-16 flex items-center justify-between px-6 border-b border-slate-900 bg-slate-950 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-extrabold text-sm italic shadow-md">KC</div>
            <div>
              <span className="text-md font-bold text-white block leading-none">Kaset Centre</span>
              <span className="text-[9px] text-slate-500 uppercase tracking-widest font-semibold mt-0.5 block">Admin Portal</span>
            </div>
          </div>
        </div>
        
        {/* Navigation Menus */}
        <div className="flex-1 overflow-y-auto px-4 py-6 space-y-7">
          <div>
            <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-2 px-3">เมนูควบคุมหลัก</p>
            <nav className="space-y-1">
              <button 
                onClick={() => { navigateToView('dashboard'); }} 
                className={`w-full flex items-center justify-between px-3 py-2.5 text-xs rounded-xl transition-all ${
                  currentView === 'dashboard' ? 'bg-blue-600 text-white font-bold shadow-md shadow-blue-600/10' : 'hover:bg-slate-900 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <LayoutDashboard className="w-4 h-4 shrink-0" />
                  <span>สรุปภาพรวม (Dashboard)</span>
                </div>
              </button>

              <button 
                onClick={() => { navigateToView('tasks'); }} 
                className={`w-full flex items-center justify-between px-3 py-2.5 text-xs rounded-xl transition-all ${
                  currentView === 'tasks' ? 'bg-blue-600 text-white font-bold shadow-md shadow-blue-600/10' : 'hover:bg-slate-900 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Inbox className="w-4 h-4 shrink-0" />
                  <span>จัดการคำขอ (Tasks)</span>
                </div>
                {tasks.length > 0 && (
                  <span className="bg-rose-500 text-white text-[10px] font-extrabold px-1.5 py-0.5 rounded-full shrink-0">
                    {tasks.length}
                  </span>
                )}
              </button>

              <button 
                onClick={() => { navigateToView('members'); }} 
                className={`w-full flex items-center justify-between px-3 py-2.5 text-xs rounded-xl transition-all ${
                  currentView === 'members' ? 'bg-blue-600 text-white font-bold shadow-md shadow-blue-600/10' : 'hover:bg-slate-900 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Users className="w-4 h-4 shrink-0" />
                  <span>ทะเบียนเกษตรกร (CRM)</span>
                </div>
              </button>

              <button 
                onClick={() => { navigateToView('market'); }} 
                className={`w-full flex items-center justify-between px-3 py-2.5 text-xs rounded-xl transition-all ${
                  currentView === 'market' ? 'bg-blue-600 text-white font-bold shadow-md shadow-blue-600/10' : 'hover:bg-slate-900 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <ShoppingBag className="w-4 h-4 shrink-0" />
                  <span>ตลาดกลาง E-Commerce</span>
                </div>
                {marketProducts.length > 0 && (
                  <span className="bg-amber-500 text-slate-950 text-[10px] font-black px-1.5 py-0.5 rounded-full shrink-0">
                    {marketProducts.length}
                  </span>
                )}
              </button>
            </nav>
          </div>
          
          <div>
            <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-2 px-3">ปฏิบัติการเฉพาะทาง</p>
            <nav className="space-y-1">
              <button 
                onClick={() => { navigateToView('finance'); }} 
                className={`w-full flex items-center justify-between px-3 py-2.5 text-xs rounded-xl transition-all ${
                  currentView === 'finance' ? 'bg-blue-600 text-white font-bold shadow-md shadow-blue-600/10' : 'hover:bg-slate-900 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <DollarSign className="w-4 h-4 shrink-0" />
                  <span>สินเชื่อ & การเงินสหกรณ์</span>
                </div>
              </button>

              <button 
                onClick={() => { navigateToView('machine'); }} 
                className={`w-full flex items-center justify-between px-3 py-2.5 text-xs rounded-xl transition-all ${
                  currentView === 'machine' ? 'bg-blue-600 text-white font-bold shadow-md shadow-blue-600/10' : 'hover:bg-slate-900 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Truck className="w-4 h-4 shrink-0" />
                  <span>คลังเครื่องจักรกลแชร์ริ่ง</span>
                </div>
              </button>

              <button 
                onClick={() => { navigateToView('chat'); }} 
                className={`w-full flex items-center justify-between px-3 py-2.5 text-xs rounded-xl transition-all ${
                  currentView === 'chat' ? 'bg-blue-600 text-white font-bold shadow-md shadow-blue-600/10' : 'hover:bg-slate-900 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <MessageSquare className="w-4 h-4 shrink-0" />
                  <span>AI Helpdesk (ห้องแชท)</span>
                </div>
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              </button>
            </nav>
          </div>

          <div>
            <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-2 px-3">ระบบคลาวด์และฐานข้อมูล</p>
            <nav className="space-y-1">
              <button 
                onClick={() => { navigateToView('import'); }} 
                className={`w-full flex items-center justify-between px-3 py-2.5 text-xs rounded-xl transition-all ${
                  currentView === 'import' ? 'bg-blue-600 text-white font-bold shadow-md shadow-blue-600/10' : 'hover:bg-slate-900 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <CloudUpload className="w-4 h-4 shrink-0 text-blue-400" />
                  <span>แปลง Sheet ไป Firestore (/import)</span>
                </div>
              </button>
            </nav>
          </div>
        </div>

        {/* Sidebar Footer / Staff Info */}
        <div className="p-4 border-t border-slate-900 bg-slate-950/60 mt-auto shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-slate-800 to-slate-700 flex items-center justify-center font-bold text-slate-200 shadow-sm shrink-0">
              จส.
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-white truncate">จ.ส.อ. สมเกียรติ</p>
              <p className="text-[10px] text-slate-500 truncate">สำนักงาน สหกรณ์แม่ริม</p>
            </div>
            <button 
              onClick={handleLogout} 
              title="ออกจากระบบ" 
              className="p-1.5 hover:bg-rose-500/15 hover:text-rose-400 rounded-lg text-slate-400 transition"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Primary Container */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden min-w-0 bg-slate-50">
        
        {/* Top Sticky Header */}
        <header className="h-16 bg-white border-b border-slate-200/80 px-6 flex items-center justify-between shrink-0 z-10">
          <div className="flex items-center gap-2">
            <h1 className="text-md font-extrabold text-slate-900">
              {currentView === 'dashboard' && 'แดชบอร์ดภาพรวมระบบ'}
              {currentView === 'tasks' && 'ศูนย์กลางพิจารณาและอนุมัติคำขอ'}
              {currentView === 'members' && 'ฐานข้อมูลทะเบียนและประวัติสิทธิเกษตรกร (CRM)'}
              {currentView === 'market' && 'ระบบบริหารจัดการสินค้าเกษตรและตลาดกลาง'}
              {currentView === 'finance' && 'ระบบประเมินหนี้สินและอนุมัติวงเงินสหกรณ์'}
              {currentView === 'machine' && 'ตารางจัดสรรเครื่องจักรและปฏิบัติงานแปลง'}
              {currentView === 'chat' && 'AI Helpdesk & ระบบเกษตรกรแชทบอทสนับสนุน'}
            </h1>
          </div>

          <div className="flex items-center gap-4">
            {/* Sync with Google Sheet Button */}
            <button
              onClick={handleSyncDatabase}
              disabled={isSyncing}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-[11px] font-bold border transition-all ${
                isSyncing
                  ? 'bg-blue-50 border-blue-200 text-blue-500 cursor-not-allowed'
                  : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700 active:scale-95 shadow-sm'
              }`}
              title="ซิงค์ฐานข้อมูลสดจาก Google Sheets หลังบ้าน"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-blue-500' : 'text-slate-500'}`} />
              <span>{isSyncing ? 'กำลังซิงค์ Google Sheets...' : 'ซิงค์ฐานข้อมูลสด'}</span>
            </button>

            {/* Google Sheets Live Auth and Sync */}
            {googleAccessToken ? (
              <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200/60 px-3 py-1.5 rounded-xl text-[11px] font-bold text-emerald-700 shadow-sm">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span className="truncate max-w-[120px] hidden md:inline">เชื่อมต่อ Google Sheets แล้ว</span>
                <span className="md:hidden">Sheets ต่อแล้ว</span>
                <button 
                  onClick={handleGoogleSignOut} 
                  className="ml-1 text-slate-400 hover:text-red-500 transition-colors text-[10px] font-medium"
                  title="ยกเลิกการเชื่อมต่อ"
                >
                  (ยกเลิก)
                </button>
              </div>
            ) : (
              <button
                onClick={handleGoogleSignIn}
                disabled={isConnectingSheets}
                className="flex items-center gap-1.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-bold text-[11px] px-3 py-1.5 rounded-xl shadow-sm transition active:scale-95 disabled:opacity-50 cursor-pointer"
                title="เชื่อมต่อกับ Google Account เพื่อเขียน/ลบข้อมูลลง Google Sheets หลังบ้านโดยตรง"
              >
                <CloudUpload className="w-3.5 h-3.5 text-blue-500" />
                <span>{isConnectingSheets ? 'กำลังเชื่อมต่อ...' : 'เชื่อมต่อ Google Sheets'}</span>
              </button>
            )}

            {/* Live Operational Indicator */}
            <div className="flex items-center gap-2 bg-slate-100 border border-slate-200/60 px-3 py-1.5 rounded-full text-[11px] font-bold text-slate-600">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>All Systems Operational</span>
            </div>

            <div className="h-4 w-[1px] bg-slate-200"></div>

            <div className="text-right text-xs text-slate-400 font-semibold hidden sm:block">
              2026-06-25 UTC+7
            </div>
          </div>
        </header>

        {/* Dynamic Inner Panel Body */}
        <div className="flex-1 overflow-y-auto p-6 min-w-0">
          
          {/* ============================================== */}
          {/* 1. VIEW: DASHBOARD                             */}
          {/* ============================================== */}
          {currentView === 'dashboard' && (
            <div className="space-y-6">
              
              {/* Stats High Density Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                
                {/* Stat Card 1 */}
                <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm flex items-center justify-between">
                  <div>
                    <p className="text-[10px] uppercase font-bold tracking-widest text-slate-400 mb-1">คำขอคงค้างรอตรวจ</p>
                    <h3 className="text-3xl font-black text-slate-950">{tasks.length} <span className="text-xs font-bold text-rose-500 ml-1">คำขอ</span></h3>
                  </div>
                  <div className="w-12 h-12 bg-rose-50 border border-rose-100 rounded-xl text-rose-600 flex items-center justify-center">
                    <Inbox className="w-6 h-6" />
                  </div>
                </div>

                {/* Stat Card 2 */}
                <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm flex items-center justify-between">
                  <div>
                    <p className="text-[10px] uppercase font-bold tracking-widest text-slate-400 mb-1">การแชร์คิวเครื่องจักร</p>
                    <h3 className="text-3xl font-black text-slate-950">8/10 <span className="text-xs font-bold text-slate-400 ml-1">คัน</span></h3>
                  </div>
                  <div className="w-12 h-12 bg-amber-50 border border-amber-100 rounded-xl text-amber-600 flex items-center justify-center">
                    <Truck className="w-6 h-6" />
                  </div>
                </div>

                {/* Stat Card 3 */}
                <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm flex items-center justify-between">
                  <div>
                    <p className="text-[10px] uppercase font-bold tracking-widest text-slate-400 mb-1">วงเงิน BNPL ที่อนุมัติ</p>
                    <h3 className="text-3xl font-black text-emerald-600">฿850k</h3>
                  </div>
                  <div className="w-12 h-12 bg-emerald-50 border border-emerald-100 rounded-xl text-emerald-600 flex items-center justify-center">
                    <DollarSign className="w-6 h-6" />
                  </div>
                </div>

                {/* Stat Card 4 */}
                <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm flex items-center justify-between">
                  <div>
                    <p className="text-[10px] uppercase font-bold tracking-widest text-slate-400 mb-1">ผลผลิตรอเข้าตลาดสัปดาห์นี้</p>
                    <h3 className="text-3xl font-black text-slate-950">12.4 <span className="text-xs font-bold text-slate-400 ml-1">ตัน</span></h3>
                  </div>
                  <div className="w-12 h-12 bg-indigo-50 border border-indigo-100 rounded-xl text-indigo-600 flex items-center justify-center">
                    <TrendingUp className="w-6 h-6" />
                  </div>
                </div>

              </div>

              {/* Bento Row: Chart & System AI Alerts */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Visual Custom Chart */}
                <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm flex flex-col justify-between">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 border-b border-slate-100 pb-4">
                    <div>
                      <h3 className="font-extrabold text-slate-900 text-sm">สถิติปริมาณผลผลิตรายสัปดาห์เข้าโกดังตลาดสหกรณ์</h3>
                      <p className="text-xs text-slate-400 font-medium">เปรียบเทียบผลผลิตตามจริงกับประมาณการล่วงหน้าของระบบ AI</p>
                    </div>

                    {/* Chart Selector Buttons */}
                    <div className="flex bg-slate-100 p-1 rounded-xl shrink-0">
                      <button 
                        onClick={() => setSelectedCropChart('strawberry')}
                        className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                          selectedCropChart === 'strawberry' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-900'
                        }`}
                      >
                        สตรอว์เบอร์รี พันธุ์ 80
                      </button>
                      <button 
                        onClick={() => setSelectedCropChart('longan')}
                        className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                          selectedCropChart === 'longan' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-900'
                        }`}
                      >
                        ลำไยเกรดคัด
                      </button>
                    </div>
                  </div>

                  {/* Custom High Fidelity SVG Line & Bar Chart */}
                  <div className="h-64 w-full relative flex items-end">
                    <svg className="w-full h-full" viewBox="0 0 500 200" preserveAspectRatio="none">
                      <defs>
                        <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#2563eb" stopOpacity="0.15" />
                          <stop offset="100%" stopColor="#2563eb" stopOpacity="0" />
                        </linearGradient>
                      </defs>
                      
                      {/* Grid Lines */}
                      <line x1="0" y1="40" x2="500" y2="40" stroke="#f1f5f9" strokeWidth="1" />
                      <line x1="0" y1="80" x2="500" y2="80" stroke="#f1f5f9" strokeWidth="1" />
                      <line x1="0" y1="120" x2="500" y2="120" stroke="#f1f5f9" strokeWidth="1" />
                      <line x1="0" y1="160" x2="500" y2="160" stroke="#f1f5f9" strokeWidth="1" />
                      
                      {/* Bar Plot Data (Simulation of Real Collected crop) */}
                      {selectedCropChart === 'strawberry' ? (
                        <>
                          {/* Strawberries Data */}
                          {/* Jan (12T), Feb (19T), Mar (15T), Apr (25T), May (22T), Jun (30T) */}
                          <rect x="30" y="110" width="22" height="70" fill="#3b82f6" rx="4" />
                          <rect x="110" y="70" width="22" height="110" fill="#3b82f6" rx="4" />
                          <rect x="190" y="90" width="22" height="90" fill="#3b82f6" rx="4" />
                          <rect x="270" y="40" width="22" height="140" fill="#3b82f6" rx="4" />
                          <rect x="350" y="60" width="22" height="120" fill="#3b82f6" rx="4" />
                          <rect x="430" y="20" width="22" height="160" fill="#3b82f6" rx="4" />
                        </>
                      ) : (
                        <>
                          {/* Longan Data */}
                          <rect x="30" y="140" width="22" height="40" fill="#8b5cf6" rx="4" />
                          <rect x="110" y="120" width="22" height="60" fill="#8b5cf6" rx="4" />
                          <rect x="190" y="100" width="22" height="80" fill="#8b5cf6" rx="4" />
                          <rect x="270" y="60" width="22" height="120" fill="#8b5cf6" rx="4" />
                          <rect x="350" y="50" width="22" height="130" fill="#8b5cf6" rx="4" />
                          <rect x="430" y="40" width="22" height="140" fill="#8b5cf6" rx="4" />
                        </>
                      )}

                      {/* Line Plot Data (Simulation of AI Forecasted Crop) */}
                      {selectedCropChart === 'strawberry' ? (
                        <path 
                          d="M 41 125 L 121 75 L 201 100 L 281 30 L 361 70 L 441 15" 
                          fill="none" 
                          stroke="#10b981" 
                          strokeWidth="3" 
                          strokeDasharray="5,3" 
                        />
                      ) : (
                        <path 
                          d="M 41 150 L 121 115 L 201 110 L 281 50 L 361 55 L 441 30" 
                          fill="none" 
                          stroke="#10b981" 
                          strokeWidth="3" 
                          strokeDasharray="5,3" 
                        />
                      )}
                    </svg>
                  </div>

                  <div className="flex justify-between items-center text-[10px] text-slate-400 font-bold uppercase mt-4 px-2 border-t border-slate-100 pt-3">
                    <span className="w-16 text-center">ม.ค.</span>
                    <span className="w-16 text-center">ก.พ.</span>
                    <span className="w-16 text-center">มี.ค.</span>
                    <span className="w-16 text-center">เม.ย.</span>
                    <span className="w-16 text-center">พ.ค.</span>
                    <span className="w-16 text-center">มิ.ย.</span>
                  </div>

                  <div className="flex flex-wrap gap-4 mt-4 justify-center">
                    <div className="flex items-center gap-1.5 text-xs text-slate-600 font-semibold">
                      <span className={`w-3.5 h-3.5 rounded ${selectedCropChart === 'strawberry' ? 'bg-blue-500' : 'bg-purple-500'}`}></span>
                      <span>ปริมาณจัดเก็บได้จริง (ตัน)</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-slate-600 font-semibold">
                      <span className="w-3.5 h-3.5 rounded border border-emerald-500 bg-emerald-50 border-dashed border-2"></span>
                      <span>AI คาดการณ์ล่วงหน้า (ตัน)</span>
                    </div>
                  </div>
                </div>

                {/* AI Notification & Dynamic Alert Center */}
                <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm flex flex-col justify-between">
                  <div className="mb-4">
                    <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-indigo-500" />
                      ศูนย์ข่าววิเคราะห์ AI รายวัน
                    </h3>
                    <p className="text-xs text-slate-400 font-medium mt-0.5">การวิเคราะห์ดาวเทียมและข้อมูลชุมชนเกษตรกรรอบสัปดาห์</p>
                  </div>

                  <div className="flex-1 space-y-4 overflow-y-auto max-h-[220px] pr-1">
                    
                    {/* Alert Card 1 */}
                    <div className="p-4 bg-rose-50 border border-rose-100 rounded-xl space-y-1.5">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-rose-800">ตรวจพบความเสี่ยงโรคพืช</span>
                        <span className="text-[10px] text-slate-400 font-bold">15 นาทีที่แล้ว</span>
                      </div>
                      <p className="text-xs text-rose-700 leading-relaxed font-medium">
                        รูปสตรอว์เบอร์รีพอร์ทจากแปลง นายสมชาย ใจดี มีอาการขอบใบไหม้คล้ายโรคแอนแทรคโนส
                      </p>
                      <button 
                        onClick={() => {
                          setSelectedMemberProfile(members[0]);
                          setSelectedModal('member');
                        }}
                        className="text-[10px] bg-white hover:bg-rose-100 text-rose-800 font-bold py-1 px-3.5 rounded-lg border border-rose-200/80 transition"
                      >
                        เปิดประวัติสมุดเกษตร
                      </button>
                    </div>

                    {/* Alert Card 2 */}
                    <div className="p-4 bg-amber-50 border border-amber-100 rounded-xl space-y-1.5">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-amber-800">แจ้งเตือนปริมาณฝนพายุ</span>
                        <span className="text-[10px] text-slate-400 font-bold">1 ชั่วโมงที่แล้ว</span>
                      </div>
                      <p className="text-xs text-amber-700 leading-relaxed font-medium">
                        คาดการณ์มรสุมจะเคลื่อนตัวผ่าน ต.แม่ริม มีโอกาสเกิดน้ำขังในพื้นที่ต่ำแปลงสตรอว์เบอร์รีกว่า 35 ไร่
                      </p>
                      <button 
                        onClick={() => triggerToast('ระบบทำการส่งข้อความ SMS ด่วนและ Push Notification แจ้งเตือนเกษตรกร 35 รายสำเร็จ!', 'success')}
                        className="text-[10px] bg-amber-600 hover:bg-amber-700 text-white font-bold py-1 px-3.5 rounded-lg transition"
                      >
                        บรอดแคสต์ส่ง SMS ด่วน
                      </button>
                    </div>

                  </div>

                  <div className="mt-4 pt-4 border-t border-slate-100">
                    <p className="text-[10px] text-slate-400 text-center font-bold">ระบบวิเคราะห์ข้อมูลเชื่อมตรงกับเครือข่ายดาวเทียม GISTDA</p>
                  </div>
                </div>

              </div>

            </div>
          )}

          {/* ============================================== */}
          {/* 2. VIEW: TASKS (INBOX FROM SPREADSHEET)        */}
          {/* ============================================== */}
          {currentView === 'tasks' && (
            <div className="space-y-6">
              
              {/* Header Filters & Query */}
              <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
                <div className="relative w-full md:w-80">
                  <span className="absolute inset-y-0 left-3 flex items-center text-slate-400">
                    <Search className="w-4 h-4" />
                  </span>
                  <input 
                    type="text" 
                    placeholder="ค้นหารหัสคำขอ, ชื่อเกษตรกร หรือบริการ..."
                    value={taskSearchQuery}
                    onChange={(e) => setTaskSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 font-medium transition-all shadow-sm"
                  />
                </div>

                <div className="flex flex-wrap gap-2">
                  <button className="px-4 py-2 bg-slate-900 text-white rounded-lg text-xs font-bold shadow-sm">
                    ทั้งหมด ({filteredTasks.length})
                  </button>
                  <button 
                    onClick={() => triggerToast('ตัวกรองกำลังพัฒนาเสร็จสิ้น', 'info')}
                    className="px-4 py-2 bg-white border border-slate-200 text-slate-600 hover:text-slate-900 rounded-lg text-xs font-bold shadow-sm transition"
                  >
                    รอโอนเงิน ({(tasks.filter(t => t.status === 'รอโอนเงิน')).length})
                  </button>
                  <button 
                    onClick={() => triggerToast('ตัวกรองกำลังพัฒนาเสร็จสิ้น', 'info')}
                    className="px-4 py-2 bg-white border border-slate-200 text-slate-600 hover:text-slate-900 rounded-lg text-xs font-bold shadow-sm transition"
                  >
                    รอจัดสรรคนขับ ({(tasks.filter(t => t.status === 'รอจัดสรรคนขับ')).length})
                  </button>
                </div>
              </div>

              {/* Data Table */}
              <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-400 text-[10px] uppercase font-bold tracking-widest">
                        <th className="p-4 pl-6">ประเภทคำขอ / รหัสอ้างอิง</th>
                        <th className="p-4">สมาชิกผู้ยื่นขอ</th>
                        <th className="p-4">รายละเอียดในเอกสาร</th>
                        <th className="p-4">คะแนนน่าเชื่อถือ</th>
                        <th className="p-4">สถานะคำขอ</th>
                        <th className="p-4 pr-6 text-right">ดำเนินการและอนุมัติ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs">
                      {filteredTasks.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="p-12 text-center text-slate-400 font-medium">
                            <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2 animate-bounce" />
                            ไม่มีคำขอคงค้างในตัวกรองนี้! เจ้าหน้าที่จัดการเสร็จสิ้นหมดแล้ว
                          </td>
                        </tr>
                      ) : (
                        filteredTasks.map((t) => (
                          <tr key={t.refId} className="hover:bg-slate-50/80 transition-colors group">
                            
                            {/* Ref & Type */}
                            <td className="p-4 pl-6">
                              <div className="flex items-center gap-3">
                                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                                  t.type === 'เคลมประกันพืชผล' ? 'bg-blue-50 text-blue-600 border border-blue-100' :
                                  t.type === 'เช่าเครื่องจักร' ? 'bg-amber-50 text-amber-600 border border-amber-100' :
                                  'bg-pink-50 text-pink-600 border border-pink-100'
                                }`}>
                                  {t.type === 'เคลมประกันพืชผล' && <ShieldCheck className="w-5 h-5" />}
                                  {t.type === 'เช่าเครื่องจักร' && <Truck className="w-5 h-5" />}
                                  {t.type === 'เบิกสวัสดิการ' && <Building2 className="w-5 h-5" />}
                                </div>
                                <div>
                                  <p className="font-extrabold text-slate-900 text-xs">{t.type}</p>
                                  <p className="text-[10px] text-slate-400 font-semibold uppercase mt-0.5">{t.refId}</p>
                                </div>
                              </div>
                            </td>

                            {/* Member */}
                            <td className="p-4">
                              <div className="font-bold text-slate-800">{t.memberName}</div>
                              <div className="text-[10px] text-slate-400 font-medium mt-0.5">{t.memberId}</div>
                            </td>

                            {/* Details */}
                            <td className="p-4 max-w-xs">
                              <p className="text-slate-600 leading-normal font-medium">{t.details}</p>
                              
                              {/* If photo attachment reference exists */}
                              {t.additionalInfo === 'ดูรูปถ่ายจากระบบ Face ID App' ? (
                                <button 
                                  onClick={() => setSelectedModal('claim')}
                                  className="inline-flex items-center gap-1.5 mt-1.5 text-[10px] text-blue-600 hover:text-blue-700 font-bold bg-blue-50 hover:bg-blue-100/70 border border-blue-100 px-2 py-0.5 rounded"
                                >
                                  📸 ดูรูปถ่ายและพิกัดแปลง (AI ตรวจแล้ว)
                                </button>
                              ) : (
                                <p className="text-[10px] text-slate-400 font-bold mt-1.5 flex items-center gap-1">
                                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                  {t.additionalInfo}
                                </p>
                              )}
                            </td>

                            {/* Score */}
                            <td className="p-4">
                              {t.score ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-50 border border-emerald-100 text-emerald-700">
                                  Score: {t.score}
                                </span>
                              ) : (
                                <span className="text-[10px] text-slate-400">ไม่ได้ระบุ</span>
                              )}
                            </td>

                            {/* Status */}
                            <td className="p-4">
                              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold ${
                                t.status === 'รอประเมินความเสียหาย' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                                t.status === 'รอจัดสรรคนขับ' ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' :
                                'bg-sky-50 text-sky-700 border border-sky-200'
                              }`}>
                                <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse"></span>
                                {t.status}
                              </span>
                            </td>

                            {/* Quick Action Button */}
                            <td className="p-4 pr-6 text-right">
                              {t.type === 'เคลมประกันพืชผล' && (
                                <button 
                                  onClick={() => setSelectedModal('claim')}
                                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-1.5 px-3.5 rounded-xl transition shadow-sm"
                                >
                                  {t.actionLabel}
                                </button>
                              )}
                              
                              {t.type === 'เช่าเครื่องจักร' && (
                                <div className="flex justify-end gap-1.5">
                                  <button 
                                    onClick={() => triggerToast('แสดงประวัติตารางว่างรถแทรกเตอร์ประจำวันที่ 20 มิ.ย. 2567', 'info')}
                                    className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold py-1.5 px-3 rounded-xl transition"
                                  >
                                    คิวว่าง
                                  </button>
                                  <button 
                                    onClick={() => handleApproveTask(t.refId, 'จัดส่งพนักงานขับรถ TC-04 นายชัยวัฒน์ ไปยังแปลงนางสมศรี สำเร็จ!')}
                                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-1.5 px-3.5 rounded-xl transition shadow-sm"
                                  >
                                    อนุมัติคิว
                                  </button>
                                </div>
                              )}

                              {t.type === 'เบิกสวัสดิการ' && (
                                <button 
                                  onClick={() => handleApproveTask(t.refId, 'ดำเนินการสั่งโอนเงินสวัสดิการรักษาพยาบาล 2,500 บาท เข้าบัญชี ธ.ก.ส. นายสมชาย เรียบร้อยแล้ว')}
                                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-1.5 px-3.5 rounded-xl transition shadow-sm"
                                >
                                  {t.actionLabel}
                                </button>
                              )}
                            </td>

                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          )}

          {/* ============================================== */}
          {/* 3. VIEW: CRM (MEMBERS DATABASE)                */}
          {/* ============================================== */}
          {currentView === 'members' && (
            <div className="space-y-6">
              
              <div className="flex flex-col sm:flex-row gap-4 justify-between items-stretch sm:items-center">
                <div className="relative w-full sm:w-80">
                  <span className="absolute inset-y-0 left-3 flex items-center text-slate-400">
                    <Search className="w-4 h-4" />
                  </span>
                  <input 
                    type="text" 
                    placeholder="ค้นหาชื่อเกษตรกร, พืชหลัก, รหัส, ที่อยู่..."
                    value={memberSearchQuery}
                    onChange={(e) => setMemberSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 font-medium transition-all shadow-sm"
                  />
                </div>
                
                <div className="flex gap-2.5 items-center justify-end">
                  <button
                    onClick={handleSyncCRM}
                    disabled={isSyncingCRM}
                    className="flex items-center gap-1.5 bg-white hover:bg-slate-50 text-slate-700 font-extrabold text-xs py-2 px-3.5 border border-slate-200 rounded-xl shadow-sm transition active:scale-95 disabled:opacity-50 cursor-pointer"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isSyncingCRM ? 'animate-spin' : ''}`} />
                    {isSyncingCRM ? 'กำลังซิงค์...' : 'ซิงค์ข้อมูล CRM'}
                  </button>
                  
                  <button
                    onClick={() => {
                      setMemberFormType('add');
                      setMemberFormValue({
                        id: `KST-${Math.floor(10000 + Math.random() * 90000)}`,
                        name: '',
                        crops: '',
                        area: '',
                        score: 'B',
                        debt: 0,
                        lastActive: 'วันนี้ 10:45 น.'
                      });
                      setMemberFormOpen(true);
                    }}
                    className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs py-2 px-3.5 rounded-xl shadow-md transition active:scale-95 cursor-pointer"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    เพิ่มสมาชิกใหม่
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                {/* List of members left */}
                <div className="md:col-span-2 bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
                  <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
                    <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">รายชื่อผู้จดทะเบียนสมาชิกสหกรณ์</h3>
                    <span className="text-[10px] bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full font-bold">
                      ทั้งหมด {members.length} รายชื่อ
                    </span>
                  </div>

                  {isLoadingMembers ? (
                    <div className="p-12 text-center flex flex-col items-center justify-center gap-3">
                      <RefreshCw className="w-8 h-8 text-blue-500 animate-spin" />
                      <p className="text-xs text-slate-500 font-bold">กำลังดึงข้อมูลสมาชิก...</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-100">
                      {filteredMembers.length === 0 ? (
                        <div className="p-12 text-center text-slate-400 text-xs font-bold">
                          ไม่พบข้อมูลสมาชิกตามที่ค้นหา
                        </div>
                      ) : (
                        filteredMembers.map((m) => (
                          <div 
                            key={m.id} 
                            onClick={() => {
                              setSelectedMemberProfile(m);
                              setSelectedModal('member');
                            }}
                            className="p-5 flex flex-col sm:flex-row justify-between sm:items-center gap-4 hover:bg-slate-50 cursor-pointer transition-colors"
                          >
                            <div className="flex items-center gap-3.5">
                              <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center font-extrabold text-slate-700 shadow-inner">
                                {(m.name || '    ').charAt(3) || 'S'}
                              </div>
                              <div>
                                <div className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
                                  {m.name}
                                  <span className={`inline-block px-2 py-0.5 rounded text-[9px] font-black ${
                                    m.score === 'A' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' :
                                    m.score === 'B+' ? 'bg-blue-50 text-blue-700 border border-blue-100' :
                                    'bg-rose-50 text-rose-700 border border-rose-100'
                                  }`}>
                                    Agri-Score: {m.score}
                                  </span>
                                </div>
                                <p className="text-xs text-slate-500 mt-1">
                                  <span className="font-semibold text-slate-800">พืชหลัก:</span> {m.crops}
                                </p>
                                <p className="text-[10px] text-slate-400 mt-0.5">{m.area}</p>
                              </div>
                            </div>

                            <div className="flex items-center justify-between sm:justify-end gap-6 border-t sm:border-t-0 pt-3 sm:pt-0">
                              <div className="text-left sm:text-right">
                                <p className="text-[10px] text-slate-400 font-bold uppercase">ยอดหนี้ O/D ในระบบ</p>
                                <p className="text-sm font-black text-slate-950">฿ {(m.debt || 0).toLocaleString()}</p>
                              </div>
                              <div className="text-right">
                                <p className="text-[10px] text-slate-400 font-bold uppercase">ออฟไลน์ล่าสุด</p>
                                <p className="text-xs text-slate-500 font-semibold">{m.lastActive || 'วันนี้ 10:45 น.'}</p>
                              </div>
                              <ChevronRight className="w-5 h-5 text-slate-300 hidden sm:block" />
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>

                {/* CRM Insights Panel */}
                <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm space-y-6">
                  <div>
                    <h3 className="font-extrabold text-slate-900 text-sm">สถิติคะแนนเกษตรกร</h3>
                    <p className="text-xs text-slate-400 mt-0.5">แบ่งตามการปฏิบัติตามมาตรฐาน GAP และประวัติการจัดส่งผลผลิตสม่ำเสมอ</p>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between items-center text-xs font-bold text-slate-600 mb-1.5">
                        <span>เกรด A (คะแนนดีมาก ส่งสินค้าตรงเวลา)</span>
                        <span className="text-emerald-600">65%</span>
                      </div>
                      <div className="w-full bg-slate-100 h-2 rounded-full">
                        <div className="bg-emerald-500 h-2 rounded-full w-[65%]"></div>
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between items-center text-xs font-bold text-slate-600 mb-1.5">
                        <span>เกรด B/B+ (ชำระหนี้ตรง สภาพแปลงดี)</span>
                        <span className="text-blue-600">25%</span>
                      </div>
                      <div className="w-full bg-slate-100 h-2 rounded-full">
                        <div className="bg-blue-500 h-2 rounded-full w-[25%]"></div>
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between items-center text-xs font-bold text-slate-600 mb-1.5">
                        <span>เกรด C/D (เฝ้าระวังหนี้ ค้างชำระผลผลิต)</span>
                        <span className="text-rose-600">10%</span>
                      </div>
                      <div className="w-full bg-slate-100 h-2 rounded-full">
                        <div className="bg-rose-500 h-2 rounded-full w-[10%]"></div>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 text-xs text-slate-500 leading-normal">
                    <p className="font-bold text-slate-800 mb-1 flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-indigo-500 shrink-0" />
                      ระบบให้เกรดอัตโนมัติ (Agri-Score)
                    </p>
                    คำนวณจากความถี่ในการกรอกบันทึกสมุดเกษตร (Traceability Ledger), ประวัติการจ่ายเงินคืน BNPL และพารามิเตอร์ความอุดมสมบูรณ์ของพืชจากภาพถ่ายดาวเทียม
                  </div>
                </div>

              </div>

            </div>
          )}

          {/* ============================================== */}
          {/* 4. VIEW: MARKETPLACE (E-COMMERCE BACKEND)      */}
          {/* ============================================== */}
          {currentView === 'market' && (
            <div className="space-y-6">
              
              {/* Marketplace Sub Tabs */}
              <div className="flex overflow-x-auto no-scrollbar border-b border-slate-200 bg-white p-2 rounded-2xl gap-1 shrink-0 shadow-sm">
                <button 
                  onClick={() => setMarketTab('qc')}
                  className={`px-5 py-2.5 text-xs font-bold rounded-xl transition-all whitespace-nowrap shrink-0 flex items-center gap-2 ${
                    marketTab === 'qc' ? 'bg-blue-600 text-white shadow-md shadow-blue-600/10' : 'text-slate-500 hover:bg-slate-50'
                  }`}
                >
                  รอตรวจสอบคุณภาพ (QC)
                  {marketProducts.length > 0 && (
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-black ${marketTab === 'qc' ? 'bg-white text-blue-600' : 'bg-rose-500 text-white'}`}>
                      {marketProducts.length}
                    </span>
                  )}
                </button>
                <button 
                  onClick={() => setMarketTab('active')}
                  className={`px-5 py-2.5 text-xs font-bold rounded-xl transition-all whitespace-nowrap shrink-0 ${
                    marketTab === 'active' ? 'bg-blue-600 text-white shadow-md shadow-blue-600/10' : 'text-slate-500 hover:bg-slate-50'
                  }`}
                >
                  วางขายบนแอพแล้ว (145 รายการ)
                </button>
                <button 
                  onClick={() => setMarketTab('orders')}
                  className={`px-5 py-2.5 text-xs font-bold rounded-xl transition-all whitespace-nowrap shrink-0 flex items-center gap-2 ${
                    marketTab === 'orders' ? 'bg-blue-600 text-white shadow-md shadow-blue-600/10' : 'text-slate-500 hover:bg-slate-50'
                  }`}
                >
                  คำสั่งซื้อ & คัดส่งผลผลิต
                  <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>
                </button>
                <button 
                  onClick={() => setMarketTab('demand')}
                  className={`px-5 py-2.5 text-xs font-bold rounded-xl transition-all whitespace-nowrap shrink-0 ${
                    marketTab === 'demand' ? 'bg-blue-600 text-white shadow-md shadow-blue-600/10' : 'text-slate-500 hover:bg-slate-50'
                  }`}
                >
                  ความต้องการรับซื้อ B2B Contract
                </button>
              </div>

              {/* QC Tab Body */}
              {marketTab === 'qc' && (
                <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
                  <div className="p-4 bg-slate-50 border-b border-slate-200">
                    <h3 className="text-xs font-extrabold text-slate-800">สินค้าส่งเข้าพิจารณาก่อนวางจำหน่ายหน้าแอพสมาชิก</h3>
                  </div>

                  <div className="divide-y divide-slate-100">
                    {marketProducts.length === 0 ? (
                      <div className="p-12 text-center text-slate-400 font-semibold">
                        ไม่มีสินค้ารอตรวจสอบในขณะนี้
                      </div>
                    ) : (
                      marketProducts.map((p) => (
                        <div key={p.id} className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-5">
                          <div className="flex items-start gap-4">
                            <img 
                              src={p.imageUrl} 
                              alt={p.name} 
                              className="w-16 h-16 rounded-xl object-cover shrink-0 border border-slate-200/80" 
                            />
                            <div>
                              <h4 className="font-extrabold text-slate-900 text-sm leading-tight">{p.name}</h4>
                              <p className="text-[10px] text-slate-400 mt-1 font-bold uppercase">
                                โดย: {p.sellerName} ({p.sellerId})
                              </p>
                              
                              <p className="text-[10px] text-slate-500 mt-2 flex items-center gap-1.5 bg-slate-100 px-2.5 py-1 rounded-lg w-max">
                                <span className="inline-block w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                                ใบรับรอง: {p.standards}
                              </p>
                            </div>
                          </div>

                          <div className="flex flex-wrap md:flex-nowrap items-center gap-6 justify-between md:justify-end border-t md:border-t-0 pt-3 md:pt-0">
                            <div>
                              <p className="text-[10px] text-slate-400 font-bold uppercase">ตั้งราคา / สต็อกเสนอ</p>
                              <p className="text-sm font-black text-slate-950">฿ {p.price} <span className="text-xs font-medium text-slate-400">/ {p.unit}</span></p>
                              <p className="text-[10px] text-slate-400 font-bold mt-0.5">สต็อกต้น: {p.stock} กก.</p>
                            </div>

                            <div className="bg-teal-50 border border-teal-100 text-teal-800 p-3 rounded-xl max-w-xs text-[11px] leading-relaxed">
                              <p className="font-bold mb-0.5 flex items-center gap-1"><Sparkles className="w-3.5 h-3.5" /> วิเคราะห์ภาพถ่าย AI</p>
                              {p.aiNotes}
                            </div>

                            <div className="flex gap-2 shrink-0">
                              <button 
                                onClick={() => handleQCProduct(p.id, false)}
                                className="px-3 py-1.5 border border-rose-200 text-rose-600 hover:bg-rose-50 rounded-xl text-xs font-bold transition"
                              >
                                ปฏิเสธ
                              </button>
                              <button 
                                onClick={() => handleQCProduct(p.id, true)}
                                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-sm"
                              >
                                อนุมัติขายจริง
                              </button>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* Active Tab Body */}
              {marketTab === 'active' && (
                <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
                  <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
                    <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">รายการจำหน่ายพร้อมส่ง</h3>
                    <span className="text-xs font-bold text-slate-400">รวม 145 ผลิตภัณฑ์</span>
                  </div>

                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-400 font-bold">
                        <th className="p-4">รายการสินค้า</th>
                        <th className="p-4">ผู้จัดจำหน่ายหลัก</th>
                        <th className="p-4">ราคาตั้ง</th>
                        <th className="p-4">สถานะสต็อกคงเหลือ</th>
                        <th className="p-4 text-center">สถานะใช้งานบนแอพ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      <tr>
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            <span className="text-base">☕</span>
                            <span className="font-bold text-slate-800">เมล็ดกาแฟอาราบิก้า คั่วกลางพิเศษ (ดอยสะเก็ด)</span>
                          </div>
                        </td>
                        <td className="p-4">กลุ่มวิสาหกิจเมล็ดกาแฟแม่ริม</td>
                        <td className="p-4 font-bold text-emerald-600">฿380 / ถุง</td>
                        <td className="p-4 font-semibold text-slate-600">1,240 ถุง (พร้อมส่ง)</td>
                        <td className="p-4 text-center">
                          <span className="inline-block bg-emerald-50 text-emerald-700 px-2.5 py-0.5 rounded-full font-bold">กำลังจำหน่าย</span>
                        </td>
                      </tr>
                      <tr>
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            <span className="text-base">🍯</span>
                            <span className="font-bold text-slate-800">น้ำผึ้งป่าแท้ธรรมชาติ 100% (โครงการหลวง)</span>
                          </div>
                        </td>
                        <td className="p-4">สหกรณ์แม่ริมศูนย์ย่อย 1</td>
                        <td className="p-4 font-bold text-emerald-600">฿250 / ขวด</td>
                        <td className="p-4 font-semibold text-slate-600">80 ขวด</td>
                        <td className="p-4 text-center">
                          <span className="inline-block bg-emerald-50 text-emerald-700 px-2.5 py-0.5 rounded-full font-bold">กำลังจำหน่าย</span>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}

              {/* Orders Tab Body */}
              {marketTab === 'orders' && (
                <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
                  <div className="p-4 bg-slate-50 border-b border-slate-200">
                    <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">ใบสั่งซื้อรอการคัดส่งถึงปลายทาง (เชื่อม Lalamove API)</h3>
                  </div>

                  <div className="divide-y divide-slate-100 text-xs">
                    {orders.map((o) => (
                      <div key={o.id} className="p-5 flex flex-col sm:flex-row justify-between sm:items-center gap-4 hover:bg-slate-50/50 transition">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-extrabold text-slate-900">{o.id}</span>
                            <span className={`px-2 py-0.5 rounded text-[9px] font-black ${
                              o.status === 'pending' ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'
                            }`}>
                              {o.status === 'pending' ? 'รอเตรียมพัสดุ' : 'กำลังขนส่ง'}
                            </span>
                          </div>
                          <p className="text-slate-600 font-bold mt-1.5">{o.productName}</p>
                          <p className="text-[10px] text-slate-400 mt-0.5">ผู้รับ: {o.buyerName} | ปลายทาง: {o.destination}</p>
                        </div>

                        <div className="flex items-center gap-4 justify-between sm:justify-end border-t sm:border-t-0 pt-3 sm:pt-0">
                          <div className="text-left sm:text-right">
                            <p className="text-[10px] text-slate-400 font-bold uppercase">ยอดเงินจ่ายสุทธิ</p>
                            <p className="font-black text-slate-950">฿ {o.amount.toLocaleString()}</p>
                          </div>
                          
                          {o.status === 'pending' ? (
                            <button 
                              onClick={() => handleShipOrder(o.id)}
                              className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-1.5 px-3 rounded-xl transition"
                            >
                              เรียกรถขนส่งผลผลิต
                            </button>
                          ) : (
                            <span className="text-[11px] text-slate-400 font-semibold flex items-center gap-1 bg-slate-100 px-3 py-1 rounded-lg">
                              <Truck className="w-4 h-4 text-blue-500 animate-bounce" /> อยู่ระหว่างการนำส่ง
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* B2B Contract Tab Body */}
              {marketTab === 'demand' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm space-y-4 relative overflow-hidden">
                    <span className="absolute top-0 right-0 bg-rose-500 text-white text-[9px] font-extrabold px-3 py-1 rounded-bl-xl">
                      เป้าขาดอีก 20 ตัน
                    </span>
                    
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-xl">🏭</div>
                      <div>
                        <h4 className="font-extrabold text-slate-950 text-xs">บริษัท แปรรูปผลไม้ไทย จำกัด (มหาชน)</h4>
                        <p className="text-[10px] text-slate-400 font-bold">ลำไยอีดอ เกรด AA (รับซื้อทำลำไยอบแห้งส่งออก)</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-xl">
                      <div>
                        <p className="text-[9px] text-slate-400 font-bold uppercase">ราคารับซื้ออ้างอิง</p>
                        <p className="text-base font-black text-emerald-600">฿35.00 <span className="text-[10px] font-medium text-slate-400">/ กก.</span></p>
                      </div>
                      <div>
                        <p className="text-[9px] text-slate-400 font-bold uppercase">เป้าหมายรวม</p>
                        <p className="text-base font-black text-slate-900">50 ตัน</p>
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between items-center text-[11px] font-bold text-slate-600 mb-1.5">
                        <span>สมาชิกร่วมโครงการสัญญาเสนอขายแล้ว: <span className="text-blue-600 font-extrabold">12 ราย (30 ตัน)</span></span>
                        <span>60%</span>
                      </div>
                      <div className="w-full bg-slate-100 h-2 rounded-full">
                        <div className="bg-blue-600 h-2 rounded-full w-[60%]"></div>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <button 
                        onClick={() => triggerToast('เปิดแสดงประวัติรายชื่อสัญญารับซื้อคู่ค้า', 'info')}
                        className="flex-1 py-1.5 border border-slate-200 text-slate-700 font-bold text-xs rounded-lg hover:bg-slate-50 transition"
                      >
                        ดูรายชื่อสมาชิก
                      </button>
                      <button 
                        onClick={() => triggerToast('บรอดแคสต์ส่งแจ้งเตือนเพิ่มการเสนอขายลำไยสำเร็จ!', 'success')}
                        className="flex-1 py-1.5 bg-blue-600 text-white font-bold text-xs rounded-lg hover:bg-blue-700 transition"
                      >
                        บรอดแคสต์หาเกษตรกรเพิ่ม
                      </button>
                    </div>
                  </div>
                </div>
              )}

            </div>
          )}

          {/* ============================================== */}
          {/* 5. VIEW: FINANCE                               */}
          {/* ============================================== */}
          {currentView === 'finance' && (
            <div className="space-y-6">
              
              {/* Debt overview cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-gradient-to-tr from-slate-900 to-slate-800 rounded-2xl p-6 text-white shadow-lg space-y-4 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500 rounded-full blur-[70px] opacity-25"></div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">วงเงินสินเชื่อที่พร้อมจัดสรรในระบบ</p>
                    <h2 className="text-3xl font-black mt-1">฿ 45,200,000</h2>
                  </div>
                  <div className="text-[10px] bg-white/10 px-2.5 py-1 rounded-full font-bold border border-white/5 w-max">
                    อนุมัติจ่ายแล้วเดือนนี้ ฿ 2.1M
                  </div>
                </div>

                <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm flex flex-col justify-between">
                  <div>
                    <p className="text-[10px] uppercase font-bold tracking-widest text-slate-400 mb-1">หนี้ค้างชำระเสีย (NPL)</p>
                    <h3 className="text-2xl font-black text-rose-600">1.2%</h3>
                  </div>
                  <p className="text-[10px] text-slate-400 font-semibold mt-4">ควบคุมสัดส่วนได้ดีกว่าระดับเกณฑ์มาตรฐานภาคธนาคาร 2.5%</p>
                </div>

                <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm flex flex-col justify-between">
                  <div>
                    <p className="text-[10px] uppercase font-bold tracking-widest text-slate-400 mb-1">ยอดใช้จ่าย BNPL ซื้อปุ๋ย/ยา/อุปกรณ์</p>
                    <h3 className="text-2xl font-black text-emerald-600">฿ 850,000</h3>
                  </div>
                  <p className="text-[10px] text-slate-400 font-semibold mt-4">รายการซื้อวัสดุจากกลุ่มร้านค้าเครือข่ายสหกรณ์แม่ริม</p>
                </div>
              </div>

              {/* Transactions Ledger */}
              <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
                <div className="p-4 bg-slate-50 border-b border-slate-200">
                  <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">คำขออนุมัติวงเงินฉุกเฉินและเครดิตซ่อมบำรุงล่าสุด</h3>
                </div>

                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-400 font-bold">
                      <th className="p-4 pl-6">สมาชิกผู้ขอรับ</th>
                      <th className="p-4">ประเภท/ความต้องการ</th>
                      <th className="p-4">ประวัติชำระ / ความเสี่ยง</th>
                      <th className="p-4 text-right pr-6">การพิจารณาอนุมัติ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    <tr className="hover:bg-slate-50/50">
                      <td className="p-4 pl-6">
                        <div className="font-bold text-slate-800">นายสมชาย ใจดี</div>
                        <p className="text-[10px] text-slate-400 font-medium">รหัส: KST-88902</p>
                      </td>
                      <td className="p-4">
                        <p className="font-black text-blue-600">฿ 15,000</p>
                        <p className="text-[10px] text-slate-400">ขอเบิกเงินสดฉุกเฉิน O/D หมุนเวียนค่าน้ำหยดระบบปั๊ม</p>
                      </td>
                      <td className="p-4">
                        <span className="inline-block bg-emerald-50 border border-emerald-100 text-emerald-700 text-[10px] px-2 py-0.5 rounded font-extrabold mb-1">Score: A</span>
                        <p className="text-[10px] text-slate-400">ประวัติการจ่าย: ตรงเวลาสมบูรณ์</p>
                      </td>
                      <td className="p-4 text-right pr-6">
                        <button 
                          onClick={() => triggerToast('อนุมัติโอนวงเงินฉุกเฉิน 15,000 บาท เข้าสมาร์ทการ์ดนายสมชายเรียบร้อย!', 'success')}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-1.5 px-3.5 rounded-xl transition shadow-sm text-[11px]"
                        >
                          อนุมัติวงเงินฉุกเฉิน
                        </button>
                      </td>
                    </tr>
                    <tr className="hover:bg-slate-50/50">
                      <td className="p-4 pl-6">
                        <div className="font-bold text-slate-800">นางประนอม คงทน</div>
                        <p className="text-[10px] text-slate-400 font-medium">รหัส: KST-77210</p>
                      </td>
                      <td className="p-4">
                        <p className="font-black text-amber-600">฿ 8,500</p>
                        <p className="text-[10px] text-slate-400">สิทธิซื้อเชื่อปุ๋ยเคมีสูตรพิเศษ (BNPL)</p>
                      </td>
                      <td className="p-4">
                        <span className="inline-block bg-blue-50 border border-blue-100 text-blue-700 text-[10px] px-2 py-0.5 rounded font-extrabold mb-1">Score: B+</span>
                        <p className="text-[10px] text-slate-400">ค้างชำระปัจจุบัน: 0 บาท</p>
                      </td>
                      <td className="p-4 text-right pr-6">
                        <button 
                          onClick={() => triggerToast('อนุมัติสิทธิเช็คพัสดุปุ๋ยตัดวงเงินเรียบร้อยแล้ว ร้านค้าสามารถส่งมอบปุ๋ยได้ทันที!', 'success')}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-1.5 px-3.5 rounded-xl transition shadow-sm text-[11px]"
                        >
                          อนุมัติปล่อยเครดิต
                        </button>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

            </div>
          )}

          {/* ============================================== */}
          {/* 6. VIEW: MACHINE INVENTORY                     */}
          {/* ============================================== */}
          {currentView === 'machine' && (
            <div className="space-y-6">
              
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-sm font-extrabold text-slate-900">คลังคิวเครื่องจักรและโดรนเกษตรแชร์ริ่ง (Co-operative Logistics)</h2>
                  <p className="text-xs text-slate-400 font-medium">คลังจัดสรรแบ่งกันใช้งานเครื่องไถและโดรนสารพัดประโยชน์</p>
                </div>
                <button 
                  onClick={() => triggerToast('ส่งเจ้าหน้าที่ฝ่ายช่างเข้าตรวจสุขภาพคลังแทรกเตอร์ประจำรอบเรียบร้อย', 'success')}
                  className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold px-3.5 py-1.5 rounded-xl text-xs transition shadow-sm"
                >
                  แจ้งตรวจสภาพเครื่องจักร
                </button>
              </div>

              {/* Machinery sharing overview stats */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Tractor Status Card */}
                <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm space-y-4">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-100 shrink-0">
                        <Truck className="w-6 h-6" />
                      </div>
                      <div>
                        <h3 className="font-extrabold text-slate-900 text-sm">รถแทรกเตอร์ประจำตารางขับ</h3>
                        <p className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">รวมในสังกัดสหกรณ์: 10 คัน</p>
                      </div>
                    </div>
                    <span className="text-sm font-black text-blue-600">8/10 คันถูกจอง</span>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs font-bold text-slate-500 mb-1">
                      <span>ประสิทธิภาพการแชร์ประจำวัน (Utilization Rate)</span>
                      <span>80%</span>
                    </div>
                    <div className="w-full bg-slate-100 h-2 rounded-full">
                      <div className="bg-blue-600 h-2 rounded-full w-[80%]"></div>
                    </div>
                  </div>
                </div>

                {/* Drone Status Card */}
                <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm space-y-4">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100 shrink-0">
                        <Sparkles className="w-6 h-6" />
                      </div>
                      <div>
                        <h3 className="font-extrabold text-slate-900 text-sm">โดรนอัจฉริยะสารพัดประโยชน์</h3>
                        <p className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">รวมในสังกัดสหกรณ์: 5 ลำ</p>
                      </div>
                    </div>
                    <span className="text-sm font-black text-emerald-600">2/5 ลำออกบิน</span>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs font-bold text-slate-500 mb-1">
                      <span>ประสิทธิภาพการแชร์ประจำวัน (Utilization Rate)</span>
                      <span>40%</span>
                    </div>
                    <div className="w-full bg-slate-100 h-2 rounded-full">
                      <div className="bg-emerald-500 h-2 rounded-full w-[40%]"></div>
                    </div>
                  </div>
                </div>

              </div>

              {/* Sharing schedule logs */}
              <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
                <div className="p-4 bg-slate-50 border-b border-slate-200">
                  <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">ตารางและคิวภารกิจปฏิบัติงานจริงในพื้นที่แม่ริม</h3>
                </div>

                <div className="p-4 space-y-3 text-xs">
                  
                  {/* Task Log 1 */}
                  <div className="flex flex-col sm:flex-row justify-between sm:items-center p-4 bg-slate-50 border border-slate-100 rounded-xl gap-4 font-semibold">
                    <div className="flex items-center gap-3">
                      <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></div>
                      <div>
                        <p className="font-bold text-slate-900">รถแทรกเตอร์ใหญ่ ค่ายคูโบต้า #TC-04</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">พนักงานขับ: นายชูชาติ แก้วกลาง | กำลังไถเตรียมแปลงสตรอว์เบอร์รี (แปลงสมชาย)</p>
                      </div>
                    </div>
                    <span className="text-[10px] font-black text-emerald-600 uppercase tracking-wider">กำลังปฏิบัติงาน (เหลือคิวอีก 2 ชม.)</span>
                  </div>

                  {/* Task Log 2 */}
                  <div className="flex flex-col sm:flex-row justify-between sm:items-center p-4 bg-slate-50 border border-slate-100 rounded-xl gap-4 font-semibold">
                    <div className="flex items-center gap-3">
                      <div className="w-2.5 h-2.5 rounded-full bg-amber-500"></div>
                      <div>
                        <p className="font-bold text-slate-900">โดรนพ่นปุ๋ยมัลติสเปกตรัม DJI Agras #DR-01</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">คิวถัดไป: นางสมศรี ต.สันป่าตอง | พ่นสารอินทรีย์บำรุงรอบใบ</p>
                      </div>
                    </div>
                    <span className="text-[10px] font-black text-amber-600 uppercase tracking-wider">อยู่ระหว่างการนำชาร์จแบตเตอรี่และตรวจถังพ่น</span>
                  </div>

                </div>
              </div>

            </div>
          )}

          {/* ============================================== */}
          {/* 7. VIEW: CHAT HELP DESK (AI INTERACTIVE)       */}
          {/* ============================================== */}
          {currentView === 'chat' && (
            <div className="h-[calc(100vh-10rem)] flex flex-col md:flex-row bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden min-h-0">
              
              {/* Left sidebar chats list */}
              <div className="w-full md:w-80 border-r border-slate-200 bg-slate-50 flex flex-col shrink-0 min-h-0">
                <div className="p-4 border-b border-slate-200 bg-white shrink-0">
                  <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider">รายชื่อแชทรอความช่วยเหลือ</h3>
                  <p className="text-[10px] text-slate-400 font-semibold mt-0.5">ระบบสวิตช์ระหว่างตอบเองและคุยอัจฉริยะ (AI Escalated)</p>
                </div>

                <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
                  <div className="p-4 bg-blue-50/70 border-l-4 border-blue-600 cursor-pointer">
                    <div className="flex justify-between items-start mb-1.5">
                      <p className="font-extrabold text-slate-900 text-xs">นายสมชาย ใจดี</p>
                      <span className="text-[10px] text-slate-400 font-bold">10:45 น.</span>
                    </div>
                    <p className="text-xs text-slate-600 truncate font-semibold leading-relaxed">
                      อยากคุยกับนักวิชาการสหกรณ์ตัวจริงครับ...
                    </p>
                    <span className="inline-flex items-center gap-1.5 mt-2 px-2 py-0.5 rounded-full text-[9px] font-black bg-rose-50 border border-rose-100 text-rose-700">
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse"></span>
                      โอนสายให้คุณตอบเอง
                    </span>
                  </div>

                  <div 
                    onClick={() => triggerToast('แชทของนางประนอม ปัจจุบันระบบ AI ตอบคำถามเสร็จสิ้นเรียบร้อยในตัว', 'info')}
                    className="p-4 hover:bg-slate-100 transition cursor-pointer"
                  >
                    <div className="flex justify-between items-start mb-1.5">
                      <p className="font-bold text-slate-700 text-xs">นางประนอม คงทน</p>
                      <span className="text-[10px] text-slate-400 font-bold">09:30 น.</span>
                    </div>
                    <p className="text-xs text-slate-400 truncate leading-relaxed">
                      AI: สามารถตรวจสอบราคาเสนอซื้อได้ที่หน้าดีลเลยค่ะ...
                    </p>
                    <span className="inline-flex items-center gap-1.5 mt-2 px-2 py-0.5 rounded-full text-[9px] font-bold bg-slate-100 text-slate-500">
                      AI รับรองแล้ว
                    </span>
                  </div>
                </div>
              </div>

              {/* Chat pane right */}
              <div className="flex-1 flex flex-col bg-white min-h-0 min-w-0">
                
                {/* Farmer Info Head bar */}
                <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50 shrink-0">
                  <div className="min-w-0">
                    <h3 className="font-extrabold text-slate-900 text-sm truncate">นายสมชาย ใจดี (เกษตรกรดีเด่น เกรด A)</h3>
                    <p className="text-[10px] text-slate-500 font-bold flex items-center gap-1 mt-0.5">
                      <MapPin className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                      แปลงสตรอว์เบอร์รีแม่ริม (15 ไร่รวม) | pH ดินล่าสุด: 6.5
                    </p>
                  </div>
                  <button 
                    onClick={() => {
                      setSelectedMemberProfile(members[0]);
                      setSelectedModal('member');
                    }}
                    className="bg-white border border-slate-200 hover:bg-slate-50 font-bold py-1.5 px-3.5 rounded-xl text-[11px] transition shrink-0"
                  >
                    เปิดสมุด CRM เกษตรกร
                  </button>
                </div>

                {/* Messages Log area */}
                <div className="flex-1 overflow-y-auto p-5 bg-slate-50/50 space-y-4">
                  {chatMessages.map((msg, index) => (
                    <div 
                      key={index}
                      className={`flex gap-3 max-w-[85%] ${
                        msg.sender === 'admin' ? 'ml-auto flex-row-reverse' : ''
                      }`}
                    >
                      {/* Avatar */}
                      <div className={`w-8 h-8 rounded-xl shrink-0 flex items-center justify-center font-bold text-xs ${
                        msg.sender === 'farmer' ? 'bg-slate-200 text-slate-700' :
                        msg.sender === 'ai' ? 'bg-teal-100 text-teal-800' :
                        'bg-blue-600 text-white'
                      }`}>
                        {msg.sender === 'farmer' && 'สช'}
                        {msg.sender === 'ai' && 'AI'}
                        {msg.sender === 'admin' && 'สภ'}
                      </div>

                      {/* Msg bubble */}
                      <div className={`p-3.5 rounded-2xl shadow-sm text-xs leading-relaxed font-medium border ${
                        msg.sender === 'farmer' ? 'bg-white border-slate-200/60 rounded-tl-none text-slate-800' :
                        msg.sender === 'ai' ? 'bg-teal-50 border-teal-100 rounded-tr-none text-teal-900' :
                        'bg-blue-600 border-blue-700 text-white rounded-tr-none'
                      }`}>
                        <p>{msg.text}</p>
                        <span className={`text-[9px] block text-right mt-1.5 font-bold ${
                          msg.sender === 'admin' ? 'text-blue-200' : 'text-slate-400'
                        }`}>
                          {msg.time}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* AI Draft Assist Recommendations (linking features together) */}
                <div className="p-3 bg-slate-50 border-t border-slate-200/60 shrink-0">
                  <p className="text-[10px] text-slate-400 font-black uppercase mb-2 flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-500" /> แนะนำร่างคำตอบอัจฉริยะ (AI Assist Draft)
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <button 
                      onClick={() => setCurrentChatInput('สวัสดีครับ สมชาย จากที่ส่งใบตรวจใบไหม้ผ่านแอป คาดว่าอาจโดนโรคแอนแทรคโนส แนะนำให้ตัดใบทิ้งและฉีดสารบำรุง ปัจจุบันที่สหกรณ์สาขา 2 มีสารชีวภาพตรงสูตรลดราคา 15% นะครับ')}
                      className="bg-white border border-slate-200 hover:border-blue-500 text-slate-700 p-2.5 rounded-xl text-[10px] font-bold text-left hover:text-blue-600 transition shadow-sm max-w-[340px]"
                    >
                      💡 แนะนำซื้อสารชีวภาพบำรุงที่สหกรณ์ลดราคา 15%
                    </button>
                    <button 
                      onClick={() => setCurrentChatInput('รับเรื่องครับสมชาย ขณะนี้ผมกำลังประสานโดรน DJI Agras เข้าไปช่วยฉีดพ่นสารปรับสุขภาพหน้าแปลง สามารถเลือกคิวเช่าโดรนพร้อมส่วนลดสมาชิกเกรด A ในแอพพลิเคชันหน้าบริการเครื่องจักรได้เลยครับ')}
                      className="bg-white border border-slate-200 hover:border-blue-500 text-slate-700 p-2.5 rounded-xl text-[10px] font-bold text-left hover:text-blue-600 transition shadow-sm max-w-[340px]"
                    >
                      💡 แนะนำจองโดรนเกษตรแชร์ริ่งช่วยพ่นสาร
                    </button>
                  </div>
                </div>

                {/* Input area */}
                <div className="p-4 bg-white border-t border-slate-200 shrink-0">
                  <form 
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleSendChatMessage();
                    }}
                    className="flex gap-2"
                  >
                    <input 
                      type="text" 
                      placeholder="พิมพ์ข้อความคุยกับคุณสมชายในนามเจ้าหน้าที่สหกรณ์..."
                      value={currentChatInput}
                      onChange={(e) => setCurrentChatInput(e.target.value)}
                      className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 font-medium"
                    />
                    <button 
                      type="submit" 
                      className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-5 py-3 rounded-xl transition shadow-sm flex items-center justify-center shrink-0"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </form>
                </div>

              </div>

            </div>
          )}

          {/* D. Google Sheet to Firestore Importer View */}
          {currentView === 'import' && (
            <div className="space-y-6">
              
              {/* Top Banner */}
              <div className="bg-gradient-to-r from-blue-900 via-slate-900 to-slate-950 text-white rounded-3xl p-6 shadow-xl relative overflow-hidden border border-slate-800">
                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <div>
                    <span className="bg-blue-500/20 text-blue-300 text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full border border-blue-500/30">
                      ☁️ Firestore Cloud Synchronization Engine
                    </span>
                    <h2 className="text-xl md:text-2xl font-black tracking-tight mt-3">
                      ระบบแปลงแผ่นงาน Google Sheets ไปเป็น Firestore Collections
                    </h2>
                    <p className="text-xs text-slate-300 mt-2 max-w-2xl leading-relaxed font-medium">
                      เชื่อมต่อฐานข้อมูล NoSQL และซิงค์ข้อมูลเกษตรกร คำขอ และข้อมูลแชร์ริ่งเครื่องจักรจาก Google Sheets 
                      แปลงเป็น JSON Documents และส่งขึ้น Firestore ได้ทันทีโดยใช้ชื่อชีทเป็นชื่อคอลเลกชัน
                    </p>
                  </div>
                  <Database className="w-16 h-16 text-blue-500/30 absolute right-6 bottom-0 hidden md:block shrink-0" />
                </div>
              </div>

              {/* Grid Form and Rules */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                
                {/* Form configuration panel */}
                <div className="lg:col-span-5 bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-5">
                  <div className="border-b border-slate-100 pb-3">
                    <h3 className="font-extrabold text-sm text-slate-800 flex items-center gap-2">
                      <CloudUpload className="w-4 h-4 text-blue-600" />
                      ตั้งค่าการนำเข้าข้อมูล (Import Settings)
                    </h3>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1.5">
                        ลิงก์ Google Sheets (Spreadsheet URL)
                      </label>
                      <input 
                        type="text"
                        value={importSheetUrl}
                        onChange={(e) => setImportSheetUrl(e.target.value)}
                        placeholder="https://docs.google.com/spreadsheets/d/..."
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500"
                      />
                      <p className="text-[10px] text-slate-400 mt-1 font-medium">
                        * ตรวจสอบให้แน่ใจว่าลิงก์ถูกแชร์แบบ "ทุกคนที่มีลิงก์มีสิทธิ์อ่าน" (Anyone with link can view)
                      </p>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1.5">
                        ชื่อแผ่นงาน / ชีท (จะถูกใช้เป็นชื่อ Collection ใน Firestore)
                      </label>
                      <input 
                        type="text"
                        value={importSheetName}
                        onChange={(e) => setImportSheetName(e.target.value)}
                        placeholder="เช่น CRM, Tasks หรือชีทอื่นๆ"
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500"
                      />
                    </div>

                    {/* Shortcuts / Quick presets */}
                    <div>
                      <span className="block text-[10px] font-bold uppercase text-slate-400 mb-1.5">ชีทแนะนำทางด่วน:</span>
                      <div className="flex gap-2">
                        <button 
                          type="button"
                          onClick={() => setImportSheetName('CRM')}
                          className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all ${
                            importSheetName === 'CRM' 
                              ? 'bg-blue-600 text-white shadow-sm' 
                              : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                          }`}
                        >
                          CRM (ทะเบียนเกษตรกร)
                        </button>
                        <button 
                          type="button"
                          onClick={() => setImportSheetName('Tasks')}
                          className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all ${
                            importSheetName === 'Tasks' 
                              ? 'bg-blue-600 text-white shadow-sm' 
                              : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                          }`}
                        >
                          Tasks (คำขอ/งาน)
                        </button>
                      </div>
                    </div>

                    <div className="pt-4 border-t border-slate-100">
                      <button 
                        type="button"
                        disabled={isImporting}
                        onClick={handleImportSheet}
                        className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-extrabold rounded-2xl text-xs transition shadow-md shadow-blue-500/10 flex items-center justify-center gap-2 cursor-pointer"
                      >
                        {isImporting ? (
                          <>
                            <RefreshCw className="w-4 h-4 animate-spin" />
                            กำลังประมวลผลแปลงข้อมูลคลาวด์...
                          </>
                        ) : (
                          <>
                            <CloudUpload className="w-4 h-4" />
                            แปลง Sheet และบันทึกไปยัง Firestore
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                </div>

                {/* Rules & Info display panel */}
                <div className="lg:col-span-7 space-y-6">
                  
                  {/* Security Rules code block */}
                  <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-md text-white">
                    <div className="flex justify-between items-center border-b border-slate-800 pb-3 mb-4">
                      <h3 className="font-extrabold text-sm flex items-center gap-2 text-blue-400">
                        <ShieldCheck className="w-4 h-4 text-emerald-400" />
                        ความปลอดภัยและกฎการเข้าถึงคลาวด์ (Firestore Security Rules)
                      </h3>
                      <span className="bg-emerald-500/15 text-emerald-400 text-[9px] font-black uppercase px-2 py-0.5 rounded border border-emerald-500/20">
                        ผ่านการตรวจสอบ
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-300 mb-3 leading-relaxed font-medium">
                      นี่คือกฎสิทธิ์การเข้าถึงข้อมูล (Security Rules) ของฐานข้อมูล Firestore ในโครงการของคุณ 
                      คุณสามารถคัดลอกไฟล์กฎนี้ไปปรับปรุงในเมนู Rules บนหน้าคอนโซลของ Firebase ได้โดยตรง:
                    </p>

                    <div className="bg-slate-950 rounded-xl p-4 font-mono text-[10px] text-emerald-400/90 leading-normal overflow-x-auto border border-slate-800 shadow-inner">
                      <p>rules_version = '2';</p>
                      <p>service cloud.firestore &#123;</p>
                      <p className="pl-4">match /databases/&#123;database&#125;/documents &#123;</p>
                      <p className="pl-8 text-slate-500">// Rules for dynamic collections imported from Google Sheets (e.g. CRM, Tasks)</p>
                      <p className="pl-8">match /&#123;collectionName&#125;/&#123;documentId&#125; &#123;</p>
                      <p className="pl-12 text-blue-400">allow read, write: if true;</p>
                      <p className="pl-8">&#125;</p>
                      <p className="pl-4">&#125;</p>
                      <p>&#125;</p>
                    </div>
                    
                    <p className="text-[10px] text-amber-400 font-semibold mt-3 flex items-center gap-1.5">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      คำแนะนำ: ในการใช้งานระดับโปรดักชันจริง สามารถเปลี่ยนสิทธิ์ "if true" เป็น "if request.auth != null" เพื่อความปลอดภัยสูงสุดได้
                    </p>
                  </div>

                  {/* Dynamic Migration Result Logs */}
                  {importResult && (
                    <div className={`rounded-3xl p-6 border shadow-sm animate-fade-in ${
                      importResult.success 
                        ? 'bg-emerald-50/50 border-emerald-200 text-emerald-950' 
                        : 'bg-rose-50/50 border-rose-200 text-rose-950'
                    }`}>
                      <div className="flex items-center gap-2 mb-3">
                        {importResult.success ? (
                          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                        ) : (
                          <XCircle className="w-5 h-5 text-rose-600 shrink-0" />
                        )}
                        <h4 className="font-extrabold text-sm">
                          {importResult.success ? 'สถานะ: การแปลงข้อมูลคลาวด์สำเร็จ!' : 'สถานะ: เกิดข้อผิดพลาดในการประมวลผล'}
                        </h4>
                      </div>

                      <p className="text-xs font-semibold leading-relaxed mb-4">
                        {importResult.message}
                      </p>

                      {importResult.success && importResult.preview && importResult.preview.length > 0 && (
                        <div className="space-y-2">
                          <span className="block text-[10px] font-bold uppercase text-slate-500">
                            ตัวอย่างข้อมูลแถวแรกๆ ที่แปลงลง Firestore (Preview Top 5 Records):
                          </span>
                          <div className="bg-slate-900 rounded-xl p-4 font-mono text-[9px] text-slate-300 leading-normal max-h-48 overflow-y-auto border border-slate-800 shadow-inner">
                            <pre>{JSON.stringify(importResult.preview, null, 2)}</pre>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                </div>

              </div>

            </div>
          )}

        </div>
      </main>

      {/* ============================================== */}
      {/* 8. MODAL OVERLAY (FOR INTERACTIVE ACTIONS)     */}
      {/* ============================================== */}
      {selectedModal && (
        <div 
          onClick={() => setSelectedModal(null)}
          className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in"
        >
          
          {/* A. Flooded Crop Claim Review Modal */}
          {selectedModal === 'claim' && (
            <div 
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-lg overflow-hidden animate-scale-up"
            >
              {/* Header */}
              <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                <h3 className="font-extrabold text-slate-900 text-sm">ตรวจสอบเอกสารเคลมประกันภัยพืชผลจาก Face ID App</h3>
                <button 
                  onClick={() => setSelectedModal(null)}
                  className="text-slate-400 hover:text-slate-600 p-1 rounded-lg transition"
                >
                  <XCircle className="w-5 h-5" />
                </button>
              </div>

              {/* Photo & GPS */}
              <div className="p-6 space-y-4">
                <div className="w-full h-52 bg-slate-100 rounded-xl overflow-hidden relative border border-slate-200/60">
                  <img 
                    src="https://images.unsplash.com/photo-1585421514738-01798e348b17?auto=format&fit=crop&w=600&q=80" 
                    alt="Damaged Farm Crop" 
                    className="w-full h-full object-cover" 
                  />
                  <div className="absolute bottom-3 left-3 bg-slate-950/70 border border-white/10 text-white text-[9px] px-2.5 py-1 rounded-lg backdrop-blur flex items-center gap-1.5 font-bold">
                    <MapPin className="w-3.5 h-3.5 text-blue-400" />
                    <span>GPS: 18.9123 N, 98.9234 E (ตรงพิกัดแปลงรับประกัน 100%)</span>
                  </div>
                </div>

                {/* AI Review Status */}
                <div className="bg-rose-50 border border-rose-100 text-rose-800 p-4 rounded-xl space-y-1 text-xs">
                  <p className="font-extrabold flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-rose-500" />
                    สรุปวิเคราะห์เบื้องต้นด้วยระบบ AI (Sentinel Satellite + Drone)
                  </p>
                  <p className="leading-relaxed font-semibold">
                    ตรวจพบคราบน้ำขังในพื้นที่ต่ำแปลงสตรอว์เบอร์รี่เป้าหมายต่อเนื่องเป็นวันที่ 4 ความน่าจะเป็นน้ำท่วมเสียหายจริง 92% แนะนำอนุมัติจ่ายชดเชยเร่งด่วนตามเงื่อนไขภัยน้ำท่วมปี 2569
                  </p>
                </div>

                <div className="space-y-2 text-xs font-semibold text-slate-600 border-t border-slate-100 pt-4">
                  <p><span className="text-slate-400">ชื่อผู้ขอเคลมประกันภัย:</span> นายสมชาย ใจดี (สมาชิกดีเด่น เกรด A)</p>
                  <p><span className="text-slate-400">เลขที่กรมธรรม์คุ้มครองภัยพืชผล:</span> #INS-2026-8892 (ต.แม่ริม)</p>
                  <p><span className="text-slate-400">ประมาณการเงินชดเชยคุ้มครอง:</span> <span className="text-emerald-600 font-extrabold">฿ 50,000 บาท</span></p>
                </div>

                {/* Form Buttons */}
                <div className="flex gap-3 pt-2">
                  <button 
                    onClick={() => {
                      triggerToast('ส่งกลับใบเคลมเพื่อให้สมชายส่งหลักฐานหรือรูปเพิ่มเติมทางแอป', 'warning');
                      setSelectedModal(null);
                    }}
                    className="flex-1 py-2.5 border border-rose-200 text-rose-600 font-bold rounded-xl hover:bg-rose-50 transition text-xs"
                  >
                    ปฏิเสธ / ขอเอกสารเพิ่ม
                  </button>
                  <button 
                    onClick={() => {
                      handleApproveTask('REF-INS-2401', 'อนุมัติจ่ายประกันภัยชดเชยภัยน้ำท่วม 50,000 บาท เข้าสมาร์ทบัญชี ธ.ก.ส. นายสมชาย เรียบร้อย!');
                      setSelectedModal(null);
                    }}
                    className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-xl transition text-xs shadow-sm"
                  >
                    อนุมัติสั่งโอนเงินชดเชย ธ.ก.ส.
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* B. Deep CRM Member Detail Ledger Modal */}
          {selectedModal === 'member' && selectedMemberProfile && (
            <div 
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col h-[85vh] animate-scale-up"
            >
              {/* Header info */}
              <div className="p-5 border-b border-slate-100 bg-slate-900 text-white shrink-0 flex justify-between items-center">
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-full bg-slate-800 text-white flex items-center justify-center font-black text-sm">
                    {selectedMemberProfile.name.charAt(3)}
                  </div>
                  <div>
                    <h3 className="font-extrabold text-md tracking-tight">{selectedMemberProfile.name}</h3>
                    <p className="text-[11px] text-slate-400 font-bold uppercase mt-0.5">ID: {selectedMemberProfile.id} • สมาชิกประเภทสามัญตั้งแต่ปี 2565</p>
                  </div>
                </div>
                <button 
                  onClick={() => setSelectedModal(null)}
                  className="text-slate-400 hover:text-white p-1 rounded-lg transition"
                >
                  <XCircle className="w-6 h-6" />
                </button>
              </div>

              {/* Scrollable details ledger */}
              <div className="flex-1 overflow-y-auto p-6 bg-slate-50 space-y-6">
                
                {/* Financial overview stats inside CRM */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200/60">
                    <p className="text-[9px] text-slate-400 font-extrabold uppercase tracking-wider mb-1">ความน่าเชื่อถือสมุดเกษตรกร (Credit Limit)</p>
                    <div className="flex items-end">
                      <span className="text-3xl font-black text-emerald-600 mr-2">{selectedMemberProfile.score}</span>
                      <span className="text-xs text-slate-400 pb-1 font-semibold">วงเงินกู้สูงสุดที่ขอได้ 150,000 บ.</span>
                    </div>
                  </div>

                  <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200/60">
                    <p className="text-[9px] text-slate-400 font-extrabold uppercase tracking-wider mb-1">ยอดใช้เงินกู้คงค้าง (O/D Outstanding)</p>
                    <h4 className="text-2xl font-black text-slate-950">฿ {selectedMemberProfile.debt.toLocaleString()}</h4>
                    <p className="text-[10px] text-emerald-600 font-bold mt-1">ประวัติส่งผลผลิตตามกำหนดครบถ้วน 100%</p>
                  </div>
                </div>

                {/* Crop Field Ledger Traceability Timeline */}
                <div>
                  <h4 className="font-extrabold text-slate-900 text-xs uppercase tracking-wider mb-3.5 border-b border-slate-200 pb-2 flex items-center justify-between">
                    <span>สมุดบันทึกสิทธิ์และแปลงเกษตรกรรมอัจฉริยะ</span>
                    <span className="text-[9px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded border border-emerald-100">GAP Certified</span>
                  </h4>

                  <div className="bg-white rounded-xl shadow-sm border border-slate-200/60 p-4 space-y-4 text-xs">
                    <div>
                      <p className="font-bold text-slate-900 text-sm">สตรอว์เบอร์รี พันธุ์ 80 ปลอดสารอินทรีย์เคมี (แปลง 1 • พื้นที่ 5 ไร่)</p>
                      <p className="text-[10px] text-slate-400 font-semibold mt-0.5">ประมาณผลผลิตรอบเก็บเกี่ยวเดือนสิงหาคมนี้: 1,200 กิโลกรัม</p>
                    </div>

                    {/* Timeline Tracker list */}
                    <div className="relative border-l-2 border-blue-500 pl-4 ml-2 space-y-4 py-2 font-semibold text-xs text-slate-600">
                      <div className="relative">
                        <span className="absolute -left-5.5 top-1.5 w-2.5 h-2.5 rounded-full bg-blue-500 border-2 border-white"></span>
                        <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                          <p className="font-bold text-slate-950">บันทึกพ่นชีวสารปรับปรุงหน้าดิน (pH ดิน 6.5)</p>
                          <time className="text-[9px] text-blue-600 block mt-1">10 พ.ย. 66 ผ่านแอพพลิเคชัน</time>
                        </div>
                      </div>

                      <div className="relative">
                        <span className="absolute -left-5.5 top-1.5 w-2.5 h-2.5 rounded-full bg-slate-400 border-2 border-white"></span>
                        <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                          <p className="text-slate-500">บันทึกลงแปลงต้นกล้าสตรอว์เบอร์รีล็อตนำร่อง</p>
                          <time className="text-[9px] text-slate-400 block mt-1">12 ต.ค. 66 ผ่านเจ้าหน้าที่ศูนย์ย่อย</time>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Dynamic logs list of transactions */}
                <div>
                  <h4 className="font-extrabold text-slate-900 text-xs uppercase tracking-wider mb-2.5 border-b border-slate-200 pb-2">ประวัติธุรกรรมและใช้สิทธิแชร์ริ่งย้อนหลัง</h4>
                  <ul className="text-[11px] text-slate-600 space-y-2 font-semibold">
                    <li className="flex justify-between p-2 bg-white rounded-lg border border-slate-150">
                      <span>• จองเช่าโดรนพ่นปุ๋ยมัลติสเปกตรัม DJI #DR-01 (4 ชม.)</span>
                      <span className="text-slate-400">20 มิ.ย. 67</span>
                    </li>
                    <li className="flex justify-between p-2 bg-white rounded-lg border border-slate-150">
                      <span>• ซื้อปุ๋ยเคมีบำรุงสูตรพิเศษผ่านเครือสหกรณ์ (ตัดงบ BNPL ฿8,500)</span>
                      <span className="text-slate-400">15 มิ.ย. 67</span>
                    </li>
                    <li className="flex justify-between p-2 bg-white rounded-lg border border-slate-150">
                      <span>• ยื่นขออนุมัติเคลมสิทธิประกันภัยภัยธรรมชาติรอบแปลง 1</span>
                      <span className="text-slate-400">10 มิ.ย. 67</span>
                    </li>
                  </ul>
                </div>

              </div>

              {/* CRM modal footer */}
              <div className="p-4 bg-white border-t border-slate-100 flex justify-between items-center shrink-0">
                <button 
                  onClick={() => handleDeleteMember(selectedMemberProfile.id)}
                  className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  ลบสมาชิก
                </button>

                <div className="flex gap-2">
                  <button 
                    onClick={() => {
                      setMemberFormType('edit');
                      setMemberFormValue({ ...selectedMemberProfile });
                      setMemberFormOpen(true);
                    }}
                    className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                  >
                    <Edit className="w-3.5 h-3.5" />
                    แก้ไขข้อมูล
                  </button>

                  <button 
                    onClick={() => {
                      setSelectedModal(null);
                      setCurrentView('chat');
                      triggerToast(`เลือกสวิตช์หน้าต่างเพื่อส่งแชทแนะนำโดยตรงหา ${selectedMemberProfile.name} แล้ว`, 'info');
                    }}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition shadow-sm cursor-pointer"
                  >
                    ส่งข้อความ/ปรึกษาทางแชทโดยตรง
                  </button>
                </div>
              </div>

            </div>
          )}

        </div>
      )}

      {/* C. Member CRUD Form Modal (Add / Edit) */}
      {memberFormOpen && (
        <div 
          onClick={() => setMemberFormOpen(false)}
          className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4 z-55 animate-fade-in"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-md overflow-hidden animate-scale-up"
          >
            {/* Header */}
            <div className="p-4 border-b border-slate-100 bg-slate-900 text-white flex justify-between items-center">
              <h3 className="font-extrabold text-sm flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-blue-400" />
                {memberFormType === 'add' ? 'เพิ่มทะเบียนสมาชิกใหม่' : `แก้ไขข้อมูลสมาชิก: ${memberFormValue.name}`}
              </h3>
              <button 
                onClick={() => setMemberFormOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg transition cursor-pointer"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            {/* Form Fields */}
            <form onSubmit={(e) => {
              e.preventDefault();
              if (!memberFormValue.name) {
                alert('กรุณากรอกชื่อสมาชิก');
                return;
              }
              if (memberFormType === 'add') {
                handleCreateMember(memberFormValue);
              } else {
                handleUpdateMember(memberFormValue.id!, memberFormValue);
              }
            }} className="p-6 space-y-4">
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">รหัสสมาชิก (ID)</label>
                  <input 
                    type="text"
                    disabled={memberFormType === 'edit'}
                    value={memberFormValue.id || ''}
                    onChange={(e) => setMemberFormValue(prev => ({ ...prev, id: e.target.value }))}
                    placeholder="KST-XXXXX"
                    className="w-full px-3.5 py-2 bg-slate-50 disabled:bg-slate-100 disabled:text-slate-500 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 font-bold"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">คะแนน (Agri-Score)</label>
                  <select
                    value={memberFormValue.score || 'B'}
                    onChange={(e) => setMemberFormValue(prev => ({ ...prev, score: e.target.value }))}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 font-bold"
                  >
                    <option value="A">A (ดีเยี่ยม)</option>
                    <option value="B+">B+ (ดีมาก)</option>
                    <option value="B">B (ดี)</option>
                    <option value="C">C (พอใช้)</option>
                    <option value="D">D (ต้องปรับปรุง)</option>
                    <option value="F">F (เสี่ยงสูง)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">ชื่อ-นามสกุล สมาชิก</label>
                <input 
                  type="text"
                  required
                  value={memberFormValue.name || ''}
                  onChange={(e) => setMemberFormValue(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="เช่น นายสมชาย ใจดี"
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 font-semibold text-slate-800"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">พืชผลหลักที่ปลูก</label>
                <input 
                  type="text"
                  required
                  value={memberFormValue.crops || ''}
                  onChange={(e) => setMemberFormValue(prev => ({ ...prev, crops: e.target.value }))}
                  placeholder="เช่น สตรอว์เบอร์รี, ลำไย"
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 font-semibold text-slate-800"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">พื้นที่และที่อยู่แปลง</label>
                <input 
                  type="text"
                  required
                  value={memberFormValue.area || ''}
                  onChange={(e) => setMemberFormValue(prev => ({ ...prev, area: e.target.value }))}
                  placeholder="เช่น 15 ไร่ (ต.แม่ริม)"
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 font-semibold text-slate-800"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">ยอดใช้เงินกู้คงค้าง (ยอดหนี้ O/D ในระบบ)</label>
                <input 
                  type="number"
                  required
                  value={memberFormValue.debt === 0 ? '' : memberFormValue.debt}
                  onChange={(e) => setMemberFormValue(prev => ({ ...prev, debt: parseInt(e.target.value) || 0 }))}
                  placeholder="เช่น 24500"
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 font-bold text-slate-800"
                />
              </div>

              {/* Footer Actions */}
              <div className="pt-4 border-t border-slate-100 flex justify-end gap-2.5">
                <button 
                  type="button"
                  onClick={() => setMemberFormOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button 
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-extrabold transition shadow-md cursor-pointer"
                >
                  {memberFormType === 'add' ? 'เพิ่มสมาชิก' : 'บันทึกการแก้ไข'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}
