import { 
  Upload, Settings, LogOut, Package, CheckCircle, Search,
  ChevronLeft, ChevronRight, RefreshCw, Download, Filter,
  Check, Clock, X
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useState, useMemo, useRef, useEffect } from 'react';

// --- Mock Data ---

const verificationRecords = [
  { id: 'INV-2023-089', lender: 'Capital One Commercial', amount: 12450.00, status: 'VERIFIED', risk: 'Low Risk', timestamp: 'Oct 24, 2024' },
  { id: 'INV-2023-090', lender: 'JP Morgan Chase', amount: 45200.00, status: 'PENDING', risk: 'Low Risk', timestamp: 'Oct 24, 2024' },
  { id: 'INV-2023-091', lender: 'Wells Fargo', amount: 8900.50, status: 'CONFLICT', risk: 'High Risk', timestamp: 'Oct 24, 2024' },
  { id: 'INV-2023-092', lender: 'Citi Group', amount: 156000.00, status: 'VERIFIED', risk: 'Low Risk', timestamp: 'Oct 24, 2024' },
  { id: 'INV-2023-093', lender: 'Bank of America', amount: 2340.00, status: 'PENDING', risk: 'Medium Risk', timestamp: 'Oct 24, 2024' },
  { id: 'INV-2023-094', lender: 'US Bank', amount: 33100.00, status: 'VERIFIED', risk: 'Low Risk', timestamp: 'Oct 24, 2024' },
  { id: 'INV-2023-095', lender: 'Goldman Sachs', amount: 78500.00, status: 'CONFLICT', risk: 'High Risk', timestamp: 'Oct 23, 2024' },
  { id: 'INV-2023-096', lender: 'Morgan Stanley', amount: 5600.00, status: 'VERIFIED', risk: 'Low Risk', timestamp: 'Oct 23, 2024' },
  { id: 'INV-2023-097', lender: 'HSBC Holdings', amount: 92000.00, status: 'PENDING', risk: 'Medium Risk', timestamp: 'Oct 23, 2024' },
  { id: 'INV-2023-098', lender: 'Barclays PLC', amount: 14300.00, status: 'VERIFIED', risk: 'Low Risk', timestamp: 'Oct 23, 2024' },
  { id: 'INV-2023-099', lender: 'Deutsche Bank', amount: 67800.00, status: 'VERIFIED', risk: 'Low Risk', timestamp: 'Oct 23, 2024' },
  { id: 'INV-2023-100', lender: 'BNP Paribas', amount: 3200.00, status: 'PENDING', risk: 'Medium Risk', timestamp: 'Oct 23, 2024' },
  { id: 'INV-2023-101', lender: 'Credit Suisse', amount: 128000.00, status: 'CONFLICT', risk: 'High Risk', timestamp: 'Oct 22, 2024' },
  { id: 'INV-2023-102', lender: 'UBS Group', amount: 19500.00, status: 'VERIFIED', risk: 'Low Risk', timestamp: 'Oct 22, 2024' },
  { id: 'INV-2023-103', lender: 'Nomura Holdings', amount: 41200.00, status: 'VERIFIED', risk: 'Low Risk', timestamp: 'Oct 22, 2024' },
  { id: 'INV-2023-104', lender: 'Mizuho Financial', amount: 8750.00, status: 'PENDING', risk: 'Low Risk', timestamp: 'Oct 22, 2024' },
  { id: 'INV-2023-105', lender: 'Standard Chartered', amount: 55000.00, status: 'VERIFIED', risk: 'Low Risk', timestamp: 'Oct 21, 2024' },
  { id: 'INV-2023-106', lender: 'Societe Generale', amount: 23400.00, status: 'CONFLICT', risk: 'High Risk', timestamp: 'Oct 21, 2024' },
  { id: 'INV-2023-107', lender: 'ING Group', amount: 6100.00, status: 'VERIFIED', risk: 'Low Risk', timestamp: 'Oct 21, 2024' },
  { id: 'INV-2023-108', lender: 'Santander Group', amount: 87600.00, status: 'PENDING', risk: 'Medium Risk', timestamp: 'Oct 21, 2024' },
  { id: 'INV-2023-109', lender: 'TD Securities', amount: 34500.00, status: 'VERIFIED', risk: 'Low Risk', timestamp: 'Oct 20, 2024' },
  { id: 'INV-2023-110', lender: 'RBC Capital', amount: 112000.00, status: 'VERIFIED', risk: 'Low Risk', timestamp: 'Oct 20, 2024' },
  { id: 'INV-2023-111', lender: 'Macquarie Group', amount: 4800.00, status: 'CONFLICT', risk: 'High Risk', timestamp: 'Oct 20, 2024' },
  { id: 'INV-2023-112', lender: 'Jefferies LLC', amount: 29700.00, status: 'PENDING', risk: 'Medium Risk', timestamp: 'Oct 20, 2024' },
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
  const config: Record<string, { Icon: LucideIcon; color: string; bg: string; border: string }> = {
    VERIFIED: { Icon: Check, color: '#10b981', bg: '#10b981/10', border: '#10b981/20' },
    PENDING: { Icon: Clock, color: '#f59e0b', bg: '#f59e0b/10', border: '#f59e0b/20' },
    CONFLICT: { Icon: X, color: '#ef4444', bg: '#ef4444/10', border: '#ef4444/20' },
  };
  const c = config[status];
  const { Icon } = c;
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded text-[11px] font-bold tracking-widest uppercase`}
      style={{ color: c.color, background: `${c.color}10`, border: `1px solid ${c.color}20` }}
    >
      <Icon size={12} strokeWidth={3} />
      {status}
    </span>
  );
};

const getRiskBadge = (risk: string) => {
  const colors: Record<string, string> = {
    'Low Risk': '#10b981',
    'Medium Risk': '#f59e0b',
    'High Risk': '#ef4444',
  };
  return (
    <span className="text-[13px] font-bold" style={{ color: colors[risk] }}>
      {risk}
    </span>
  );
};

const formatCurrency = (amount: number) => {
  return '₹' + amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

// --- Main Component ---

export default function VerificationStatus({ onNavigate }: { onNavigate: (page: string) => void }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterQuery, setFilterQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All Statuses');
  const [statusOpen, setStatusOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [refreshing, setRefreshing] = useState(false);
  const ITEMS_PER_PAGE = 6;
  const statusRef = useRef<HTMLDivElement>(null);

  const uniqueStatuses = ['All Statuses', 'VERIFIED', 'PENDING', 'CONFLICT'];

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (statusRef.current && !statusRef.current.contains(e.target as Node)) setStatusOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const filteredData = useMemo(() => {
    return verificationRecords.filter(row => {
      const query = (searchQuery || filterQuery).toLowerCase();
      const matchesSearch = !query || 
        row.id.toLowerCase().includes(query) || 
        row.lender.toLowerCase().includes(query);
      const matchesStatus = statusFilter === 'All Statuses' || row.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [searchQuery, filterQuery, statusFilter]);

  const totalEntries = filteredData.length;
  const totalPages = Math.max(1, Math.ceil(totalEntries / ITEMS_PER_PAGE));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const paginatedData = filteredData.slice((safeCurrentPage - 1) * ITEMS_PER_PAGE, safeCurrentPage * ITEMS_PER_PAGE);
  const startEntry = totalEntries === 0 ? 0 : (safeCurrentPage - 1) * ITEMS_PER_PAGE + 1;
  const endEntry = Math.min(safeCurrentPage * ITEMS_PER_PAGE, totalEntries);

  const handleRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  };

  const handleExport = () => {
    const header = 'Invoice ID,Lender,Amount,Verification Status,Fraud Risk,Timestamp\n';
    const rows = filteredData.map(r => `${r.id},"${r.lender}",${r.amount},${r.status},${r.risk},"${r.timestamp}"`).join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'verification_status.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  // Build page numbers
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    if (totalPages <= 5) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (safeCurrentPage > 3) pages.push('...');
      for (let i = Math.max(2, safeCurrentPage - 1); i <= Math.min(totalPages - 1, safeCurrentPage + 1); i++) {
        pages.push(i);
      }
      if (safeCurrentPage < totalPages - 2) pages.push('...');
      pages.push(totalPages);
    }
    return pages;
  };

  return (
    <div className="flex h-screen w-full bg-[#f8fafc] text-[#0f172a] overflow-hidden">
      
      {/* Sidebar */}
      <aside className="w-[230px] h-screen shrink-0 flex flex-col px-4 py-6 bg-[#1e293b]">
        <div className="flex items-center gap-3 mb-10 px-2 mt-2">
          <div className="bg-white/10 rounded-lg p-2.5 flex items-center justify-center">
            <Package className="text-white" size={24} />
          </div>
          <div className="flex flex-col">
            <span className="text-[14px] font-bold text-white leading-tight tracking-tight uppercase">Vendor Portal</span>
            <span className="text-[10px] font-semibold text-[#64748b] tracking-wider">Monitoring Node</span>
          </div>
        </div>

        <div className="flex flex-col gap-1 flex-1">
          <SidebarItem icon={Upload} label="Upload Invoice" onClick={() => onNavigate('vendor')} />
          <SidebarItem icon={CheckCircle} label="Verification Status" active />
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
          <div className="flex-1">
            <h1 className="text-[22px] font-bold text-[#0f172a] mb-1">Invoice Verification Status</h1>
            <p className="text-[14px] font-semibold text-[#475569]">Track real-time registry processing and lender verification results.</p>
          </div>
          <div className="flex items-center gap-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94a3b8]" size={16} />
              <input 
                type="text"
                placeholder="Search invoices..."
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                className="pl-10 pr-4 py-2.5 border border-[#e2e8f0] rounded-lg text-[13px] font-medium outline-none placeholder:text-[#94a3b8] text-[#0f172a] w-[200px] focus:border-[#cbd5e1] transition-colors"
              />
            </div>
            {/* Profile */}
            <div className="flex items-center gap-3 bg-[#1e293b] px-4 py-2.5 rounded-lg">
              <div className="text-right">
                <div className="text-[13px] font-bold text-white">Global Supply Corp.</div>
                <div className="text-[10px] font-bold text-[#64748b] uppercase tracking-wider">Vendor ID: VND-9904</div>
              </div>
              <div className="w-9 h-9 rounded-lg bg-[#1e293b] border border-[#334155] shadow-sm flex items-center justify-center text-[12px] font-bold text-white">
                GS
              </div>
            </div>
          </div>
        </header>

        {/* Table Card */}
        <div className="bg-white rounded-xl border border-[#e2e8f0] shadow-[0_8px_25px_rgba(71,85,105,0.08)] flex flex-col flex-1 overflow-hidden">
          
          {/* Controls Bar */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-[#f1f5f9] shrink-0">
            <div className="flex items-center gap-3">
              {/* Filter by Invoice ID */}
              <div className="relative">
                <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94a3b8]" size={14} />
                <input 
                  type="text"
                  placeholder="Filter by Invoice ID..."
                  value={filterQuery}
                  onChange={(e) => { setFilterQuery(e.target.value); setCurrentPage(1); }}
                  className="pl-9 pr-4 py-2.5 border border-[#e2e8f0] rounded-lg text-[13px] font-medium outline-none placeholder:text-[#94a3b8] text-[#0f172a] w-[240px] focus:border-[#cbd5e1] transition-colors"
                />
              </div>

              {/* Status Dropdown */}
              <div ref={statusRef} className="relative">
                <div 
                  onClick={() => setStatusOpen(!statusOpen)}
                  className="flex items-center gap-2 px-4 py-2.5 border border-[#e2e8f0] rounded-lg cursor-pointer hover:border-[#cbd5e1] transition-colors min-w-[150px]"
                >
                  <span className="text-[13px] font-semibold text-[#475569] flex-1">{statusFilter}</span>
                  <span className="text-[#10b981] text-[14px]">✓</span>
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
            </div>

            <div className="flex items-center gap-2">
              {/* Refresh */}
              <button 
                onClick={handleRefresh}
                className={`w-10 h-10 rounded-lg border border-[#e2e8f0] flex items-center justify-center text-[#475569] cursor-pointer hover:bg-[#f8fafc] transition-all bg-white ${refreshing ? 'animate-spin' : ''}`}
              >
                <RefreshCw size={16} />
              </button>
              {/* Download */}
              <button 
                onClick={handleExport}
                className="w-10 h-10 rounded-lg border border-[#e2e8f0] flex items-center justify-center text-[#475569] cursor-pointer hover:bg-[#f8fafc] transition-colors bg-white"
              >
                <Download size={16} />
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="flex-1 overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#f1f5f9]">
                  <th className="py-4 px-6 text-[10px] font-bold text-[#64748b] uppercase tracking-[0.15em]">Invoice ID</th>
                  <th className="py-4 px-6 text-[10px] font-bold text-[#64748b] uppercase tracking-[0.15em]">Lender</th>
                  <th className="py-4 px-6 text-[10px] font-bold text-[#64748b] uppercase tracking-[0.15em]">Amount</th>
                  <th className="py-4 px-6 text-[10px] font-bold text-[#64748b] uppercase tracking-[0.15em]">Verification Status</th>
                  <th className="py-4 px-6 text-[10px] font-bold text-[#64748b] uppercase tracking-[0.15em]">Fraud Risk</th>
                  <th className="py-4 px-6 text-[10px] font-bold text-[#64748b] uppercase tracking-[0.15em]">Timestamp</th>
                </tr>
              </thead>
              <tbody>
                {paginatedData.map((row, i) => (
                  <tr key={i} className="hover:bg-[#f8fafc] transition-colors border-b border-[#f8fafc] last:border-none">
                    <td className="py-4 px-6 text-[13px] font-bold text-[#0f172a]">{row.id}</td>
                    <td className="py-4 px-6 text-[13px] font-semibold text-[#475569]">{row.lender}</td>
                    <td className="py-4 px-6 text-[13px] font-bold text-[#0f172a]">{formatCurrency(row.amount)}</td>
                    <td className="py-4 px-6">{getStatusBadge(row.status)}</td>
                    <td className="py-4 px-6">{getRiskBadge(row.risk)}</td>
                    <td className="py-4 px-6 text-[13px] font-semibold text-[#64748b]">{row.timestamp}</td>
                  </tr>
                ))}
                {paginatedData.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-16 text-center text-[13px] font-bold text-[#94a3b8] uppercase tracking-wider">
                      No matching verification records
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer */}
          <div className="border-t border-[#f1f5f9] px-6 py-4 flex items-center justify-between shrink-0">
            <span className="text-[12px] font-semibold text-[#94a3b8]">
              Showing <span className="font-bold text-[#475569]">{startEntry}</span> to <span className="font-bold text-[#475569]">{endEntry}</span> of {totalEntries} results
            </span>
            <div className="flex items-center gap-1">
              {/* Prev */}
              <button 
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={safeCurrentPage <= 1}
                className={`w-8 h-8 rounded border border-[#e2e8f0] flex items-center justify-center transition-colors ${safeCurrentPage <= 1 ? 'text-[#cbd5e1] cursor-not-allowed' : 'text-[#475569] hover:bg-[#f8fafc] cursor-pointer'}`}
              >
                <ChevronLeft size={14} />
              </button>
              {/* Page Numbers */}
              {getPageNumbers().map((page, i) => (
                <button
                  key={i}
                  onClick={() => typeof page === 'number' && setCurrentPage(page)}
                  disabled={page === '...'}
                  className={`w-8 h-8 rounded text-[12px] font-bold flex items-center justify-center transition-colors border ${
                    page === safeCurrentPage 
                      ? 'bg-[#1e293b] text-white border-[#1e293b]' 
                      : page === '...' 
                        ? 'border-transparent text-[#94a3b8] cursor-default' 
                        : 'border-[#e2e8f0] text-[#475569] hover:bg-[#f8fafc] cursor-pointer'
                  }`}
                >
                  {page}
                </button>
              ))}
              {/* Next */}
              <button 
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={safeCurrentPage >= totalPages}
                className={`w-8 h-8 rounded border border-[#e2e8f0] flex items-center justify-center transition-colors ${safeCurrentPage >= totalPages ? 'text-[#cbd5e1] cursor-not-allowed' : 'text-[#475569] hover:bg-[#f8fafc] cursor-pointer'}`}
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
