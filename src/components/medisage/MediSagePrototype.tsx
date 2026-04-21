"use client";

import React, { useState } from "react";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  Home,
  Folder,
  Activity,
  MessageCircle,
  Stethoscope,
  Plus,
  FileText,
  Send,
  CheckCircle2,
  Loader2,
  Microscope,
  ChevronRight,
  AlertCircle,
  CalendarPlus,
  ShoppingBag,
  ChevronLeft,
} from "lucide-react";
import { VitalsTab } from "@/app/app/vitals-tab";
import { IndexedTextPreviewModal } from "@/components/medisage/indexed-text-preview-modal";
import { ProfileSheet } from "@/components/medisage/profile-sheet";
import { useMedisagePrototypeLogic } from "@/hooks/use-medisage-prototype-logic";

// --- DESIGN SYSTEM CONSTANTS (Clean + Calm + Modern) ---

const APP_BG = "bg-[#FFFFFF]";

const CARD_SURFACE = "bg-[#FFFFFF] shadow-[0_4px_16px_rgba(0,0,0,0.04)] border border-[#E5E7EB] rounded-[24px]";

const INSET_SURFACE = "bg-[#FAFAFA] border border-[#E5E7EB] rounded-[16px]";

const BTN_PRIMARY = "bg-[#FF7A00] text-white rounded-[16px] hover:bg-[#E66E00] active:scale-[0.98] transition-transform flex items-center justify-center";

const BTN_SECONDARY = "bg-[#FFFFFF] border border-[#E5E7EB] text-[#1A1A1A] rounded-[16px] active:scale-[0.98] transition-transform flex items-center justify-center shadow-sm";

const TEXT_PRIMARY = "text-[#1A1A1A]";

const TEXT_SECONDARY = "text-[#6B7280]";

export default function MediSagePrototype() {
 const {
 activeTab,
 navToTab,
 loading,
 vaultFiles,
 categoriesForVault,
 fileInputRef,
 openFilePicker,
 onHiddenFileChange,
 overlayOpen,
 uploadPhase,
 uploadOutcome,
 userLabel,
 avatarUrl,
 greetingName,
 chatInput,
 setChatInput,
 chats,
 activeChatId,
 setActiveChatId,
 chatting,
 createNewChat,
 submitChat,
 activeFolder,
 setActiveFolder,
 signOut,
 initDrive,
 initing,
 message,
 indexedPreviewOpen,
 indexedPreviewTitle,
 indexedPreviewLoading,
 indexedPreviewError,
 indexedPreviewData,
 closeIndexedPreview,
 openIndexedPreview,
 chatEndRef,
 } = useMedisagePrototypeLogic();

 const [profileOpen, setProfileOpen] = useState(false);

 const getHeaderContent = () => {

 if (activeTab === 'home') return { title: 'MediSage', subtitle: `Good morning, ${greetingName}`, showAvatar: true };

 if (activeTab === 'vault') {

 if (activeFolder) return { title: activeFolder, subtitle: 'Folder View', showBack: true };

 return { title: 'Data Vault', subtitle: 'Manage your medical records' };

 }

 if (activeTab === 'vitals') return { title: 'Health Vitals', subtitle: 'From your health records' };

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

 return (

 <div className={`flex justify-center items-center w-full min-h-screen bg-[#E5E7EB] sm:p-8 font-['Inter',sans-serif]`}>

 <style>

 {`@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');`}

 </style>

 {/* Mobile Device Container */}

 <div className={`w-full max-w-[400px] h-[100dvh] sm:h-[850px] ${APP_BG} sm:rounded-[40px] shadow-2xl relative overflow-hidden flex flex-col sm:border-[8px] border-gray-900`}>

 <input
 ref={fileInputRef}
 type="file"
 className="hidden"
 accept=".pdf,.txt,text/plain,application/pdf"
 onChange={(e) => void onHiddenFileChange(e)}
 />

 <IndexedTextPreviewModal
 open={indexedPreviewOpen}
 title={indexedPreviewTitle}
 loading={indexedPreviewLoading}
 error={indexedPreviewError}
 data={indexedPreviewData}
 onClose={closeIndexedPreview}
 />

 <ProfileSheet
 open={profileOpen}
 onClose={() => setProfileOpen(false)}
 userLabel={userLabel}
 avatarUrl={avatarUrl}
 message={message}
 initing={initing}
 onInitDrive={() => void initDrive()}
 onSignOut={() => void signOut()}
 />

 {/* Header */}

 <header className={`px-5 pt-12 pb-4 flex items-center justify-between sticky top-0 z-10 ${APP_BG}/95 backdrop-blur-md border-b border-[#E5E7EB]`}>

 <div className="flex items-center gap-4">

 {headerInfo.showAvatar && (

 <button
 type="button"
 onClick={() => setProfileOpen(true)}
 className={`w-10 h-10 ${BTN_SECONDARY} !rounded-full overflow-hidden flex shrink-0 items-center justify-center`}
 aria-label="Open profile"
 >

 {avatarUrl ? (
 // eslint-disable-next-line @next/next/no-img-element
 <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
 ) : (
 <span className={`text-[14px] font-semibold ${TEXT_PRIMARY}`}>
 {(userLabel || "M").slice(0, 1).toUpperCase()}
 </span>
 )}

 </button>

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

 {/* Quick Upload Action */}

 <div

 onClick={() => openFilePicker()}
 role="button"
 tabIndex={0}
 onKeyDown={(e) => {
 if (e.key === "Enter" || e.key === " ") {
 e.preventDefault();
 openFilePicker();
 }
 }}

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

 <ChevronRight size={20} className={TEXT_SECONDARY} />

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

 {categoriesForVault.map(({ name, Icon, count }) => (

 <div

 key={name}

 onClick={() => setActiveFolder(name)}

 className={`${CARD_SURFACE} p-4 flex flex-col items-center justify-center gap-3 cursor-pointer active:scale-[0.98] transition-transform`}

 >

 <div className={`w-12 h-12 rounded-full flex items-center justify-center ${INSET_SURFACE}`}>

 <Icon size={20} className={TEXT_SECONDARY} />

 </div>

 <div className="text-center">

 <h4 className={`font-medium ${TEXT_PRIMARY} text-[16px]`}>{name}</h4>

 <p className={`text-[14px] ${TEXT_SECONDARY} mt-0.5`}>{count} Files</p>

 </div>

 </div>

 ))}

 </div>

 {/* Recent Files List */}

 <div>

 <div className="flex items-center justify-between mb-4 pl-1">

 <h3 className={`font-semibold ${TEXT_PRIMARY} text-[20px]`}>Recent Documents</h3>

 {loading ? (
 <span className={`text-[12px] ${TEXT_SECONDARY}`}>Loading…</span>
 ) : null}

 </div>

 <div className="space-y-3">

 {vaultFiles.slice(0, 6).map((file) => (

 <div
 key={file.id}
 role="button"
 tabIndex={0}
 onClick={() => void openIndexedPreview(file.id, file.title)}
 onKeyDown={(e) => {
 if (e.key === "Enter" || e.key === " ") {
 e.preventDefault();
 void openIndexedPreview(file.id, file.title);
 }
 }}
 className={`${CARD_SURFACE} p-4 flex items-center gap-4 cursor-pointer active:scale-[0.98] transition-transform`}>

 <div className={`w-12 h-12 flex items-center justify-center ${INSET_SURFACE}`}>

 <file.Icon size={20} className={TEXT_SECONDARY} />

 </div>

 <div className="flex-1 min-w-0">

 <h4 className={`font-medium ${TEXT_PRIMARY} text-[16px] truncate`}>{file.title}</h4>

 <p className={`text-[14px] ${TEXT_SECONDARY} mt-0.5`}>{file.date} • {file.folder}</p>

 </div>

 <ChevronRight size={20} className={TEXT_SECONDARY} />

 </div>

 ))}

 </div>

 </div>

 </div>

 ) : (

 /* Inside Folder View */

 <div className="space-y-3 animate-in slide-in-from-right-4 duration-300">

 {vaultFiles.filter(f => f.folder === activeFolder).length > 0 ? (

 vaultFiles.filter(f => f.folder === activeFolder).map((file) => (

 <div
 key={file.id}
 role="button"
 tabIndex={0}
 onClick={() => void openIndexedPreview(file.id, file.title)}
 onKeyDown={(e) => {
 if (e.key === "Enter" || e.key === " ") {
 e.preventDefault();
 void openIndexedPreview(file.id, file.title);
 }
 }}
 className={`${CARD_SURFACE} p-4 flex items-center gap-4 cursor-pointer active:scale-[0.98] transition-transform`}>

 <div className={`w-12 h-12 flex items-center justify-center ${INSET_SURFACE}`}>

 <file.Icon size={20} className={TEXT_SECONDARY} />

 </div>

 <div className="flex-1 min-w-0">

 <h4 className={`font-medium ${TEXT_PRIMARY} text-[16px] truncate`}>{file.title}</h4>

 <p className={`text-[14px] ${TEXT_SECONDARY} mt-0.5`}>{file.date}</p>

 </div>

 <ChevronRight size={20} className={TEXT_SECONDARY} />

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

 <div className="animate-in fade-in duration-300">

 <VitalsTab />

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

 <p className={`text-[14px] ${TEXT_SECONDARY} mt-0.5`}>{chat.updated}</p>

 </div>

 <ChevronRight size={20} className={TEXT_SECONDARY} />

 </div>

 ))}

 </div>

 </div>

 ) : (

 <div className="flex flex-col h-[calc(100vh-200px)] sm:h-[620px] -mt-4">

 <div className="flex-1 overflow-y-auto space-y-6 pb-20 pt-2 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:'none'] [scrollbar-width:'none']">

 {(chats.find(c => c.id === activeChatId)?.messages.length === 0 ? (

 <p className={`rounded-[24px] border border-dashed border-[#E5E7EB] bg-[#FAFAFA] px-4 py-6 text-center text-[14px] ${TEXT_SECONDARY}`}>

 Ask anything about the text we indexed from your documents. Not medical advice.

 </p>

 ) : null)}

 {chats.find(c => c.id === activeChatId)?.messages.map((msg, idx) =>

 msg.role === "user" ? (

 <div key={idx} className="flex justify-end">

 <div className="max-w-[85%] rounded-[24px] rounded-br-[8px] bg-[#FF7A00] p-4 text-white">

 <p className="text-[16px] leading-relaxed">{msg.content}</p>

 </div>

 </div>

 ) : (

 <div key={idx} className="flex justify-start">

 <div className="max-w-[85%] rounded-[24px] rounded-bl-[8px] border border-[#E5E7EB] bg-[#FFFFFF] p-4 text-[#1A1A1A] shadow-sm">

 <p className="whitespace-pre-wrap text-[16px] leading-relaxed">{msg.content}</p>

 {msg.citations && msg.citations.length > 0 ? (

 <div className="mt-3 flex flex-wrap gap-2 border-t border-[#E5E7EB] pt-3">

 {msg.citations.map((c) => (

 <span key={c.documentId} className="inline-flex max-w-full flex-wrap items-center gap-1">

 <Link

 href={`/api/drive/download/${c.driveFileId}`}

 className="inline-flex max-w-[200px] items-center rounded-full bg-[#FF7A00]/10 px-3 py-1 text-[12px] font-semibold text-[#FF7A00] ring-1 ring-[#FF7A00]/25"

 >

 <span className="truncate">{c.title}</span>

 </Link>

 <button

 type="button"

 onClick={() => void openIndexedPreview(c.documentId, c.title)}

 className="rounded-full bg-[#FAFAFA] px-2 py-1 text-[10px] font-semibold text-[#1A1A1A] ring-1 ring-[#E5E7EB]"

 >

 Indexed

 </button>

 </span>

 ))}

 </div>

 ) : null}

 {msg.retrievalNote ? (

 <p className={`mt-2 text-[11px] ${TEXT_SECONDARY}`}>{msg.retrievalNote}</p>

 ) : null}

 </div>

 </div>

 ),

 )}

 {chatting ? (

 <div className="flex justify-start">

 <div className="inline-flex max-w-[85%] items-center gap-2 rounded-[24px] border border-[#E5E7EB] bg-[#FFFFFF] px-3 py-2 text-[12px] text-[#6B7280]">

 <Loader2 size={14} className="animate-spin text-[#FF7A00]" />

 Thinking…

 </div>

 </div>

 ) : null}

 <div ref={chatEndRef} />

 </div>

 {/* Chat Input */}

 <div className="sticky bottom-0 pt-4 pb-2 bg-gradient-to-t from-[#FFFFFF] via-[#FFFFFF] to-transparent">

 <div className={`flex items-center gap-3 p-1.5 ${CARD_SURFACE} !rounded-[24px]`}>

 <input

 type="text"

 value={chatInput}

 onChange={(e) => setChatInput(e.target.value)}

 onKeyDown={(e) => {
 if (e.key === "Enter") {
 e.preventDefault();
 void submitChat();
 }
 }}

 placeholder="Ask your health AI..."

 className={`flex-1 bg-transparent py-2.5 pl-3 text-[16px] ${TEXT_PRIMARY} focus:outline-none placeholder:${TEXT_SECONDARY}`}

 />

 <button

 onClick={() => void submitChat()}

 disabled={chatting || !chatInput.trim()}

 className={`w-10 h-10 flex items-center justify-center rounded-[16px] transition-colors ${chatInput.trim() && !chatting ? 'bg-[#FF7A00] text-white' : 'bg-[#FAFAFA] text-[#E5E7EB] border border-[#E5E7EB]'}`}

 >

 <Send size={18} className={`${chatInput.trim() && !chatting ? 'ml-1' : ''}`} />

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

 <NavItem icon={Home} label="Home" isActive={activeTab === 'home'} onClick={() => navToTab('home')} />

 <NavItem icon={Folder} label="Vault" isActive={activeTab === 'vault'} onClick={() => navToTab('vault')} />

 <NavItem icon={Activity} label="Vitals" isActive={activeTab === 'vitals'} onClick={() => navToTab('vitals')} />

 <NavItem icon={MessageCircle} label="AI Chat" isActive={activeTab === 'chat'} onClick={() => navToTab('chat')} />

 <NavItem icon={CalendarPlus} label="Services" isActive={activeTab === 'services'} onClick={() => navToTab('services')} />

 </nav>

 </div>

 {/* UPLOAD OVERLAY */}

 {overlayOpen && (

 <div className="absolute inset-0 z-50 flex items-center justify-center bg-[#FFFFFF]/90 backdrop-blur-sm animate-in fade-in duration-200">

 <div className={`w-[85%] ${CARD_SURFACE} p-8 flex flex-col items-center text-center relative overflow-hidden`}>

 <div className="relative z-10 flex flex-col items-center">

 {uploadPhase === "done" ? (

 <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-[#22C55E] text-white shadow-sm animate-in zoom-in-50 duration-300">

 <CheckCircle2 size={32} strokeWidth={2.5} />

 </div>

 ) : uploadPhase === "error" ? (

 <div className={`mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-red-600 text-white shadow-sm`}>

 <AlertCircle size={32} strokeWidth={2.5} />

 </div>

 ) : (

 <div className="relative mb-6 flex h-20 w-20 items-center justify-center">

 <Loader2 size={48} className="absolute text-[#FF7A00] animate-spin" />

 <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white shadow-sm">

 <Plus size={24} className="animate-pulse text-[#FF7A00]" />

 </div>

 </div>

 )}

 <h3 className={`text-[20px] font-semibold mb-2 ${TEXT_PRIMARY}`}>

 {uploadPhase === "done"

 ? "Vault updated"

 : uploadPhase === "error"

 ? "Something went wrong"

 : uploadPhase === "upload"

 ? "Uploading securely…"

 : uploadPhase === "analyze"

 ? "Extracting data…"

 : "Structuring & indexing…"}

 </h3>

 <p className={`max-w-[280px] text-[14px] leading-relaxed ${TEXT_SECONDARY}`}>

 {uploadPhase === "done" || uploadPhase === "error"

 ? uploadOutcome?.text ?? ""

 : uploadPhase === "upload"

 ? "Your file is encrypted in transit and processed privately."

 : uploadPhase === "analyze"

 ? "Pulling text and medical context from your document."

 : "Routing to the right folder and indexing for search."}

 </p>

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