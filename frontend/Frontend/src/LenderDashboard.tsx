import { 
  FileText, Search, ChevronLeft, ChevronRight, 
  Settings, LogOut, AlertTriangle, Building2, BarChart3, ClipboardCheck
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useState, useMemo } from 'react';

// --- Mock Data ---

const verificationData = [
  { time: '14:22:01', id: 'INV-88120', status: 'APPROVED', score: '0.02' },
  { time: '14:18:45', id: 'INV-88119', status: 'REJECTED', score: '0.94' },
  { time: '14:15:22', id: 'INV-88118', status: 'APPROVED', score: '0.05' },
  { time: '14:12:10', id: 'INV-88117', status: 'PENDING', score: '0.42' },
  { time: '13:58:04', id: 'INV-88116', status: 'APPROVED', score: '0.01' },
  { time: '13:45:30', id: 'INV-88115', status: 'APPROVED', score: '0.11' },
  { time: '13:32:11', id: 'INV-88114', status: 'REJECTED', score: '0.88' },
  { time: '13:20:45', id: 'INV-88113', status: 'APPROVED', score: '0.03' },
  { time: '13:08:19', id: 'INV-88112', status: 'APPROVED', score: '0.07' },
  { time: '12:55:33', id: 'INV-88111', status: 'PENDING', score: '0.39' },
  { time: '12:42:01', id: 'INV-88110', status: 'APPROVED', score: '0.02' },
  { time: '12:30:18', id: 'INV-88109', status: 'REJECTED', score: '0.91' },
  { time: '12:18:55', id: 'INV-88108', status: 'APPROVED', score: '0.04' },
  { time: '12:05:40', id: 'INV-88107', status: 'APPROVED', score: '0.06' },
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
    APPROVED: 'text-[#10b981] bg-transparent',
    REJECTED: 'text-white bg-[#1e293b] px-3 py-1 rounded',
    PENDING: 'text-white bg-[#f59e0b] px-3 py-1 rounded',
  };
  return (
    <span className={`text-[12px] font-bold tracking-widest uppercase ${styles[status]}`}>
      {status}
    </span>
  );
};

// --- Main Component ---

export default function LenderDashboard({ onNavigate }: { onNavigate: (page: string) => void }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 7;

  const filteredData = useMemo(() => {
    return verificationData.filter(row => {
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return row.id.toLowerCase().includes(q) || row.status.toLowerCase().includes(q);
    });
  }, [searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredData.length / ITEMS_PER_PAGE));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const paginatedData = filteredData.slice((safeCurrentPage - 1) * ITEMS_PER_PAGE, safeCurrentPage * ITEMS_PER_PAGE);

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
          <SidebarItem icon={BarChart3} label="Verification Monitoring" active />
          <SidebarItem icon={ClipboardCheck} label="Invoice Verification" onClick={() => onNavigate('lender/invoice-verification')} />
          <SidebarItem icon={FileText} label="Invoice History" onClick={() => onNavigate('lender/invoice-history')} />
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
            <h1 className="text-[22px] font-bold text-[#0f172a] mb-1">Lender Dashboard</h1>
            <p className="text-[14px] font-semibold text-[#475569]">Individual institution portal for verification monitoring.</p>
          </div>
          <div className="flex items-center gap-4">
            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94a3b8]" size={16} />
              <input 
                type="text" 
                placeholder="Search invoices..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2.5 bg-white border border-[#e2e8f0] rounded-lg text-[13px] font-medium outline-none placeholder:text-[#94a3b8] text-[#0f172a] w-[220px] shadow-sm focus:border-[#cbd5e1] transition-colors"
              />
            </div>
            {/* Profile */}
            <div className="flex items-center gap-3 bg-[#1e293b] px-4 py-2.5 rounded-lg">
              <div className="text-right">
                <div className="text-[13px] font-bold text-white">Apex Capital Node</div>
                <div className="text-[10px] font-bold text-[#64748b] uppercase tracking-wider">Lender ID: LND-8821</div>
              </div>
              <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-[#f59e0b] to-[#fbbf24] shadow-sm"></div>
            </div>
          </div>
        </header>

        {/* 4 Stat Cards */}
        <div className="grid grid-cols-4 gap-5 mb-8">
          {/* Today's Verifications */}
          <div className="bg-white rounded-xl p-5 border border-[#e2e8f0] shadow-[0_4px_15px_rgba(71,85,105,0.06)]">
            <div className="text-[10px] font-bold text-[#64748b] uppercase tracking-[0.15em] mb-3">Today's Verifications</div>
            <div className="flex items-end justify-between">
              <div className="text-[32px] font-bold text-[#0f172a] leading-none">142</div>
              <span className="text-[11px] font-bold text-[#10b981] mb-1">+12% vs yesterday</span>
            </div>
          </div>

          {/* Approved Count */}
          <div className="bg-white rounded-xl p-5 border border-[#e2e8f0] shadow-[0_4px_15px_rgba(71,85,105,0.06)]">
            <div className="text-[10px] font-bold text-[#64748b] uppercase tracking-[0.15em] mb-3">Approved Count</div>
            <div className="flex items-end justify-between">
              <div className="text-[32px] font-bold text-[#0f172a] leading-none">128</div>
            </div>
            <div className="w-full bg-[#f1f5f9] h-1.5 rounded-full mt-3 overflow-hidden">
              <div className="bg-[#1e293b] h-full w-[90%] rounded-full"></div>
            </div>
          </div>

          {/* Rejected Count */}
          <div className="bg-white rounded-xl p-5 border border-[#e2e8f0] shadow-[0_4px_15px_rgba(71,85,105,0.06)]">
            <div className="text-[10px] font-bold text-[#64748b] uppercase tracking-[0.15em] mb-3">Rejected Count</div>
            <div className="flex items-end justify-between">
              <div className="text-[32px] font-bold text-[#0f172a] leading-none">14</div>
              <span className="text-[11px] font-bold text-[#ef4444] mb-1">9.8% rate</span>
            </div>
          </div>

          {/* High Risk Alerts */}
          <div className="bg-white rounded-xl p-5 border border-[#e2e8f0] shadow-[0_4px_15px_rgba(71,85,105,0.06)]">
            <div className="text-[10px] font-bold text-[#64748b] uppercase tracking-[0.15em] mb-3">High Risk Alerts</div>
            <div className="flex items-end justify-between">
              <div className="text-[32px] font-bold text-[#0f172a] leading-none">3</div>
              <AlertTriangle size={22} className="text-[#f59e0b] mb-1" />
            </div>
          </div>
        </div>

        {/* Main Grid: Table + Risk Alert Summary */}
        <div className="flex gap-6 flex-1 items-stretch">
          
          {/* Recent Verification Activity Table */}
          <div className="flex-1 bg-white rounded-xl border border-[#e2e8f0] shadow-[0_8px_25px_rgba(71,85,105,0.08)] flex flex-col overflow-hidden min-w-0">
            
            {/* Table Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-[#f1f5f9] shrink-0">
              <h3 className="text-[13px] font-bold text-[#0f172a] uppercase tracking-[0.15em]">Recent Verification Activity</h3>
              <button 
                onClick={() => onNavigate('lender/invoice-history')}
                className="text-[11px] font-bold text-[#475569] uppercase tracking-[0.15em] hover:text-[#0f172a] transition-colors cursor-pointer bg-transparent border-none"
              >
                View Full Ledger
              </button>
            </div>

            {/* Table Content */}
            <div className="flex-1 overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[#f1f5f9]">
                    <th className="py-4 px-6 text-[10px] font-bold text-[#64748b] uppercase tracking-[0.15em]">Timestamp</th>
                    <th className="py-4 px-6 text-[10px] font-bold text-[#64748b] uppercase tracking-[0.15em]">Invoice ID</th>
                    <th className="py-4 px-6 text-[10px] font-bold text-[#64748b] uppercase tracking-[0.15em]">Status</th>
                    <th className="py-4 px-6 text-[10px] font-bold text-[#64748b] uppercase tracking-[0.15em] text-right">Risk Score</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedData.map((row, i) => (
                    <tr key={i} className="hover:bg-[#f8fafc] transition-colors border-b border-[#f8fafc] last:border-none">
                      <td className="py-4 px-6 text-[13px] text-[#475569] font-semibold">{row.time}</td>
                      <td className="py-4 px-6 text-[13px] font-bold text-[#0f172a]">{row.id}</td>
                      <td className="py-4 px-6">{getStatusBadge(row.status)}</td>
                      <td className="py-4 px-6 text-[14px] font-bold text-[#0f172a] text-right">{row.score}</td>
                    </tr>
                  ))}
                  {paginatedData.length === 0 && (
                    <tr>
                      <td colSpan={4} className="py-12 text-center text-[12px] font-bold text-[#94a3b8] uppercase tracking-wider">
                        No matching invoices found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Footer */}
            <div className="border-t border-[#f1f5f9] px-6 py-4 flex items-center justify-between mt-auto shrink-0">
              <span className="text-[11px] font-bold text-[#64748b] uppercase tracking-[0.12em]">
                Page {safeCurrentPage} of {totalPages}
              </span>
              <div className="flex gap-2">
                <button 
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={safeCurrentPage <= 1}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-md border border-[#e2e8f0] text-[11px] font-bold uppercase tracking-[0.12em] transition-colors ${safeCurrentPage <= 1 ? 'text-[#cbd5e1] cursor-not-allowed' : 'text-[#475569] hover:bg-[#f8fafc] cursor-pointer'}`}
                >
                  <ChevronLeft size={12} /> Previous
                </button>
                <button 
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={safeCurrentPage >= totalPages}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-md border border-[#e2e8f0] text-[11px] font-bold uppercase tracking-[0.12em] transition-colors ${safeCurrentPage >= totalPages ? 'text-[#cbd5e1] cursor-not-allowed' : 'text-[#0f172a] hover:bg-[#f8fafc] cursor-pointer'}`}
                >
                  Next <ChevronRight size={12} />
                </button>
              </div>
            </div>
          </div>

          {/* Risk Alert Summary */}
          <div className="w-[300px] shrink-0 bg-[#1e293b] rounded-xl shadow-[0_15px_30px_rgba(30,41,59,0.3)] p-6 flex flex-col overflow-hidden">
            
            {/* Card Header */}
            <div className="flex items-center gap-2 mb-6">
              <div className="w-2.5 h-2.5 rounded-full bg-[#ef4444]"></div>
              <h3 className="text-[13px] font-bold text-white uppercase tracking-[0.15em]">Risk Alert Summary</h3>
            </div>

            {/* Alert 1 - Critical Warning */}
            <div className="mb-5 pb-5 border-b border-[#334155]">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold text-[#94a3b8] uppercase tracking-[0.15em]">Critical Warning</span>
                <span className="text-[9px] font-bold text-[#ef4444] uppercase tracking-[0.15em] bg-[#ef4444]/10 px-2 py-0.5 rounded">High Priority</span>
              </div>
              <h4 className="text-[14px] font-bold text-white mb-1.5">Duplicate Hash Detected</h4>
              <p className="text-[12px] text-[#64748b] leading-relaxed">
                Invoice ID INV-88119 matches record from Node LND-2210 dated 2023-11-14.
              </p>
            </div>

            {/* Alert 2 - Pattern Alert */}
            <div className="mb-5 pb-5 border-b border-[#334155]">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold text-[#94a3b8] uppercase tracking-[0.15em]">Pattern Alert</span>
                <span className="text-[9px] font-bold text-[#f59e0b] uppercase tracking-[0.15em] bg-[#f59e0b]/10 px-2 py-0.5 rounded">Medium</span>
              </div>
              <h4 className="text-[14px] font-bold text-white mb-1.5">Rapid Successive Requests</h4>
              <p className="text-[12px] text-[#64748b] leading-relaxed">
                System detected 14 verification requests from same entity within 60 seconds.
              </p>
            </div>

            {/* Alert 3 - Integrity Alert */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold text-[#94a3b8] uppercase tracking-[0.15em]">Integrity Alert</span>
                <span className="text-[9px] font-bold text-[#3b82f6] uppercase tracking-[0.15em] bg-[#3b82f6]/10 px-2 py-0.5 rounded">Info</span>
              </div>
              <h4 className="text-[14px] font-bold text-white mb-1.5">Validation Latency Spike</h4>
              <p className="text-[12px] text-[#64748b] leading-relaxed">
                Consensus layer response time exceeded 400ms for block 88421.
              </p>
            </div>

            {/* CTA Button */}
            <button className="w-full py-3 bg-white text-[#0f172a] rounded-lg text-[12px] font-bold tracking-[0.15em] uppercase hover:bg-[#f8fafc] transition-colors cursor-pointer border-none shadow-sm mt-auto">
              Open Incident Response
            </button>
          </div>

        </div>
      </main>
    </div>
  );
}
