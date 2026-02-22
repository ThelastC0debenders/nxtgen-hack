import {
  FileText, Settings, LogOut, Building2, BarChart3,
  Search, ChevronRight, ChevronDown, ChevronUp, Download, Filter, RefreshCw, Menu
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useState, useMemo, useRef, useEffect } from 'react';
import api from './api/client';
import Modal from './components/Modal';

// --- Mock Data ---

// --- Empty initially, will be fetched ---

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

const getStatusBadge = (status: string) => {
  const isVerified = status === 'VERIFIED' || status === 'FINANCED';
  const isPending = status === 'PENDING_VERIFICATION' || status === 'PENDING';
  const isConflict = status === 'DUPLICATE_DETECTED' || status.startsWith('REJECTED_');

  const color = isVerified ? '#10b981' : isPending ? '#f59e0b' : isConflict ? '#ef4444' : '#64748b';

  return (
    <span className={`px-3 py-1 rounded text-[11px] font-bold tracking-widest uppercase inline-block whitespace-nowrap`}
      style={{ color, background: `${color}10`, border: `1px solid ${color}20` }}
    >
      {status.substring(0, 16)}{status.length > 16 ? '...' : ''}
    </span>
  );
};

const formatCurrency = (amount: number) => {
  return '₹' + amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

// --- Main Component ---

export default function InvoiceHistory({ onNavigate }: { onNavigate: (page: string) => void }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [historyData, setHistoryData] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All Statuses');
  const [statusOpen, setStatusOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const ITEMS_PER_PAGE = 10;
  const statusRef = useRef<HTMLDivElement>(null);

  // Modal State
  const [modalConfig, setModalConfig] = useState<{isOpen: boolean, title: string, message: string, icon?: React.ReactNode}>({
    isOpen: false, title: '', message: ''
  });

  const showModal = (title: string, message: string, icon: React.ReactNode = <FileText size={24} className="text-[#3b82f6]" />) => {
    setModalConfig({ isOpen: true, title, message, icon });
  };

  const uniqueStatuses = ['All Statuses', 'VERIFIED', 'FINANCED', 'PENDING_VERIFICATION', 'DUPLICATE_DETECTED', 'REJECTED_HIGH_RISK', 'REJECTED_BY_LENDER'];

  const fetchHistory = async () => {
    setRefreshing(true);
    setErrorMsg('');
    try {
      const res = await api.get('/invoices/history');
      const mapped = (res.data.data || []).map((inv: any) => ({
        id: inv.invoiceNumber,
        vendor: inv.sellerGSTIN, // Using seller as vendor ID proxy
        amount: Number(inv.invoiceAmount),
        status: inv.status,
        score: inv.fraud_score != null ? parseFloat(inv.fraud_score).toFixed(2) : '0.00',
        timestamp: new Date(inv.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
      }));
      setHistoryData(mapped);
    } catch (e: any) {
      console.error("Failed to fetch history:", e);
      setErrorMsg('Could not fetch real-time history from the registry.');
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (statusRef.current && !statusRef.current.contains(e.target as Node)) setStatusOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const filteredData = useMemo(() => {
    return historyData.filter(row => {
      const matchesSearch = !searchQuery ||
        row.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        row.vendor.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === 'All Statuses' || row.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [historyData, searchQuery, statusFilter]);

  const totalEntries = filteredData.length;
  const totalPages = Math.max(1, Math.ceil(totalEntries / ITEMS_PER_PAGE));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const paginatedData = filteredData.slice((safeCurrentPage - 1) * ITEMS_PER_PAGE, safeCurrentPage * ITEMS_PER_PAGE);
  const startEntry = totalEntries === 0 ? 0 : (safeCurrentPage - 1) * ITEMS_PER_PAGE + 1;
  const endEntry = Math.min(safeCurrentPage * ITEMS_PER_PAGE, totalEntries);

  const handleExport = () => {
    const header = 'Invoice ID,Vendor,Amount (INR),Status,Fraud Score,Timestamp\n';
    const rows = filteredData.map(r => `${r.id},"${r.vendor}",${r.amount},${r.status},${r.score},"${r.timestamp}"`).join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'invoice_history.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex h-screen w-full bg-[#f8fafc] text-[#0f172a] overflow-hidden">

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
          <div className={`bg-[#f59e0b]/20 rounded-lg p-2.5 flex items-center justify-center shrink-0 ${!isSidebarOpen ? 'w-12 h-12' : ''}`}>
            <Building2 className="text-[#f59e0b]" size={24} />
          </div>
          {isSidebarOpen && (
            <div className="flex flex-col">
              <span className="text-[14px] font-bold text-white leading-tight tracking-tight uppercase whitespace-nowrap">Lender Portal</span>
              <span className="text-[10px] font-semibold text-[#64748b] tracking-wider whitespace-nowrap">Verification Node</span>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-1 flex-1">
          <SidebarItem icon={BarChart3} label="Verification Monitoring" onClick={() => onNavigate('lender')} isCollapsed={!isSidebarOpen} />
          <SidebarItem icon={FileText} label="Invoice History" active isCollapsed={!isSidebarOpen} />
        </div>

        <div className="flex flex-col gap-1 pt-4 mt-auto border-t border-[#334155]">
          <SidebarItem icon={Settings} label="Settings" onClick={() => showModal('Settings', 'Lender configuration panel will be available in the next platform update.', <Settings size={24} className="text-[#3b82f6]" />)} isCollapsed={!isSidebarOpen} />
          <SidebarItem icon={LogOut} label="Sign Out" onClick={() => onNavigate?.('')} isCollapsed={!isSidebarOpen} />
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 pr-6 pb-6 pt-6 pl-8 overflow-y-auto">

        {/* Header */}
        <header className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-[22px] font-bold text-[#0f172a] mb-1">Lender Verification History</h1>
            <p className="text-[14px] font-semibold text-[#475569]">Historical log of all submitted registry validation requests.</p>
          </div>
          <div className="flex items-center gap-3 bg-[#1e293b] px-4 py-2.5 rounded-lg border border-[#f59e0b]/20 shadow-sm">
            <div className="text-right">
              <div className="text-[13px] font-bold text-white tracking-wide">LENDER</div>
              <div className="text-[10px] font-bold text-[#64748b] uppercase tracking-wider">LND-8821</div>
            </div>
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-[#f59e0b] to-[#fbbf24] shadow-[0_0_10px_rgba(245,158,11,0.2)] flex items-center justify-center text-white font-bold text-[15px]">L</div>
          </div>
        </header>

        {errorMsg && (
          <div className="mb-6 p-4 bg-[#ef4444]/10 border border-[#ef4444]/20 rounded-lg shrink-0">
            <p className="text-[13px] font-bold text-[#ef4444]">{errorMsg}</p>
          </div>
        )}

        {/* Table Card */}
        <div className="bg-white rounded-xl border border-[#e2e8f0] shadow-[0_8px_25px_rgba(71,85,105,0.08)] flex flex-col flex-1 overflow-hidden">

          {/* Controls Bar */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-[#f1f5f9] shrink-0">
            <div className="flex items-center gap-3 flex-1">
              {/* Search */}
              <div className="relative flex-1 max-w-[360px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94a3b8]" size={16} />
                <input
                  type="text"
                  placeholder="Search by ID/Vendor..."
                  value={searchQuery}
                  onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                  className="w-full pl-10 pr-4 py-2.5 border border-[#e2e8f0] rounded-lg text-[13px] font-medium outline-none placeholder:text-[#94a3b8] text-[#0f172a] focus:border-[#cbd5e1] transition-colors"
                />
              </div>

              {/* Status Dropdown */}
              <div ref={statusRef} className="relative">
                <div
                  onClick={() => setStatusOpen(!statusOpen)}
                  className="flex items-center gap-2 px-4 py-2.5 border border-[#e2e8f0] rounded-lg cursor-pointer hover:border-[#cbd5e1] transition-colors min-w-[160px]"
                >
                  <span className="text-[13px] font-semibold text-[#475569] flex-1">{statusFilter}</span>
                  {statusOpen ? <ChevronUp size={14} className="text-[#94a3b8]" /> : <ChevronDown size={14} className="text-[#94a3b8]" />}
                </div>
                {statusOpen && (
                  <div className="absolute top-full left-0 min-w-full w-max mt-1 bg-white border border-[#e2e8f0] rounded-lg shadow-[0_8px_25px_rgba(71,85,105,0.15)] z-50 py-1">
                    {uniqueStatuses.map(status => (
                      <div
                        key={status}
                        onClick={() => { setStatusFilter(status); setStatusOpen(false); setCurrentPage(1); }}
                        className={`px-4 py-2.5 text-[13px] font-semibold cursor-pointer transition-colors whitespace-nowrap ${statusFilter === status ? 'bg-[#f1f5f9] text-[#0f172a]' : 'text-[#475569] hover:bg-[#f8fafc]'}`}
                      >
                        {status}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Filter Button */}
              <div className="w-10 h-10 rounded-lg border border-[#e2e8f0] flex items-center justify-center text-[#475569] cursor-pointer hover:bg-[#f8fafc] transition-colors">
                <Filter size={16} />
              </div>
            </div>

            {/* Export & Refresh Buttons */}
            <div className="flex items-center gap-2 ml-4">
              <button
                onClick={fetchHistory}
                className={`w-10 h-10 rounded-lg border border-[#e2e8f0] flex items-center justify-center text-[#475569] cursor-pointer hover:bg-[#f8fafc] transition-all bg-white ${refreshing ? 'animate-spin' : ''}`}
              >
                <RefreshCw size={16} />
              </button>
              <button
                onClick={handleExport}
                className="flex items-center gap-2 px-5 py-2.5 bg-[#1e293b] text-white rounded-lg text-[12px] font-bold tracking-[0.1em] uppercase hover:bg-[#334155] transition-colors cursor-pointer border-none shadow-sm"
              >
                <Download size={14} />
                Export
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="flex-1 overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#f1f5f9]">
                  <th className="py-4 px-6 text-[10px] font-bold text-[#64748b] uppercase tracking-[0.15em]">Invoice ID</th>
                  <th className="py-4 px-6 text-[10px] font-bold text-[#64748b] uppercase tracking-[0.15em]">Vendor</th>
                  <th className="py-4 px-6 text-[10px] font-bold text-[#64748b] uppercase tracking-[0.15em] text-right">Amount (INR)</th>
                  <th className="py-4 px-6 text-[10px] font-bold text-[#64748b] uppercase tracking-[0.15em] text-center">Status</th>
                  <th className="py-4 px-6 text-[10px] font-bold text-[#64748b] uppercase tracking-[0.15em] text-center">Fraud Score</th>
                  <th className="py-4 px-6 text-[10px] font-bold text-[#64748b] uppercase tracking-[0.15em]">Timestamp</th>
                  <th className="py-4 px-3 w-[40px]"></th>
                </tr>
              </thead>
              <tbody>
                {paginatedData.map((row, i) => (
                  <tr 
                    key={i} 
                    className="hover:bg-[#f8fafc] transition-colors border-b border-[#f8fafc] last:border-none cursor-pointer group"
                    onClick={() => showModal('Invoice Registration Details', `ID: ${row.id}\nVendor: ${row.vendor}\nAmount: ${formatCurrency(row.amount)}\nScore: ${row.score}\n\nFull cryptographic proof and metadata can be viewed in the Audit Trail.`, <FileText size={24} className="text-[#3b82f6]" />)}
                  >
                    <td className="py-4 px-6 text-[13px] font-bold text-[#0f172a]">{row.id}</td>
                    <td className="py-4 px-6 text-[13px] font-semibold text-[#475569]">{row.vendor}</td>
                    <td className="py-4 px-6 text-[13px] font-bold text-[#0f172a] text-right">{formatCurrency(row.amount)}</td>
                    <td className="py-4 px-6 text-center">{getStatusBadge(row.status)}</td>
                    <td className="py-4 px-6 text-center">
                      <span className={`text-[13px] font-bold ${parseFloat(row.score) >= 0.7 ? 'text-[#ef4444]' : parseFloat(row.score) >= 0.4 ? 'text-[#f59e0b]' : 'text-[#10b981]'}`}>
                        {row.score}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-[13px] font-semibold text-[#64748b]">{row.timestamp}</td>
                    <td className="py-4 px-3">
                      <ChevronRight size={16} className="text-[#cbd5e1] group-hover:text-[#94a3b8] transition-colors" />
                    </td>
                  </tr>
                ))}
                {paginatedData.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-16 text-center text-[13px] font-bold text-[#94a3b8] uppercase tracking-wider">
                      No matching invoices found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer */}
          <div className="border-t border-[#f1f5f9] px-6 py-4 flex items-center justify-between shrink-0">
            <span className="text-[12px] font-semibold text-[#94a3b8]">
              Showing <span className="font-bold text-[#475569]">{startEntry}-{endEntry}</span> of {totalEntries} entries
            </span>
            <div className="flex gap-3">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={safeCurrentPage <= 1}
                className={`px-4 py-2 text-[12px] font-semibold transition-colors border-none bg-transparent cursor-pointer ${safeCurrentPage <= 1 ? 'text-[#cbd5e1] cursor-not-allowed' : 'text-[#475569] hover:text-[#0f172a]'}`}
              >
                Previous
              </button>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={safeCurrentPage >= totalPages}
                className={`px-4 py-2 text-[12px] font-bold transition-colors border-none bg-transparent cursor-pointer ${safeCurrentPage >= totalPages ? 'text-[#cbd5e1] cursor-not-allowed' : 'text-[#3b82f6] hover:text-[#2563eb]'}`}
              >
                Next
              </button>
            </div>
          </div>
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
