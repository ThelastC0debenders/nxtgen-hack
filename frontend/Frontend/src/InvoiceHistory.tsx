import { 
  FileText, Settings, LogOut, Building2, BarChart3, 
  ClipboardCheck, Search, ChevronRight, ChevronDown, ChevronUp, Download, Filter
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useState, useMemo, useRef, useEffect } from 'react';

// --- Mock Data ---

const historyData = [
  { id: 'INV-892104', vendor: 'TechSolutions Inc.', amount: 12450.00, status: 'APPROVED', score: '0.12', timestamp: 'Oct 24, 10:42 AM' },
  { id: 'INV-892105', vendor: 'Global Logistics LLC', amount: 8320.50, status: 'REJECTED', score: '0.88', timestamp: 'Oct 24, 10:38 AM' },
  { id: 'INV-892106', vendor: 'Acme Supplies Co.', amount: 2100.00, status: 'APPROVED', score: '0.05', timestamp: 'Oct 24, 10:15 AM' },
  { id: 'INV-892107', vendor: 'Industrial Parts Ltd', amount: 45900.00, status: 'FLAGGED', score: '0.65', timestamp: 'Oct 24, 09:55 AM' },
  { id: 'INV-892108', vendor: 'Apex Consulting', amount: 15000.00, status: 'APPROVED', score: '0.18', timestamp: 'Oct 24, 09:42 AM' },
  { id: 'INV-892109', vendor: 'Rapid Delivery Svc', amount: 890.00, status: 'APPROVED', score: '0.02', timestamp: 'Oct 24, 09:30 AM' },
  { id: 'INV-892110', vendor: 'Construct & Build', amount: 112000.00, status: 'REJECTED', score: '0.92', timestamp: 'Oct 24, 09:15 AM' },
  { id: 'INV-892111', vendor: 'Office Depot B2B', amount: 3450.25, status: 'APPROVED', score: '0.09', timestamp: 'Oct 24, 09:05 AM' },
  { id: 'INV-892112', vendor: 'CloudServe Tech', amount: 9999.00, status: 'FLAGGED', score: '0.45', timestamp: 'Oct 24, 08:58 AM' },
  { id: 'INV-892113', vendor: 'Metro Freight Co.', amount: 27500.00, status: 'APPROVED', score: '0.07', timestamp: 'Oct 24, 08:45 AM' },
  { id: 'INV-892114', vendor: 'DataBridge Solutions', amount: 64200.00, status: 'APPROVED', score: '0.03', timestamp: 'Oct 24, 08:30 AM' },
  { id: 'INV-892115', vendor: 'SecurePay Ltd', amount: 18750.00, status: 'REJECTED', score: '0.79', timestamp: 'Oct 24, 08:15 AM' },
  { id: 'INV-892116', vendor: 'GreenLeaf Exports', amount: 5600.00, status: 'APPROVED', score: '0.11', timestamp: 'Oct 24, 08:02 AM' },
  { id: 'INV-892117', vendor: 'ProManage Inc.', amount: 33400.00, status: 'FLAGGED', score: '0.58', timestamp: 'Oct 24, 07:48 AM' },
  { id: 'INV-892118', vendor: 'Atlas Manufacturing', amount: 91000.00, status: 'APPROVED', score: '0.04', timestamp: 'Oct 24, 07:35 AM' },
  { id: 'INV-892119', vendor: 'Quantum Analytics', amount: 7800.00, status: 'APPROVED', score: '0.06', timestamp: 'Oct 24, 07:20 AM' },
  { id: 'INV-892120', vendor: 'Nexus Trading', amount: 156000.00, status: 'REJECTED', score: '0.95', timestamp: 'Oct 24, 07:10 AM' },
  { id: 'INV-892121', vendor: 'Pinnacle Labs', amount: 22300.00, status: 'APPROVED', score: '0.15', timestamp: 'Oct 24, 06:55 AM' },
];

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

const getStatusBadge = (status: string) => {
  const styles: Record<string, string> = {
    APPROVED: 'text-[#10b981] bg-[#10b981]/10 border border-[#10b981]/20',
    REJECTED: 'text-[#ef4444] bg-[#ef4444]/10 border border-[#ef4444]/20',
    FLAGGED: 'text-[#f59e0b] bg-[#f59e0b]/10 border border-[#f59e0b]/20',
  };
  return (
    <span className={`px-3 py-1 rounded text-[11px] font-bold tracking-widest uppercase ${styles[status]}`}>
      {status}
    </span>
  );
};

const formatCurrency = (amount: number) => {
  return '$' + amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

// --- Main Component ---

export default function InvoiceHistory({ onNavigate }: { onNavigate: (page: string) => void }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All Statuses');
  const [statusOpen, setStatusOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;
  const statusRef = useRef<HTMLDivElement>(null);

  const uniqueStatuses = ['All Statuses', 'APPROVED', 'REJECTED', 'FLAGGED'];

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
  }, [searchQuery, statusFilter]);

  const totalEntries = filteredData.length;
  const totalPages = Math.max(1, Math.ceil(totalEntries / ITEMS_PER_PAGE));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const paginatedData = filteredData.slice((safeCurrentPage - 1) * ITEMS_PER_PAGE, safeCurrentPage * ITEMS_PER_PAGE);
  const startEntry = totalEntries === 0 ? 0 : (safeCurrentPage - 1) * ITEMS_PER_PAGE + 1;
  const endEntry = Math.min(safeCurrentPage * ITEMS_PER_PAGE, totalEntries);

  const handleExport = () => {
    const header = 'Invoice ID,Vendor,Amount (USD),Status,Fraud Score,Timestamp\n';
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
          <SidebarItem icon={ClipboardCheck} label="Invoice Verification" onClick={() => onNavigate('lender/invoice-verification')} />
          <SidebarItem icon={FileText} label="Invoice History" active />
        </div>

        <div className="flex flex-col gap-1 pt-4 mt-auto border-t border-[#334155]">
          <SidebarItem icon={Settings} label="Settings" />
          <SidebarItem icon={LogOut} label="Sign Out" />
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
          <div className="flex items-center gap-3 bg-[#1e293b] px-4 py-2.5 rounded-lg">
            <div className="text-right">
              <div className="text-[13px] font-bold text-white">Apex Capital Node</div>
              <div className="text-[10px] font-bold text-[#64748b] uppercase tracking-wider">Lender ID: LND-8821</div>
            </div>
            <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-[#f59e0b] to-[#fbbf24] shadow-sm"></div>
          </div>
        </header>

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
                  onChange={(e) => setSearchQuery(e.target.value)}
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
                  <div className="absolute top-full left-0 w-full mt-1 bg-white border border-[#e2e8f0] rounded-lg shadow-[0_8px_25px_rgba(71,85,105,0.15)] z-50 py-1">
                    {uniqueStatuses.map(status => (
                      <div
                        key={status}
                        onClick={() => { setStatusFilter(status); setStatusOpen(false); setCurrentPage(1); }}
                        className={`px-4 py-2.5 text-[13px] font-semibold cursor-pointer transition-colors ${statusFilter === status ? 'bg-[#f1f5f9] text-[#0f172a]' : 'text-[#475569] hover:bg-[#f8fafc]'}`}
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

            {/* Export Button */}
            <button 
              onClick={handleExport}
              className="flex items-center gap-2 px-5 py-2.5 bg-[#1e293b] text-white rounded-lg text-[12px] font-bold tracking-[0.1em] uppercase hover:bg-[#334155] transition-colors cursor-pointer border-none shadow-sm ml-4"
            >
              <Download size={14} />
              Export
            </button>
          </div>

          {/* Table */}
          <div className="flex-1 overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#f1f5f9]">
                  <th className="py-4 px-6 text-[10px] font-bold text-[#64748b] uppercase tracking-[0.15em]">Invoice ID</th>
                  <th className="py-4 px-6 text-[10px] font-bold text-[#64748b] uppercase tracking-[0.15em]">Vendor</th>
                  <th className="py-4 px-6 text-[10px] font-bold text-[#64748b] uppercase tracking-[0.15em] text-right">Amount (USD)</th>
                  <th className="py-4 px-6 text-[10px] font-bold text-[#64748b] uppercase tracking-[0.15em] text-center">Status</th>
                  <th className="py-4 px-6 text-[10px] font-bold text-[#64748b] uppercase tracking-[0.15em] text-center">Fraud Score</th>
                  <th className="py-4 px-6 text-[10px] font-bold text-[#64748b] uppercase tracking-[0.15em]">Timestamp</th>
                  <th className="py-4 px-3 w-[40px]"></th>
                </tr>
              </thead>
              <tbody>
                {paginatedData.map((row, i) => (
                  <tr key={i} className="hover:bg-[#f8fafc] transition-colors border-b border-[#f8fafc] last:border-none cursor-pointer group">
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
    </div>
  );
}
