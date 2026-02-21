import {
  FileText, Settings, LogOut, Building2, BarChart3,
  ClipboardCheck, CheckCircle2, AlertTriangle, Calendar, Hash
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useState } from 'react';
import api from './api/client';

// --- Subcomponents ---

const SidebarItem = ({ icon: Icon, label, active = false, onClick }: { icon: LucideIcon, label: string, active?: boolean, onClick?: () => void }) => (
  <div
    onClick={onClick}
    className={`flex items-center gap-3.5 px-3 py-3 mb-1 rounded-lg cursor-pointer transition-all ${active ? 'bg-white/10' : 'hover:bg-white/5 relative overflow-hidden group'}`}
  >
    {!active && <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-[100%] group-hover:translate-x-[100%] transition-transform duration-700 ease-in-out"></div>}
    <Icon size={18} className={`${active ? 'text-white' : 'text-[#94a3b8]'} relative z-10`} strokeWidth={active ? 2.5 : 2} />
    <span className={`text-[14px] relative z-10 ${active ? 'text-white font-bold' : 'text-[#94a3b8] font-semibold'}`}>{label}</span>
  </div>
);

// --- Main Component ---

export default function InvoiceVerification({ onNavigate }: { onNavigate: (page: string) => void }) {
  const [invoiceId, setInvoiceId] = useState('');
  const [vendorId, setVendorId] = useState('');
  const [buyerId, setBuyerId] = useState('');
  const [irnValue, setIrnValue] = useState('');
  const [date, setDate] = useState('');
  const [lender] = useState('Apex Capital Node');
  const [verificationResult, setVerificationResult] = useState<'idle' | 'loading' | 'done'>('idle');

  // Real Result State
  const [resultData, setResultData] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState('');

  const handleVerify = async () => {
    if (!invoiceId || !vendorId || !irnValue) {
      setErrorMsg('Please fill in all required fields (Invoice ID, Vendor ID, IRN).');
      return;
    }
    setVerificationResult('loading');
    setErrorMsg('');
    setResultData(null);

    try {
      const isRound = Math.random() > 0.5;
      const mockAmount = isRound ? Math.floor(Math.random() * 50 + 1) * 1000 : Math.floor(Math.random() * 50000) + 1500;

      const payload = {
        invoiceNumber: invoiceId,
        sellerGSTIN: vendorId,
        buyerGSTIN: buyerId || localStorage.getItem('userId') || 'LND-8821',
        invoiceAmount: mockAmount,
        invoiceDate: date || new Date().toISOString(),
        irn: irnValue,
        irnStatus: 'VALID',
        lineItems: [
          { description: 'Testing Item', quantity: 1, unitPrice: mockAmount, total: mockAmount }
        ]
      };

      const res = await api.post('/invoices/verify', payload);
      setResultData(res.data);
      setVerificationResult('done');
    } catch (error: any) {
      console.error('Verification failed', error);
      setErrorMsg(error.response?.data?.error || 'Verification encountered an error.');
      setVerificationResult('idle');
    }
  };

  const handleReset = () => {
    setInvoiceId('');
    setVendorId('');
    setBuyerId('');
    setIrnValue('');
    setDate('');
    setVerificationResult('idle');
    setResultData(null);
    setErrorMsg('');
  };

  return (
    <div className="flex h-screen w-full bg-[#f8fafc] text-[#0f172a] overflow-hidden">

      {/* Sidebar */}
      <aside className="w-[230px] h-screen shrink-0 flex flex-col px-4 py-6 bg-[#1e293b]">
        {/* Top Logo Area */}
        <div className="flex items-center gap-3 mb-10 px-2 mt-2">
          <div className="bg-[#f59e0b]/20 rounded-lg p-2.5 flex items-center justify-center">
            <Building2 className="text-[#f59e0b]" size={24} />
          </div>
          <div className="flex flex-col">
            <span className="text-[14px] font-bold text-white leading-tight tracking-tight uppercase">Lender Portal</span>
            <span className="text-[10px] font-semibold text-[#64748b] tracking-wider">Verification Node</span>
          </div>
        </div>

        <div className="flex flex-col gap-1 flex-1">
          <SidebarItem icon={BarChart3} label="Verification Monitoring" onClick={() => onNavigate('lender')} />
          <SidebarItem icon={ClipboardCheck} label="Invoice Verification" active />
          <SidebarItem icon={FileText} label="Invoice History" onClick={() => onNavigate('lender/invoice-history')} />
        </div>

        <div className="flex flex-col gap-1 pt-4 mt-auto border-t border-[#334155]">
          <SidebarItem icon={Settings} label="Settings" />
          <SidebarItem icon={LogOut} label="Sign Out" onClick={() => onNavigate?.('')} />
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 pr-6 pb-6 pt-6 pl-8 overflow-y-auto">

        {/* Header */}
        <header className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-[22px] font-bold text-[#0f172a] mb-1">Lender Invoice Verification Console</h1>
            <p className="text-[14px] font-semibold text-[#475569]">Real-time registry validation and duplicate detection.</p>
          </div>
          <div className="flex items-center gap-3 bg-[#1e293b] px-4 py-2.5 rounded-lg">
            <div className="text-right">
              <div className="text-[13px] font-bold text-white">Apex Capital Node</div>
              <div className="text-[10px] font-bold text-[#64748b] uppercase tracking-wider">Lender ID: LND-8821</div>
            </div>
            <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-[#f59e0b] to-[#fbbf24] shadow-sm"></div>
          </div>
        </header>

        {/* Form + Decision Engine Grid */}
        <div className="grid grid-cols-2 gap-6 mb-6">

          {/* Left: Submit for Verification Form */}
          <div className="bg-white rounded-xl border border-[#e2e8f0] shadow-[0_4px_15px_rgba(71,85,105,0.06)] p-8">
            <h3 className="text-[18px] font-bold text-[#0f172a] mb-1">Submit for Verification</h3>
            <p className="text-[13px] font-semibold text-[#94a3b8] mb-6">Enter Invoice metadata for registry validation.</p>

            {/* Row 1: Invoice ID + Vendor ID */}
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="text-[10px] font-bold text-[#64748b] uppercase tracking-[0.15em] mb-2 block">Invoice ID</label>
                <input
                  type="text"
                  placeholder="INV-000000"
                  value={invoiceId}
                  onChange={(e) => setInvoiceId(e.target.value)}
                  className="w-full px-4 py-3 border border-[#e2e8f0] rounded-lg text-[13px] font-semibold text-[#0f172a] outline-none placeholder:text-[#cbd5e1] focus:border-[#94a3b8] transition-colors"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-[#64748b] uppercase tracking-[0.15em] mb-2 block">Vendor ID</label>
                <input
                  type="text"
                  placeholder="VND-000000"
                  value={vendorId}
                  onChange={(e) => setVendorId(e.target.value)}
                  className="w-full px-4 py-3 border border-[#e2e8f0] rounded-lg text-[13px] font-semibold text-[#0f172a] outline-none placeholder:text-[#cbd5e1] focus:border-[#94a3b8] transition-colors"
                />
              </div>
            </div>

            {/* Row 2: Buyer ID + Amount */}
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="text-[10px] font-bold text-[#64748b] uppercase tracking-[0.15em] mb-2 block">Buyer ID</label>
                <input
                  type="text"
                  placeholder="BYR-000000"
                  value={buyerId}
                  onChange={(e) => setBuyerId(e.target.value)}
                  className="w-full px-4 py-3 border border-[#e2e8f0] rounded-lg text-[13px] font-semibold text-[#0f172a] outline-none placeholder:text-[#cbd5e1] focus:border-[#94a3b8] transition-colors"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-[#64748b] uppercase tracking-[0.15em] mb-2 block">Invoice Registration Number (IRN)</label>
                <div className="relative">
                  <Hash size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#94a3b8]" />
                  <input
                    type="text"
                    placeholder="e.g. IRN-123"
                    value={irnValue}
                    onChange={(e) => setIrnValue(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 border border-[#e2e8f0] rounded-lg text-[13px] font-semibold text-[#0f172a] outline-none placeholder:text-[#cbd5e1] focus:border-[#94a3b8] transition-colors"
                  />
                </div>
              </div>
            </div>

            {/* Row 3: Date + Lender */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div>
                <label className="text-[10px] font-bold text-[#64748b] uppercase tracking-[0.15em] mb-2 block">Date</label>
                <div className="relative">
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full px-4 py-3 border border-[#e2e8f0] rounded-lg text-[13px] font-semibold text-[#0f172a] outline-none placeholder:text-[#cbd5e1] focus:border-[#94a3b8] transition-colors appearance-none"
                  />
                  <Calendar size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94a3b8] pointer-events-none" />
                </div>
              </div>
              <div>
                <label className="text-[10px] font-bold text-[#64748b] uppercase tracking-[0.15em] mb-2 block">Lender</label>
                <input
                  type="text"
                  value={lender}
                  readOnly
                  className="w-full px-4 py-3 border border-[#e2e8f0] rounded-lg text-[13px] font-semibold text-[#475569] outline-none bg-[#f8fafc] cursor-not-allowed"
                />
              </div>
            </div>

            {/* Buttons */}
            <div className="flex gap-3">
              <button
                onClick={handleVerify}
                disabled={!invoiceId || !vendorId}
                className={`flex-1 py-3 rounded-lg text-[13px] font-bold tracking-[0.1em] uppercase transition-colors border-none cursor-pointer ${!invoiceId || !vendorId ? 'bg-[#cbd5e1] text-white cursor-not-allowed' : 'bg-[#1e293b] text-white hover:bg-[#334155]'}`}
              >
                {verificationResult === 'loading' ? 'Verifying...' : 'Verify'}
              </button>
              <button
                onClick={handleReset}
                className="px-8 py-3 rounded-lg text-[13px] font-bold tracking-[0.1em] uppercase border border-[#e2e8f0] bg-white text-[#475569] hover:bg-[#f8fafc] transition-colors cursor-pointer"
              >
                Reset
              </button>
            </div>
          </div>

          {/* Right: System Decision Engine */}
          <div className="bg-white rounded-xl border border-[#e2e8f0] shadow-[0_4px_15px_rgba(71,85,105,0.06)] flex items-center justify-center">
            {verificationResult === 'idle' && (
              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-xl bg-[#f8fafc] border border-[#e2e8f0] flex items-center justify-center">
                  <ClipboardCheck size={28} className="text-[#cbd5e1]" />
                </div>
                <h4 className="text-[14px] font-bold text-[#64748b] uppercase tracking-[0.15em] mb-1">System Decision Engine</h4>
                <p className="text-[12px] font-semibold text-[#94a3b8]">Ready for real-time analysis...</p>
              </div>
            )}
            {verificationResult === 'loading' && (
              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-xl bg-[#f8fafc] border border-[#e2e8f0] flex items-center justify-center animate-pulse">
                  <ClipboardCheck size={28} className="text-[#94a3b8]" />
                </div>
                <h4 className="text-[14px] font-bold text-[#475569] uppercase tracking-[0.15em] mb-1">Processing</h4>
                <p className="text-[12px] font-semibold text-[#94a3b8]">Running registry validation...</p>
              </div>
            )}
            {verificationResult === 'done' && (
              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-xl bg-[#10b981]/10 border border-[#10b981]/20 flex items-center justify-center">
                  <CheckCircle2 size={28} className="text-[#10b981]" />
                </div>
                <h4 className="text-[14px] font-bold text-[#0f172a] uppercase tracking-[0.15em] mb-1">Analysis Complete</h4>
                <p className="text-[12px] font-semibold text-[#94a3b8]">Results displayed below</p>
              </div>
            )}
          </div>
        </div>

        {errorMsg && (
          <div className="mb-6 p-4 bg-[#ef4444]/10 border border-[#ef4444]/20 rounded-lg">
            <p className="text-[13px] font-bold text-[#ef4444]">{errorMsg}</p>
          </div>
        )}

        {/* Result Cards */}
        {resultData && (
          <div className="grid grid-cols-2 gap-6">

            {/* Main Result Card */}
            <div className={`bg-white rounded-xl border-l-4 border-t border-r border-b shadow-[0_4px_15px_rgba(71,85,105,0.06)] p-6
                ${resultData.status === 'VERIFIED' ? 'border-l-[#10b981] border-t-[#e2e8f0] border-r-[#e2e8f0] border-b-[#e2e8f0]' : ''}
                ${resultData.status.startsWith('REJECTED_') ? 'border-l-[#ef4444] border-t-[#e2e8f0] border-r-[#e2e8f0] border-b-[#e2e8f0]' : ''}
                ${resultData.duplicate ? 'border-l-[#f59e0b] border-t-[#e2e8f0] border-r-[#e2e8f0] border-b-[#e2e8f0]' : ''}
            `}>
              <div className="flex items-center justify-between mb-1">
                <span className={`text-[10px] font-bold uppercase tracking-[0.15em]
                   ${resultData.status === 'VERIFIED' ? 'text-[#10b981]' : ''}
                   ${resultData.status.startsWith('REJECTED_') ? 'text-[#ef4444]' : ''}
                   ${resultData.duplicate ? 'text-[#f59e0b]' : ''}
                `}>
                  Status: {resultData.status.replace(/_/g, ' ')}
                </span>
                {resultData.status === 'VERIFIED' && <CheckCircle2 size={20} className="text-[#10b981]" />}
                {resultData.status.startsWith('REJECTED_') && <AlertTriangle size={20} className="text-[#ef4444]" />}
                {resultData.duplicate && <AlertTriangle size={20} className="text-[#f59e0b]" />}
              </div>
              <h4 className="text-[16px] font-bold text-[#0f172a] mb-4">
                {resultData.status === 'VERIFIED' ? 'Verification Passed' :
                  resultData.duplicate ? 'Registry Conflict Detected' : 'Verification Rejected'}
              </h4>

              <div className="grid grid-cols-2 gap-4 mb-5">
                <div>
                  <span className="text-[10px] font-bold text-[#64748b] uppercase tracking-[0.15em] block mb-1">Fraud Score</span>
                  <span className="text-[24px] font-bold text-[#0f172a] leading-none">
                    {resultData.fraudScore > 0 ? (resultData.fraudScore).toFixed(2) : 'N/A'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-[#64748b] uppercase tracking-[0.15em] block mb-1">Risk Profile</span>
                  <span className={`text-[24px] font-bold leading-none
                    ${resultData.riskLevel === 'HIGH' ? 'text-[#ef4444]' :
                      resultData.riskLevel === 'MEDIUM' ? 'text-[#f59e0b]' : 'text-[#10b981]'
                    }
                  `}>
                    {resultData.riskLevel || 'N/A'}
                  </span>
                </div>
              </div>

              <div className="pt-4 border-t border-[#f1f5f9]">
                <span className="text-[10px] font-bold text-[#64748b] uppercase tracking-[0.15em] block mb-2">Registry Hash</span>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-[#cbd5e1]"></div>
                  <span className="text-[12px] font-mono font-semibold text-[#475569]" title={resultData.invoiceHash}>
                    {resultData.invoiceHash ? `${resultData.invoiceHash.substring(0, 16)}...` : 'N/A'}
                  </span>
                </div>
              </div>
            </div>

            {/* Engine Metrics Card */}
            <div className="bg-white rounded-xl border border-[#e2e8f0] shadow-[0_4px_15px_rgba(71,85,105,0.06)] p-6">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-[14px] font-bold text-[#0f172a] uppercase tracking-[0.1em]">Engine Metrics</h4>
                <span className="text-[10px] font-bold text-[#10b981] bg-[#10b981]/10 px-2 py-1 rounded uppercase">Real-Time</span>
              </div>

              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-[11px] font-bold text-[#64748b] mb-1 uppercase tracking-[0.1em]">
                    <span>Total Latency</span>
                    <span>{resultData.latencyMetrics?.totalMs || 0}ms</span>
                  </div>
                  <div className="w-full bg-[#f1f5f9] rounded-full h-1.5 overflow-hidden">
                    <div className="bg-[#1e293b] h-full" style={{ width: '100%' }}></div>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-[11px] font-bold text-[#64748b] mb-1 uppercase tracking-[0.1em]">
                    <span>Fingerprinting</span>
                    <span>{resultData.latencyMetrics?.hashingMs || 0}ms</span>
                  </div>
                  <div className="w-full bg-[#f1f5f9] rounded-full h-1.5 overflow-hidden">
                    <div className="bg-[#3b82f6] h-full" style={{ width: `${Math.max(5, ((resultData.latencyMetrics?.hashingMs || 0) / (resultData.latencyMetrics?.totalMs || 1)) * 100)}%` }}></div>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-[11px] font-bold text-[#64748b] mb-1 uppercase tracking-[0.1em]">
                    <span>Registry Lock (Redis)</span>
                    <span>{resultData.latencyMetrics?.redisMs || 0}ms</span>
                  </div>
                  <div className="w-full bg-[#f1f5f9] rounded-full h-1.5 overflow-hidden">
                    <div className="bg-[#f59e0b] h-full" style={{ width: `${Math.max(5, ((resultData.latencyMetrics?.redisMs || 0) / (resultData.latencyMetrics?.totalMs || 1)) * 100)}%` }}></div>
                  </div>
                </div>
              </div>
            </div>

          </div>
        )}
      </main>
    </div>
  );
}
