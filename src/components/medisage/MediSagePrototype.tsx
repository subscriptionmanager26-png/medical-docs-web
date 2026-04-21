"use client";

import React, { useState, useEffect, useRef } from "react";
import type { LucideIcon } from "lucide-react";
import {
  Home,
  Folder,
  Activity,
  MessageCircle,
  Stethoscope,
  Search,
  Plus,
  FileText,
  Pill,
  FileStack,
  Send,
  CheckCircle2,
  Loader2,
  Microscope,
  ScanFace,
  ChevronRight,
  Droplets,
  HeartPulse,
  AlertCircle,
  CalendarPlus,
  ShoppingBag,
  ChevronLeft,
} from "lucide-react";

// --- DESIGN SYSTEM CONSTANTS (Clean + Calm + Modern) ---

const APP_BG = "bg-[#FFFFFF]";

const CARD_SURFACE = "bg-[#FFFFFF] shadow-[0_4px_16px_rgba(0,0,0,0.04)] border border-[#E5E7EB] rounded-[24px]";

const INSET_SURFACE = "bg-[#FAFAFA] border border-[#E5E7EB] rounded-[16px]";

const BTN_PRIMARY = "bg-[#FF7A00] text-white rounded-[16px] hover:bg-[#E66E00] active:scale-[0.98] transition-transform flex items-center justify-center";

const BTN_SECONDARY = "bg-[#FFFFFF] border border-[#E5E7EB] text-[#1A1A1A] rounded-[16px] active:scale-[0.98] transition-transform flex items-center justify-center shadow-sm";

const TEXT_PRIMARY = "text-[#1A1A1A]";

const TEXT_SECONDARY = "text-[#6B7280]";

// Accent Colors

const COLOR_ACCENT = "#FF7A00";

const COLOR_SUCCESS = "#22C55E";

const COLOR_WARNING = "#F59E0B";

const COLOR_URGENT = "#EF4444";

// --- MOCK DATA ---

const MOCK_FILES = [

 { id: 1, title: 'Complete Blood Count (CBC)', date: 'Oct 12', folder: 'Blood', type: 'pdf', icon: Droplets },

 { id: 4, title: 'Lipid Panel Results', date: 'Oct 12', folder: 'Blood', type: 'pdf', icon: Droplets },

 { id: 2, title: 'Dr. Sharma - General Checkup', date: 'Sep 28', folder: 'Rx', type: 'image', icon: Pill },

 { id: 3, title: 'Chest X-Ray Report', date: 'Jul 15', folder: 'X-Rays', type: 'image', icon: ScanFace },

];

const VAULT_CATEGORIES = [

 { name: 'Blood', icon: Droplets, count: 12 },

 { name: 'Heart', icon: HeartPulse, count: 5 },

 { name: 'X-Rays', icon: ScanFace, count: 4 },

 { name: 'Rx', icon: Pill, count: 8 },

];

const BIOMARKERS = [

 { id: 4, section: 'Urgent Review', category: 'Cardiac', name: 'Troponin T', value: '0.4 ng/mL', status: 'High', statusColor: `bg-[${COLOR_URGENT}]`, strokeEnd: COLOR_URGENT, points: "0,30 30,10 60,35 100,5" },

 { id: 3, section: 'Attention Needed', category: 'Hormones', name: 'Vitamin D, 25-OH', value: '24 ng/mL', status: 'Low', statusColor: `bg-[${COLOR_WARNING}]`, strokeEnd: COLOR_WARNING, points: "0,10 30,15 60,30 100,35" },

 { id: 1, section: 'Normal', category: 'Lipid Panel', name: 'Apolipoprotein A1', value: '170 mg/dL', status: 'Optimal', statusColor: `bg-[${COLOR_SUCCESS}]`, strokeEnd: COLOR_SUCCESS, points: "0,35 30,20 60,30 100,10" },

 { id: 2, section: 'Normal', category: 'Metabolic', name: 'Glucose (Fasting)', value: '88 mg/dL', status: 'Optimal', statusColor: `bg-[${COLOR_SUCCESS}]`, strokeEnd: COLOR_SUCCESS, points: "0,15 35,25 65,20 100,20" },

] as const;

type BiomarkerRow = (typeof BIOMARKERS)[number];

// Custom SVG Sparkline Component

const Sparkline = ({ points, endColor }: { points: string; endColor: string }) => (

 <svg width="80" height="40" viewBox="0 0 100 40" className="overflow-visible">

 <defs>

 <linearGradient id={`grad-${endColor}`} x1="0" y1="0" x2="1" y2="0">

 <stop offset="0%" stopColor="#E5E7EB" />

 <stop offset="100%" stopColor={endColor} />

 </linearGradient>

 </defs>

 <polyline points={points} fill="none" stroke={`url(#grad-${endColor})`} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

 {points.split(' ').map((point, idx, arr) => {

 const [cx, cy] = point.split(',');

 const isLast = idx === arr.length - 1;

 return (

 <circle

 key={idx} cx={cx} cy={cy} r="3.5"

 fill={isLast ? endColor : "#FFFFFF"}

 stroke={isLast ? "none" : (idx === 0 ? "#E5E7EB" : endColor)}

 strokeWidth={isLast ? "0" : "2"}

 />

 );

 })}

 </svg>

);

type PrototypeChatMessage = { role: string; text: string; citation?: string };
type PrototypeChat = { id: number; title: string; date: string; messages: PrototypeChatMessage[] };

export default function MediSagePrototype() {

 const [activeTab, setActiveTab] = useState('home');

 const [files, setFiles] = useState(MOCK_FILES);

 const [isUploading, setIsUploading] = useState(false);

 const [uploadStep, setUploadStep] = useState(0);

 // Navigation States

 const [activeChatId, setActiveChatId] = useState<number | null>(null);

 const [activeFolder, setActiveFolder] = useState<string | null>(null);

 const [chats, setChats] = useState<PrototypeChat[]>([

 { id: 1, title: 'Lipid Panel Review', date: 'Today', messages: [{ role: 'ai', text: 'Your recent Lipid Panel shows an optimal Apolipoprotein A1 level of 170 mg/dL. This indicates excellent cardiovascular health.', citation: 'Lipid Panel - Oct 12' }] },

 { id: 2, title: 'General Health Query', date: 'Yesterday', messages: [{ role: 'ai', text: 'Hello Alex. I am your MediSage AI. I can summarize your reports or track your health history. How can I help you today?' }] }

 ]);

 const [chatInput, setChatInput] = useState('');

 const chatEndRef = useRef<HTMLDivElement | null>(null);

 useEffect(() => {

 chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });

 }, [chats, activeChatId, activeTab]);

 const handleUploadClick = () => {

 setIsUploading(true);

 setUploadStep(0);

 setTimeout(() => setUploadStep(1), 1500);

 setTimeout(() => setUploadStep(2), 3000);

 setTimeout(() => {

 setUploadStep(3);

 const newFile = {

 id: Date.now(), title: 'Thyroid Panel Results', date: 'Just now', folder: 'Blood', type: 'pdf', icon: Droplets,

 };

 setFiles([newFile, ...files]);

 setTimeout(() => setIsUploading(false), 1500);

 }, 4500);

 };

 const createNewChat = () => {

 const newChat = {

 id: Date.now(),

 title: 'New Conversation',

 date: 'Just now',

 messages: [{ role: 'ai', text: 'Hello! How can I assist you with your health today?' }]

 };

 setChats([newChat, ...chats]);

 setActiveChatId(newChat.id);

 };

 const handleSendMessage = () => {

 if (!chatInput.trim() || !activeChatId) return;

 const updatedChats = chats.map(chat => {

 if (chat.id === activeChatId) {

 const newMessages = [...chat.messages, { role: 'user', text: chatInput }];

 let newTitle = chat.title;

 if (chat.title === 'New Conversation') {

 newTitle = chatInput.length > 22 ? chatInput.substring(0, 22) + '...' : chatInput;

 }

 return { ...chat, title: newTitle, messages: newMessages };

 }

 return chat;

 });

 setChats(updatedChats);

 setChatInput('');

 setTimeout(() => {

 setChats(currentChats => currentChats.map(chat => {

 if (chat.id === activeChatId) {

 return {

 ...chat,

 messages: [...chat.messages, { role: 'ai', text: 'Based on your latest records, your markers appear stable. Is there a specific document or test you would like me to review?' }]

 };

 }

 return chat;

 }));

 }, 1200);

 };

 const getHeaderContent = () => {

 if (activeTab === 'home') return { title: 'MediSage', subtitle: 'Good morning, Alex', showAvatar: true };

 if (activeTab === 'vault') {

 if (activeFolder) return { title: activeFolder, subtitle: 'Folder View', showBack: true };

 return { title: 'Data Vault', subtitle: 'Manage your medical records' };

 }

 if (activeTab === 'vitals') return { title: 'Health Vitals', subtitle: 'Track your biomarkers' };

 if (activeTab === 'services') return { title: 'Health Services', subtitle: 'Bookings & Medicine' };

 if (activeTab === 'chat') {

 if (activeChatId) {

 const chat = chats.find(c => c.id === activeChatId);

 return { title: chat?.title || 'Chat', subtitle: 'AI Assistant', showBack: true };

 }

 return { title: 'Health AI', subtitle: 'Your conversations' };

 }

 return { title: '', subtitle: '' };

 };

 const headerInfo = getHeaderContent();

 // Vitals Grouping

 const urgentVitals = BIOMARKERS.filter(b => b.section === 'Urgent Review');

 const attentionVitals = BIOMARKERS.filter(b => b.section === 'Attention Needed');

 const normalVitals = BIOMARKERS.filter(b => b.section === 'Normal');

 return (

 <div className={`flex justify-center items-center w-full min-h-screen bg-[#E5E7EB] sm:p-8 font-['Inter',sans-serif]`}>

 <style>

 {`@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');`}

 </style>

 {/* Mobile Device Container */}

 <div className={`w-full max-w-[400px] h-[100dvh] sm:h-[850px] ${APP_BG} sm:rounded-[40px] shadow-2xl relative overflow-hidden flex flex-col sm:border-[8px] border-gray-900`}>

 {/* Header */}

 <header className={`px-5 pt-12 pb-4 flex items-center justify-between sticky top-0 z-10 ${APP_BG}/95 backdrop-blur-md border-b border-[#E5E7EB]`}>

 <div className="flex items-center gap-4">

 {headerInfo.showAvatar && (

 <div className={`w-10 h-10 ${BTN_SECONDARY} !rounded-full`}>

 <span className={`text-[14px] font-semibold ${TEXT_PRIMARY}`}>AL</span>

 </div>

 )}

 {headerInfo.showBack && (

 <button onClick={() => {

 if (activeChatId) setActiveChatId(null);

 else if (activeFolder) setActiveFolder(null);

 }} className={`w-10 h-10 ${BTN_SECONDARY} !rounded-full`}>

 <ChevronLeft size={20} className={TEXT_PRIMARY} />

 </button>

 )}

 <div className="flex flex-col">

 <h1 className={`text-[24px] font-semibold ${TEXT_PRIMARY} leading-tight`}>

 {headerInfo.title}

 </h1>

 <p className={`text-[14px] ${TEXT_SECONDARY} font-medium`}>{headerInfo.subtitle}</p>

 </div>

 </div>

 </header>

 {/* Main Content Area */}

 <main className="flex-1 overflow-y-auto pb-32 scroll-smooth px-4 pt-6 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:'none'] [scrollbar-width:'none']">

 {/* HOME TAB */}

 {activeTab === 'home' && (

 <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">

 {/* Markers Summary */}

 <div className={`${CARD_SURFACE} p-5`}>

 <h3 className={`font-semibold ${TEXT_PRIMARY} text-[16px] mb-4`}>Health Markers Summary</h3>

 <div className="flex gap-4">

 <div className={`flex-1 ${INSET_SURFACE} p-4 flex flex-col items-center justify-center`}>

 <span className="text-[24px] font-semibold text-[#22C55E]">14</span>

 <span className={`text-[12px] font-medium ${TEXT_SECONDARY} mt-1`}>Optimal</span>

 </div>

 <div className={`flex-1 ${INSET_SURFACE} p-4 flex flex-col items-center justify-center`}>

 <span className="text-[24px] font-semibold text-[#F59E0B]">2</span>

 <span className={`text-[12px] font-medium ${TEXT_SECONDARY} mt-1`}>Attention</span>

 </div>

 </div>

 </div>

 {/* Quick Upload Action */}

 <div

 onClick={handleUploadClick}

 className={`${CARD_SURFACE} p-4 flex items-center justify-between cursor-pointer active:scale-[0.98] transition-transform`}

 >

 <div className="flex items-center gap-4">

 <div className={`w-12 h-12 flex items-center justify-center bg-[#FF7A00]/10 rounded-[16px]`}>

 <Plus size={24} className="text-[#FF7A00]" />

 </div>

 <div>

 <h4 className={`font-semibold ${TEXT_PRIMARY} text-[16px]`}>Upload Document</h4>

 <p className={`text-[14px] ${TEXT_SECONDARY} mt-0.5`}>Auto-sort and extract with AI</p>

 </div>

 </div>

 <ChevronRight size={20} className="#E5E7EB" />

 </div>

 {/* Upcoming Actions */}

 <div>

 <h3 className={`font-semibold ${TEXT_PRIMARY} text-[20px] mb-4 pl-1`}>Upcoming Actions</h3>

 <div className="space-y-3">

 <div className={`${CARD_SURFACE} p-4 flex items-center gap-4`}>

 <div className={`w-12 h-12 flex items-center justify-center ${INSET_SURFACE}`}>

 <AlertCircle size={20} className="text-[#F59E0B]" />

 </div>

 <div className="flex-1">

 <h4 className={`font-medium ${TEXT_PRIMARY} text-[16px]`}>Take Vitamin D</h4>

 <p className={`text-[14px] ${TEXT_SECONDARY} mt-0.5`}>Daily • With Breakfast</p>

 </div>

 <button className={`w-8 h-8 flex items-center justify-center rounded-full border border-[#E5E7EB] bg-white`}>

 <CheckCircle2 size={18} className="text-[#E5E7EB]" />

 </button>

 </div>

 <div className={`${CARD_SURFACE} p-4 flex items-center gap-4`}>

 <div className={`w-12 h-12 flex items-center justify-center ${INSET_SURFACE}`}>

 <Droplets size={20} className={TEXT_SECONDARY} />

 </div>

 <div className="flex-1">

 <h4 className={`font-medium ${TEXT_PRIMARY} text-[16px]`}>Fasting Blood Sugar</h4>

 <p className={`text-[14px] ${TEXT_SECONDARY} mt-0.5`}>Tomorrow • 8:00 AM</p>

 </div>

 </div>

 </div>

 </div>

 </div>

 )}

 {/* VAULT TAB */}

 {activeTab === 'vault' && (

 <div className="animate-in fade-in duration-300">

 {!activeFolder ? (

 <div className="space-y-8">

 {/* Category Bifurcation */}

 <div className="grid grid-cols-2 gap-4">

 {VAULT_CATEGORIES.map((cat, idx) => (

 <div

 key={idx}

 onClick={() => setActiveFolder(cat.name)}

 className={`${CARD_SURFACE} p-4 flex flex-col items-center justify-center gap-3 cursor-pointer active:scale-[0.98] transition-transform`}

 >

 <div className={`w-12 h-12 rounded-full flex items-center justify-center ${INSET_SURFACE}`}>

 <cat.icon size={20} className={TEXT_SECONDARY} />

 </div>

 <div className="text-center">

 <h4 className={`font-medium ${TEXT_PRIMARY} text-[16px]`}>{cat.name}</h4>

 <p className={`text-[14px] ${TEXT_SECONDARY} mt-0.5`}>{cat.count} Files</p>

 </div>

 </div>

 ))}

 </div>

 {/* Recent Files List */}

 <div>

 <div className="flex items-center justify-between mb-4 pl-1">

 <h3 className={`font-semibold ${TEXT_PRIMARY} text-[20px]`}>Recent Documents</h3>

 </div>

 <div className="space-y-3">

 {files.slice(0, 3).map((file) => (

 <div key={file.id} className={`${CARD_SURFACE} p-4 flex items-center gap-4 cursor-pointer active:scale-[0.98] transition-transform`}>

 <div className={`w-12 h-12 flex items-center justify-center ${INSET_SURFACE}`}>

 <file.icon size={20} className={TEXT_SECONDARY} />

 </div>

 <div className="flex-1 min-w-0">

 <h4 className={`font-medium ${TEXT_PRIMARY} text-[16px] truncate`}>{file.title}</h4>

 <p className={`text-[14px] ${TEXT_SECONDARY} mt-0.5`}>{file.date} • {file.folder}</p>

 </div>

 <ChevronRight size={20} className="#E5E7EB" />

 </div>

 ))}

 </div>

 </div>

 </div>

 ) : (

 /* Inside Folder View */

 <div className="space-y-3 animate-in slide-in-from-right-4 duration-300">

 {files.filter(f => f.folder === activeFolder).length > 0 ? (

 files.filter(f => f.folder === activeFolder).map((file) => (

 <div key={file.id} className={`${CARD_SURFACE} p-4 flex items-center gap-4 cursor-pointer active:scale-[0.98] transition-transform`}>

 <div className={`w-12 h-12 flex items-center justify-center ${INSET_SURFACE}`}>

 <file.icon size={20} className={TEXT_SECONDARY} />

 </div>

 <div className="flex-1 min-w-0">

 <h4 className={`font-medium ${TEXT_PRIMARY} text-[16px] truncate`}>{file.title}</h4>

 <p className={`text-[14px] ${TEXT_SECONDARY} mt-0.5`}>{file.date}</p>

 </div>

 <ChevronRight size={20} className="#E5E7EB" />

 </div>

 ))

 ) : (

 <div className="text-center py-12">

 <Folder size={48} className={`${TEXT_SECONDARY} mx-auto mb-4 opacity-50`} />

 <h3 className={`text-[16px] font-medium ${TEXT_PRIMARY}`}>No files here yet</h3>

 <p className={`text-[14px] ${TEXT_SECONDARY} mt-1`}>Upload documents to categorize them.</p>

 </div>

 )}

 </div>

 )}

 </div>

 )}

 {/* VITALS TAB */}

 {activeTab === 'vitals' && (

 <div className="space-y-8 animate-in fade-in duration-300">

 {/* Summary Cards */}

 <div className="flex gap-3">

 <div className={`flex-1 ${INSET_SURFACE} p-3 flex flex-col items-center justify-center`}>

 <span className={`text-[20px] font-semibold text-[${COLOR_URGENT}]`}>{urgentVitals.length}</span>

 <span className={`text-[12px] font-medium ${TEXT_SECONDARY} mt-1`}>Urgent</span>

 </div>

 <div className={`flex-1 ${INSET_SURFACE} p-3 flex flex-col items-center justify-center`}>

 <span className={`text-[20px] font-semibold text-[${COLOR_WARNING}]`}>{attentionVitals.length}</span>

 <span className={`text-[12px] font-medium ${TEXT_SECONDARY} mt-1`}>Attention</span>

 </div>

 <div className={`flex-1 ${INSET_SURFACE} p-3 flex flex-col items-center justify-center`}>

 <span className={`text-[20px] font-semibold text-[${COLOR_SUCCESS}]`}>{normalVitals.length}</span>

 <span className={`text-[12px] font-medium ${TEXT_SECONDARY} mt-1`}>Normal</span>

 </div>

 </div>

 {/* Vitals Rendering Function */}

 {(() => {

 const renderSection = (
 title: string,
 data: readonly BiomarkerRow[],
 iconColorClass: string,
 ) => {

 if (data.length === 0) return null;

 return (

 <div className="mb-6">

 <h3 className={`font-semibold ${TEXT_PRIMARY} text-[20px] mb-4 pl-1 flex items-center gap-2`}>

 <span className={`w-2 h-2 rounded-full ${iconColorClass}`}></span>

 {title}

 </h3>

 <div className="space-y-4">

 {data.map((biomarker) => (

 <div key={biomarker.id} className={`${CARD_SURFACE} p-5 flex items-center justify-between`}>

 <div className="flex-1">

 <h4 className={`font-medium text-[14px] ${TEXT_SECONDARY} mb-1`}>{biomarker.category}</h4>

 <h3 className={`font-semibold ${TEXT_PRIMARY} text-[20px] mb-3`}>{biomarker.name}</h3>

 <div className="flex flex-wrap gap-2">

 <span className={`flex items-center gap-1.5 px-3 py-1 bg-[#FAFAFA] border border-[#E5E7EB] rounded-[12px] text-[14px] font-medium ${TEXT_PRIMARY}`}>

 <span className={`w-2 h-2 rounded-full ${biomarker.statusColor}`}></span>

 {biomarker.status}

 </span>

 <span className={`flex items-center px-3 py-1 bg-[#FAFAFA] border border-[#E5E7EB] rounded-[12px] text-[14px] font-medium ${TEXT_PRIMARY}`}>

 {biomarker.value}

 </span>

 </div>

 </div>

 <div className="w-[80px] flex justify-end pl-2">

 <Sparkline points={biomarker.points} endColor={biomarker.strokeEnd} />

 </div>

 </div>

 ))}

 </div>

 </div>

 );

 };

 return (

 <div>

 {renderSection('Urgent Review', urgentVitals, `bg-[${COLOR_URGENT}]`)}

 {renderSection('Attention Needed', attentionVitals, `bg-[${COLOR_WARNING}]`)}

 {renderSection('Normal', normalVitals, `bg-[${COLOR_SUCCESS}]`)}

 </div>

 );

 })()}

 </div>

 )}

 {/* CHAT TAB (AI) */}

 {activeTab === 'chat' && (

 <div className="animate-in fade-in duration-300">

 {!activeChatId ? (

 <div className="space-y-6">

 <div className="flex items-center justify-between pl-1">

 <h3 className={`font-semibold ${TEXT_PRIMARY} text-[20px]`}>Recent Conversations</h3>

 <button onClick={createNewChat} className={`w-10 h-10 ${BTN_PRIMARY}`}>

 <Plus size={20} />

 </button>

 </div>

 <div className="space-y-3">

 {chats.map(chat => (

 <div key={chat.id} onClick={() => setActiveChatId(chat.id)} className={`${CARD_SURFACE} p-4 flex items-center gap-4 cursor-pointer active:scale-[0.98] transition-transform`}>

 <div className={`w-12 h-12 flex items-center justify-center ${INSET_SURFACE}`}>

 <MessageCircle size={20} className={TEXT_SECONDARY} />

 </div>

 <div className="flex-1 min-w-0">

 <h4 className={`font-medium ${TEXT_PRIMARY} text-[16px] truncate`}>{chat.title}</h4>

 <p className={`text-[14px] ${TEXT_SECONDARY} mt-0.5`}>{chat.date}</p>

 </div>

 <ChevronRight size={20} className="#E5E7EB" />

 </div>

 ))}

 </div>

 </div>

 ) : (

 <div className="flex flex-col h-[calc(100vh-200px)] sm:h-[620px] -mt-4">

 <div className="flex-1 overflow-y-auto space-y-6 pb-20 pt-2 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:'none'] [scrollbar-width:'none']">

 {chats.find(c => c.id === activeChatId)?.messages.map((msg, idx) => (

 <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>

 <div className={`max-w-[85%] p-4 rounded-[24px] ${

 msg.role === 'user'

 ? 'bg-[#FF7A00] text-white rounded-br-[8px]'

 : 'bg-[#FFFFFF] text-[#1A1A1A] border border-[#E5E7EB] shadow-sm rounded-bl-[8px]'

 }`}>

 <p className={`text-[16px] leading-relaxed`}>

 {msg.text}

 </p>

 {msg.citation && (

 <div className={`mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#FAFAFA] border border-[#E5E7EB] rounded-[12px] text-[12px] font-medium ${TEXT_SECONDARY}`}>

 <FileText size={14} className={TEXT_SECONDARY} />

 {msg.citation}

 </div>

 )}

 </div>

 </div>

 ))}

 <div ref={chatEndRef} />

 </div>

 {/* Chat Input */}

 <div className="sticky bottom-0 pt-4 pb-2 bg-gradient-to-t from-[#FFFFFF] via-[#FFFFFF] to-transparent">

 <div className={`flex items-center gap-3 p-1.5 ${CARD_SURFACE} !rounded-[24px]`}>

 <input

 type="text"

 value={chatInput}

 onChange={(e) => setChatInput(e.target.value)}

 onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}

 placeholder="Ask your health AI..."

 className={`flex-1 bg-transparent py-2.5 pl-3 text-[16px] ${TEXT_PRIMARY} focus:outline-none placeholder:${TEXT_SECONDARY}`}

 />

 <button

 onClick={handleSendMessage}

 disabled={!chatInput.trim()}

 className={`w-10 h-10 flex items-center justify-center rounded-[16px] transition-colors ${chatInput.trim() ? 'bg-[#FF7A00] text-white' : 'bg-[#FAFAFA] text-[#E5E7EB] border border-[#E5E7EB]'}`}

 >

 <Send size={18} className={`${chatInput.trim() ? 'ml-1' : ''}`} />

 </button>

 </div>

 </div>

 </div>

 )}

 </div>

 )}

 {/* SERVICES TAB */}

 {activeTab === 'services' && (

 <div className="space-y-6 animate-in fade-in duration-300">

 <h3 className={`font-semibold ${TEXT_PRIMARY} text-[20px] pl-1`}>Health Services</h3>

 <div className="space-y-4">

 <div className={`${CARD_SURFACE} p-5 flex items-center gap-4 cursor-pointer active:scale-[0.98] transition-transform`}>

 <div className={`w-12 h-12 flex items-center justify-center ${INSET_SURFACE}`}>

 <Microscope size={20} className={TEXT_SECONDARY} />

 </div>

 <div>

 <h4 className={`font-medium ${TEXT_PRIMARY} text-[16px]`}>Book Lab Test</h4>

 <p className={`text-[14px] ${TEXT_SECONDARY} mt-0.5`}>Home collection available</p>

 </div>

 </div>

 <div className={`${CARD_SURFACE} p-5 flex items-center gap-4 cursor-pointer active:scale-[0.98] transition-transform`}>

 <div className={`w-12 h-12 flex items-center justify-center ${INSET_SURFACE}`}>

 <ShoppingBag size={20} className={TEXT_SECONDARY} />

 </div>

 <div>

 <h4 className={`font-medium ${TEXT_PRIMARY} text-[16px]`}>Order Medicine</h4>

 <p className={`text-[14px] ${TEXT_SECONDARY} mt-0.5`}>Upload Rx for fast delivery</p>

 </div>

 </div>

 <div className={`${CARD_SURFACE} p-5 flex items-center gap-4 cursor-pointer active:scale-[0.98] transition-transform`}>

 <div className={`w-12 h-12 flex items-center justify-center ${INSET_SURFACE}`}>

 <Stethoscope size={20} className={TEXT_SECONDARY} />

 </div>

 <div>

 <h4 className={`font-medium ${TEXT_PRIMARY} text-[16px]`}>Consult Doctor</h4>

 <p className={`text-[14px] ${TEXT_SECONDARY} mt-0.5`}>Video or clinic appointments</p>

 </div>

 </div>

 </div>

 </div>

 )}

 </main>

 {/* BOTTOM NAVIGATION */}

 <div className="absolute bottom-0 left-0 w-full z-40 bg-[#FFFFFF] border-t border-[#E5E7EB] px-6 py-4 pb-8 sm:pb-6">

 <nav className="flex justify-between items-center max-w-sm mx-auto">

 <NavItem icon={Home} label="Home" isActive={activeTab === 'home'} onClick={() => setActiveTab('home')} />

 <NavItem icon={Folder} label="Vault" isActive={activeTab === 'vault'} onClick={() => { setActiveTab('vault'); setActiveFolder(null); }} />

 <NavItem icon={Activity} label="Vitals" isActive={activeTab === 'vitals'} onClick={() => setActiveTab('vitals')} />

 <NavItem icon={MessageCircle} label="AI Chat" isActive={activeTab === 'chat'} onClick={() => { if(activeTab === 'chat') setActiveChatId(null); setActiveTab('chat'); }} />

 <NavItem icon={CalendarPlus} label="Services" isActive={activeTab === 'services'} onClick={() => setActiveTab('services')} />

 </nav>

 </div>

 {/* UPLOAD OVERLAY */}

 {isUploading && (

 <div className="absolute inset-0 bg-[#FFFFFF]/90 backdrop-blur-sm z-50 flex items-center justify-center animate-in fade-in duration-200">

 <div className={`w-[85%] ${CARD_SURFACE} p-8 flex flex-col items-center text-center relative overflow-hidden`}>

 <div className="relative z-10 flex flex-col items-center">

 {uploadStep < 3 ? (

 <div className="relative w-20 h-20 flex items-center justify-center mb-6">

 <Loader2 size={48} className="text-[#FF7A00] animate-spin absolute" />

 <div className={`w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm`}>

 <Plus size={24} className="text-[#FF7A00] animate-pulse" />

 </div>

 </div>

 ) : (

 <div className="w-16 h-16 flex items-center justify-center mb-6 bg-[#22C55E] rounded-full text-white shadow-sm animate-in zoom-in-50 duration-300">

 <CheckCircle2 size={32} strokeWidth={2.5} />

 </div>

 )}

 <h3 className={`text-[20px] font-semibold mb-2 ${TEXT_PRIMARY}`}>

 {uploadStep === 0 && 'Uploading securely...'}

 {uploadStep === 1 && 'Extracting data...'}

 {uploadStep === 2 && 'Structuring metrics...'}

 {uploadStep === 3 && 'Vault Updated'}

 </h3>

 </div>

 </div>

 </div>

 )}

 </div>

 </div>

 );

}

// Nav Item Component

function NavItem({
  icon: Icon,
  label,
  isActive,
  onClick,
}: {
  icon: LucideIcon;
  label: string;
  isActive: boolean;
  onClick: () => void;
}) {

 return (

 <button

 onClick={onClick}

 className="flex flex-col items-center justify-center gap-1.5 min-w-[3rem] group"

 >

 <Icon size={24} strokeWidth={isActive ? 2.5 : 2} className={`transition-colors ${isActive ? 'text-[#FF7A00]' : 'text-[#6B7280] group-hover:text-[#1A1A1A]'}`} />

 <span className={`text-[10px] font-medium transition-colors ${isActive ? 'text-[#FF7A00]' : 'text-[#6B7280]'}`}>{label}</span>

 </button>

 );

}