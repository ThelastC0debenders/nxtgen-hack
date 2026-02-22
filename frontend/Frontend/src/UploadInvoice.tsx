import {
  Upload, Settings, LogOut, Package, CheckCircle,
  Hash, Building, Calendar, Play, FileUp, Info, Menu
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useState, useRef } from 'react';
import api from './api/client';
import Modal from './components/Modal';

// --- Subcomponents ---

const SidebarItem = ({ icon: Icon, label, active = false, isCollapsed = false, onClick }: { icon: LucideIcon, label: string, active?: boolean, isCollapsed?: boolean, onClick?: () => void }) => (
  <div
    onClick={onClick}
    title={isCollapsed ? label : undefined}
    className={`flex items-center ${isCollapsed ? 'justify-center w-12 h-12 mx-auto px-0' : 'gap-3.5 px-3 py-3'} mb-1 rounded-lg cursor-pointer transition-all duration-300 ${active ? 'bg-white/10' : 'hover:bg-white/5 relative overflow-hidden group'}`}
  >
    {!active && <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-[100%] group-hover:translate-x-[100%] transition-transform duration-700 ease-in-out"></div>}
    <Icon size={18} className={`${active ? 'text-white' : 'text-[#94a3b8]'} relative z-10 shrink-0`} strokeWidth={active ? 2.5 : 2} />
    {!isCollapsed && <span className={`text-[14px] relative z-10 truncate ${active ? 'text-white font-bold' : 'text-[#94a3b8] font-semibold'}`}>{label}</span>}
  </div>
);

// --- Main Component ---

export default function UploadInvoice({ onNavigate }: { onNavigate: (page: string) => void }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [invoiceId, setInvoiceId] = useState('');
  const [buyerId, setBuyerId] = useState('3a2d9faf-ecda-4b71-9b25-5a314263ef84');
  const [irnValue, setIrnValue] = useState('');
  const [issueDate, setIssueDate] = useState('');
  const [invoiceAmount, setInvoiceAmount] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Modal State
  const [modalConfig, setModalConfig] = useState<{isOpen: boolean, title: string, message: string, icon?: React.ReactNode}>({
    isOpen: false,
    title: '',
    message: ''
  });

  const showModal = (title: string, message: string, icon: React.ReactNode = <Info size={24} className="text-[#3b82f6]" />) => {
    setModalConfig({ isOpen: true, title, message, icon });
  };
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true);
    else if (e.type === 'dragleave') setDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files?.[0]) {
      setUploadedFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      setUploadedFile(e.target.files[0]);
    }
  };

  const handleSubmit = async () => {
    if (!invoiceId || !buyerId || !irnValue || !invoiceAmount) {
      setErrorMsg('Please fill in all required fields (Invoice ID, Buyer ID, IRN, Amount).');
      return;
    }
    setSubmitting(true);
    setErrorMsg('');

    try {
      // Create a payload matching the backend expectations
      const parsedAmount = parseFloat(invoiceAmount);

      const payload = {
        invoiceNumber: invoiceId,
        buyerGSTIN: buyerId,
        sellerGSTIN: localStorage.getItem('userId') || 'VND-9904', // Using real auth context instead of hardcoding
        invoiceAmount: parsedAmount, // Using exact user input amount
        invoiceDate: issueDate || new Date().toISOString(),
        irn: irnValue, // Now utilizing the user input field
        irnStatus: 'VALID',
        lineItems: [
          { description: 'Consulting Services', quantity: 1, unitPrice: parsedAmount }
        ]
      };

      await api.post('/invoices/upload', payload);
      setSubmitted(true);
      showModal(
        'Invoice Submitted', 
        `Invoice ${invoiceId} has been successfully registered on the immutable ledger.`,
        <CheckCircle size={24} className="text-[#10b981]" />
      );
    } catch (error: any) {
      console.error('Upload failed:', error);
      setErrorMsg(error.response?.data?.error || 'Failed to upload invoice');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = () => {
    setInvoiceId('');
    setBuyerId('');
    setIrnValue('');
    setIssueDate('');
    setInvoiceAmount('');
    setUploadedFile(null);
    setSubmitted(false);
    setErrorMsg('');
  };

  return (
    <div className="flex h-screen w-full bg-[#f8fafc] text-[#0f172a] overflow-hidden">

      {/* Sidebar */}
      {/* Sidebar */}
      {/* Sidebar */}
      <aside className={`h-screen shrink-0 flex flex-col ${isSidebarOpen ? 'px-4 w-[260px]' : 'px-0 w-[80px]'} py-6 bg-[#1e293b] bg-[repeating-linear-gradient(-45deg,transparent,transparent_20px,rgba(255,255,255,0.04)_20px,rgba(255,255,255,0.04)_23px)] transition-all duration-300 ease-in-out`}>
        
        <button 
          onClick={() => setIsSidebarOpen(!isSidebarOpen)} 
          className={`mb-4 flex items-center ${isSidebarOpen ? 'justify-start px-2' : 'justify-center w-12 h-12 mx-auto'} text-[#94a3b8] hover:text-white transition-colors ${isSidebarOpen ? 'w-full' : ''} rounded-lg hover:bg-white/5 py-2 cursor-pointer`}
          title="Toggle Sidebar"
        >
          <Menu size={20} />
        </button>

        {/* Top Logo Area */}
        <div className={`flex items-center ${isSidebarOpen ? 'gap-3 px-2 mb-10' : 'justify-center flex-col gap-2 mb-8'}`}>
          <div className={`bg-white/10 rounded-lg p-2.5 flex items-center justify-center shrink-0 ${!isSidebarOpen ? 'w-12 h-12' : ''}`}>
            <Package className="text-white" size={24} />
          </div>
          {isSidebarOpen && (
            <div className="flex flex-col">
              <span className="text-[14px] font-bold text-white leading-tight tracking-tight uppercase whitespace-nowrap">Vendor Portal</span>
              <span className="text-[10px] font-semibold text-[#64748b] tracking-wider whitespace-nowrap">Upload Node</span>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-1 flex-1">
          <SidebarItem icon={Upload} label="Upload Invoice" active isCollapsed={!isSidebarOpen} />
          <SidebarItem icon={CheckCircle} label="Verification Status" onClick={() => onNavigate('vendor/verification-status')} isCollapsed={!isSidebarOpen} />
        </div>

        <div className="flex flex-col gap-1 pt-4 mt-auto border-t border-[#334155]">
          <SidebarItem icon={Settings} label="Settings" onClick={() => showModal('Settings', 'Vendor settings panel will be available in the next platform update.')} isCollapsed={!isSidebarOpen} />
          <SidebarItem icon={LogOut} label="Sign Out" onClick={() => onNavigate?.('')} isCollapsed={!isSidebarOpen} />
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 pr-6 pb-6 pt-6 pl-8 overflow-y-auto">

        {/* Header */}
        <header className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-[22px] font-bold text-[#0f172a] mb-1">Upload Invoice</h1>
            <p className="text-[14px] font-semibold text-[#475569]">Submit invoice metadata for registry ingestion and verification.</p>
          </div>
          <div className="flex items-center gap-3 bg-[#1e293b] px-4 py-2.5 rounded-lg">
            <div className="text-right">
              <div className="text-[13px] font-bold text-white">Global Supply Corp.</div>
              <div className="text-[10px] font-bold text-[#64748b] uppercase tracking-wider">Vendor ID: VND-9904</div>
            </div>
            <div className="w-9 h-9 rounded-lg bg-[#1e293b] border border-[#334155] shadow-sm flex items-center justify-center text-[12px] font-bold text-white">
              GS
            </div>
          </div>
        </header>

        {/* Invoice Details Card */}
        <div className="bg-white rounded-xl border border-[#e2e8f0] shadow-[0_8px_25px_rgba(71,85,105,0.08)] p-8">

          {/* Card Header */}
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-[18px] font-bold text-[#0f172a]">Invoice Details</h3>
            <span className="text-[11px] font-bold text-[#64748b] uppercase tracking-[0.15em] border border-[#e2e8f0] px-3 py-1 rounded">
              {submitted ? 'Submitted' : 'Draft'}
            </span>
          </div>
          <p className="text-[13px] font-semibold text-[#94a3b8] mb-8">Enter the core metadata for the new invoice record.</p>

          {errorMsg && (
            <div className="mb-6 p-4 bg-[#ef4444]/10 border border-[#ef4444]/20 rounded-lg">
              <p className="text-[13px] font-bold text-[#ef4444]">{errorMsg}</p>
            </div>
          )}

          {/* Row 1: Invoice ID + Buyer ID */}
          <div className="grid grid-cols-2 gap-5 mb-5">
            <div>
              <label className="text-[10px] font-bold text-[#0f172a] uppercase tracking-[0.15em] mb-2.5 block">Invoice ID</label>
              <div className="relative">
                <Hash size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#94a3b8]" />
                <input
                  type="text"
                  placeholder="e.g. INV-2023-001"
                  value={invoiceId}
                  onChange={(e) => setInvoiceId(e.target.value)}
                  disabled={submitted}
                  className="w-full pl-11 pr-4 py-3 border border-[#e2e8f0] rounded-lg text-[13px] font-semibold text-[#0f172a] outline-none placeholder:text-[#cbd5e1] focus:border-[#94a3b8] transition-colors disabled:bg-[#f8fafc] disabled:cursor-not-allowed"
                />
              </div>
            </div>
            <div>
              <label className="text-[10px] font-bold text-[#0f172a] uppercase tracking-[0.15em] mb-2.5 block">Buyer ID</label>
              <div className="relative">
                <Building size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#94a3b8]" />
                <input
                  type="text"
                  placeholder="e.g. 3a2d9faf-ecda..."
                  value={buyerId}
                  onChange={(e) => setBuyerId(e.target.value)}
                  disabled={submitted}
                  className="w-full pl-11 pr-4 py-3 border border-[#e2e8f0] rounded-lg text-[13px] font-semibold text-[#0f172a] outline-none placeholder:text-[#cbd5e1] focus:border-[#94a3b8] transition-colors disabled:bg-[#f8fafc] disabled:cursor-not-allowed"
                />
              </div>
              <p className="text-[10px] text-[#64748b] mt-1.5 font-bold">Default Lender UUID is pre-filled for this demo.</p>
            </div>
          </div>

          {/* Row 2: IRN + Issue Date + Amount */}
          <div className="grid grid-cols-3 gap-5 mb-6">
            <div>
              <label className="text-[10px] font-bold text-[#0f172a] uppercase tracking-[0.15em] mb-2.5 block">Invoice Registration Number (IRN)</label>
              <div className="relative">
                <Hash size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#94a3b8]" />
                <input
                  type="text"
                  placeholder="e.g. IRN-123"
                  value={irnValue}
                  onChange={(e) => setIrnValue(e.target.value)}
                  disabled={submitted}
                  className="w-full pl-11 pr-4 py-3 border border-[#e2e8f0] rounded-lg text-[13px] font-semibold text-[#0f172a] outline-none placeholder:text-[#cbd5e1] focus:border-[#94a3b8] transition-colors disabled:bg-[#f8fafc] disabled:cursor-not-allowed"
                />
              </div>
            </div>
            <div>
              <label className="text-[10px] font-bold text-[#0f172a] uppercase tracking-[0.15em] mb-2.5 block">Issue Date</label>
              <div className="relative">
                <Calendar size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#94a3b8] pointer-events-none" />
                <input
                  type="date"
                  value={issueDate}
                  onChange={(e) => setIssueDate(e.target.value)}
                  disabled={submitted}
                  className="w-full pl-11 pr-4 py-3 border border-[#e2e8f0] rounded-lg text-[13px] font-semibold text-[#0f172a] outline-none placeholder:text-[#cbd5e1] focus:border-[#94a3b8] transition-colors appearance-none disabled:bg-[#f8fafc] disabled:cursor-not-allowed"
                />
              </div>
            </div>
            <div>
              <label className="text-[10px] font-bold text-[#0f172a] uppercase tracking-[0.15em] mb-2.5 block">Invoice Amount (₹)</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#94a3b8] font-bold text-[13px]">₹</span>
                <input
                  type="number"
                  placeholder="e.g. 5000"
                  value={invoiceAmount}
                  onChange={(e) => setInvoiceAmount(e.target.value)}
                  disabled={submitted}
                  className="w-full pl-8 pr-4 py-3 border border-[#e2e8f0] rounded-lg text-[13px] font-semibold text-[#0f172a] outline-none placeholder:text-[#cbd5e1] focus:border-[#94a3b8] transition-colors appearance-none disabled:bg-[#f8fafc] disabled:cursor-not-allowed"
                />
              </div>
            </div>
          </div>

          {/* Supporting Documents */}
          <div className="mb-8">
            <label className="text-[10px] font-bold text-[#0f172a] uppercase tracking-[0.15em] mb-2.5 block">
              Supporting Documents (Optional)
            </label>
            <div
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={() => !submitted && fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl py-8 flex flex-col items-center justify-center cursor-pointer transition-colors ${submitted ? 'border-[#e2e8f0] bg-[#f8fafc] cursor-not-allowed' :
                dragActive ? 'border-[#94a3b8] bg-[#f8fafc]' :
                  uploadedFile ? 'border-[#10b981] bg-[#10b981]/5' :
                    'border-[#e2e8f0] hover:border-[#cbd5e1] bg-white'
                }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.png,.jpg,.jpeg"
                onChange={handleFileChange}
                className="hidden"
              />
              {uploadedFile ? (
                <>
                  <FileUp size={24} className="text-[#10b981] mb-2" />
                  <p className="text-[13px] font-semibold text-[#0f172a]">{uploadedFile.name}</p>
                  <p className="text-[11px] font-semibold text-[#94a3b8] mt-1">
                    {(uploadedFile.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </>
              ) : (
                <>
                  <FileUp size={24} className="text-[#cbd5e1] mb-2" />
                  <p className="text-[13px] font-semibold text-[#475569]">
                    <span className="text-[#3b82f6] cursor-pointer">Upload a file</span> or drag and drop
                  </p>
                  <p className="text-[11px] font-semibold text-[#94a3b8] mt-1">PDF, PNG, JPG up to 10MB</p>
                </>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 mb-6">
            <button
              onClick={handleCancel}
              className="px-8 py-3 rounded-lg text-[13px] font-bold tracking-[0.05em] uppercase border border-[#e2e8f0] bg-white text-[#475569] hover:bg-[#f8fafc] transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={!invoiceId || !buyerId || !irnValue || !invoiceAmount || submitted}
              className={`flex items-center gap-2 px-6 py-3 rounded-lg text-[13px] font-bold tracking-[0.05em] uppercase border-none transition-colors cursor-pointer ${!invoiceId || !buyerId || !irnValue || !invoiceAmount || submitted
                ? 'bg-[#cbd5e1] text-white cursor-not-allowed'
                : 'bg-[#1e293b] text-white hover:bg-[#334155]'
                }`}
            >
              <Play size={14} fill="currentColor" />
              {submitting ? 'Submitting...' : submitted ? 'Submitted' : 'Submit Invoice'}
            </button>
          </div>

          {/* Compliance Notice */}
          <p className="text-[11px] font-semibold text-[#94a3b8] text-center">
            By submitting, you certify that this invoice data is accurate and complies with the <span className="underline cursor-pointer" onClick={() => showModal('Network Standards', 'All invoices undergo real-time cryptographic hashing and matching against the global registry to prevent duplication.')}>Network Standards</span>.
          </p>
        </div>
      </main>

      <Modal 
        isOpen={modalConfig.isOpen}
        onClose={() => setModalConfig(prev => ({ ...prev, isOpen: false }))}
        title={modalConfig.title}
        message={modalConfig.message}
        icon={modalConfig.icon}
      />
    </div>
  );
}
