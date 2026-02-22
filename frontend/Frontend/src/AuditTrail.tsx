import {
  ShieldCheck, LayoutGrid, FileText, ShieldAlert,
  Search, ChevronDown, CheckCircle2, ChevronLeft, ChevronRight, Settings, LogOut, ChevronUp, Menu
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useState, useMemo, useRef, useEffect } from 'react';

import api from './api/client';
import Modal from './components/Modal';

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
  const styles: Record<string, string> = {
    LOGGED: 'text-[#64748b] border-[#e2e8f0]',
    DENIED: 'text-white border-[#0f172a] bg-[#0f172a]',
    FLAGGED: 'text-white border-[#64748b] bg-[#64748b]',
  };
  return (
    <span className={`px-2 py-0.5 rounded-[4px] text-[9px] font-bold tracking-widest border border-transparent shadow-[0_1px_2px_rgba(71,85,105,0.05)] ${styles[status]}`}>
      {status}
    </span>
  );
};

export default function AuditTrail({ onNavigate }: { onNavigate: (page: string) => void }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [ledgerData, setLedgerData] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [lenderFilter, setLenderFilter] = useState('All Participants');
  const [statusFilter, setStatusFilter] = useState('All Records');
  const [currentPage, setCurrentPage] = useState(1);
  const [lenderOpen, setLenderOpen] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);

  const [chainState, setChainState] = useState({ prevHash: 'GENESIS_HASH', currHash: '...syncing', valid: true, msg: 'Waiting for logs', verifying: false });
  const [stats, setStats] = useState({ totalLogs: 0, nodes: 0 });

  const ITEMS_PER_PAGE = 8;

  const lenderRef = useRef<HTMLDivElement>(null);
  const statusRef = useRef<HTMLDivElement>(null);

  // Modal State
  const [modalConfig, setModalConfig] = useState<{isOpen: boolean, title: string, message: string, icon?: React.ReactNode}>({
    isOpen: false, title: '', message: ''
  });

  const showModal = (title: string, message: string, icon: React.ReactNode = <ShieldAlert size={24} className="text-[#ef4444]" />) => {
    setModalConfig({ isOpen: true, title, message, icon });
  };

  // Close dropdowns on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (lenderRef.current && !lenderRef.current.contains(e.target as Node)) setLenderOpen(false);
      if (statusRef.current && !statusRef.current.contains(e.target as Node)) setStatusOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    const fetchAudit = async () => {
      try {
        const res = await api.get('/audit');
        const logs = res.data.logs || [];

        const mapped = logs.map((log: any) => {
          const dt = new Date(log.timestamp);
          let displayStatus = 'LOGGED';
          if (log.status === 'DUPLICATE_DETECTED' || log.status.startsWith('REJECTED_')) displayStatus = 'DENIED';
          else if (log.status === 'PENDING' || log.status === 'PENDING_VERIFICATION') displayStatus = 'FLAGGED';

          return {
            time: dt.toLocaleTimeString('en-US', { hour12: false, fractionalSecondDigits: 2 }),
            id: `LOG-${log.id}`,
            hash: '0x' + (log.current_hash || '0').substring(0, 32) + '...',
            lender: log.actor_role,
            status: displayStatus,
            score: log.fraud_score != null ? parseFloat(log.fraud_score).toFixed(2) : '0.00'
          };
        });

        setLedgerData(mapped);

        if (logs.length > 0) {
          setChainState(prev => ({ ...prev, prevHash: logs[0].previous_hash, currHash: logs[0].current_hash }));
        }

        const uniqueRoles = new Set(logs.map((l: any) => l.actor_role));
        setStats({ totalLogs: res.data.total || logs.length, nodes: uniqueRoles.size });

      } catch (err) {
        console.error("Failed to fetch audit data:", err);
      }
    };
    fetchAudit();
  }, []);

  const runValidation = async () => {
    setChainState(prev => ({ ...prev, verifying: true }));
    try {
      const res = await api.get('/audit/verify-chain');
      setChainState(prev => ({ ...prev, verifying: false, valid: res.data.isValid, msg: res.data.message || 'Validation Complete' }));
      if (!res.data.isValid) {
        showModal("CRITICAL WARNING", "Ledger integrity compromised. " + JSON.stringify(res.data.tamperedRecords));
      } else {
        showModal("Validation Complete", "The ledger is cryptographically secure. No tampering detected.", <ShieldCheck size={24} className="text-[#10b981]" />);
      }
    } catch (err) {
      setChainState(prev => ({ ...prev, verifying: false, valid: false, msg: 'Validation failed to run.' }));
      showModal("Validation Error", "Failed to connect to consensus nodes. Please try again later.", <ShieldAlert size={24} className="text-[#f59e0b]" />);
    }
  };

  const uniqueLenders = useMemo(() => ['All Participants', ...Array.from(new Set(ledgerData.map(r => r.lender)))], []);
  const uniqueStatuses = useMemo(() => ['All Records', ...Array.from(new Set(ledgerData.map(r => r.status)))], []);

  const filteredData = useMemo(() => {
    return ledgerData.filter(row => {
      const matchesSearch = !searchQuery || row.id.toLowerCase().includes(searchQuery.toLowerCase()) || row.hash.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesLender = lenderFilter === 'All Participants' || row.lender === lenderFilter;
      const matchesStatus = statusFilter === 'All Records' || row.status === statusFilter;
      return matchesSearch && matchesLender && matchesStatus;
    });
  }, [searchQuery, lenderFilter, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredData.length / ITEMS_PER_PAGE));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const paginatedData = filteredData.slice((safeCurrentPage - 1) * ITEMS_PER_PAGE, safeCurrentPage * ITEMS_PER_PAGE);

  return (
    <div className="flex h-screen w-full bg-[#f8fafc] text-[#0f172a] overflow-hidden">

      {/* Sidebar - Matches requested state */}
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
            <LayoutGrid className="text-white" size={24} />
          </div>
          {isSidebarOpen && (
            <div className="flex flex-col">
              <span className="text-[18px] font-bold text-white leading-tight tracking-tight whitespace-nowrap">Admin</span>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-1 flex-1">
          <SidebarItem icon={LayoutGrid} label="Risk Overview" onClick={() => onNavigate('admin')} isCollapsed={!isSidebarOpen} />
          <SidebarItem icon={FileText} label="Audit Trail" active isCollapsed={!isSidebarOpen} />
          <SidebarItem icon={ShieldAlert} label="Fraud Insights" onClick={() => onNavigate('admin/fraud-insights')} isCollapsed={!isSidebarOpen} />
        </div>

        <div className="flex flex-col gap-1 pt-4 mt-auto border-t border-[#334155]">
          <SidebarItem icon={Settings} label="Preferences" onClick={() => showModal('Preferences', 'Global admin preferences will be unlocked in v1.1.', <Settings size={24} className="text-[#3b82f6]" />)} isCollapsed={!isSidebarOpen} />
          <SidebarItem icon={LogOut} label="Sign Out" onClick={() => onNavigate?.('')} isCollapsed={!isSidebarOpen} />
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 pr-4 pb-4 pt-4 pl-6 overflow-y-auto">

        {/* Header */}
        <header className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-[20px] font-bold text-[#0f172a] mb-0.5">Immutable Financing Ledger</h1>
            <p className="text-[11px] font-medium text-[#64748b]">All financing decisions are cryptographically hash-linked for audit integrity.</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="text-[14px] font-bold text-[#0f172a]">Risk Admin</div>
              <div className="text-[12px] font-bold text-[#94a3b8]">Compliance Oversight</div>
            </div>
            <div className="w-10 h-10 bg-gradient-to-tr from-[#e2e8f0] to-[#f8fafc] shadow-sm ml-1 border-2 border-white"></div>
          </div>
        </header>

        {/* Top Controls Toolbar */}
        <div className="bg-white rounded-xl shadow-[0_4px_15px_rgba(71,85,105,0.06)] border border-[#e2e8f0] p-2 mb-4 flex gap-3">
          <div className="flex-1 relative flex items-center">
            <Search className="absolute left-3 text-[#94a3b8]" size={14} />
            <input
              type="text"
              placeholder="Search by Invoice ID or Hash..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 py-1.5 text-[11px] font-medium outline-none placeholder:text-[#94a3b8] text-[#0f172a]"
            />
          </div>
          <div className="w-[1px] h-6 bg-[#e2e8f0] my-auto"></div>

          {/* Lender Dropdown */}
          <div ref={lenderRef} className="w-[200px] relative">
            <div
              onClick={() => { setLenderOpen(!lenderOpen); setStatusOpen(false); }}
              className="px-3 py-1 flex items-center justify-between cursor-pointer group"
            >
              <span className="text-[11px] font-bold text-[#475569] group-hover:text-[#0f172a] transition-colors truncate">
                Lender: {lenderFilter}
              </span>
              {lenderOpen ? <ChevronUp size={14} className="text-[#94a3b8] shrink-0" /> : <ChevronDown size={14} className="text-[#94a3b8] shrink-0" />}
            </div>
            {lenderOpen && (
              <div className="absolute top-full left-0 min-w-full w-max mt-1 bg-white border border-[#e2e8f0] rounded-lg shadow-[0_8px_25px_rgba(71,85,105,0.15)] z-50 py-1 max-h-[200px] overflow-y-auto">
                {uniqueLenders.map(lender => (
                  <div
                    key={lender}
                    onClick={() => { setLenderFilter(lender); setLenderOpen(false); }}
                    className={`px-3 py-2 text-[11px] font-bold cursor-pointer transition-colors whitespace-nowrap ${lenderFilter === lender ? 'bg-[#f1f5f9] text-[#0f172a]' : 'text-[#475569] hover:bg-[#f8fafc]'}`}
                  >
                    {lender}
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="w-[1px] h-6 bg-[#e2e8f0] my-auto"></div>

          {/* Status Dropdown */}
          <div ref={statusRef} className="w-[180px] relative">
            <div
              onClick={() => { setStatusOpen(!statusOpen); setLenderOpen(false); }}
              className="px-3 py-1 flex items-center justify-between cursor-pointer group"
            >
              <span className="text-[11px] font-bold text-[#475569] group-hover:text-[#0f172a] transition-colors truncate">
                Status: {statusFilter}
              </span>
              {statusOpen ? <ChevronUp size={14} className="text-[#94a3b8] shrink-0" /> : <ChevronDown size={14} className="text-[#94a3b8] shrink-0" />}
            </div>
            {statusOpen && (
              <div className="absolute top-full left-0 min-w-full w-max mt-1 bg-white border border-[#e2e8f0] rounded-lg shadow-[0_8px_25px_rgba(71,85,105,0.15)] z-50 py-1">
                {uniqueStatuses.map(status => (
                  <div
                    key={status}
                    onClick={() => { setStatusFilter(status); setStatusOpen(false); }}
                    className={`px-3 py-2 text-[11px] font-bold cursor-pointer transition-colors whitespace-nowrap ${statusFilter === status ? 'bg-[#f1f5f9] text-[#0f172a]' : 'text-[#475569] hover:bg-[#f8fafc]'}`}
                  >
                    {status}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Main 2-Column Grid */}
        <div className="flex gap-4 items-stretch pb-4 flex-1">

          {/* Ledger Table */}
          <div className="flex-1 bg-white rounded-xl border border-[#e2e8f0] shadow-[0_8px_25px_rgba(71,85,105,0.12)] p-1 overflow-hidden min-w-0 flex flex-col">
            <div className="flex-1 overflow-x-auto">
              <table className="w-full text-left border-collapse whitespace-nowrap">
                <thead>
                  <tr>
                    <th className="py-3 px-3 text-[10px] font-bold text-[#64748b] uppercase tracking-widest border-b border-[#f1f5f9]">Timestamp</th>
                    <th className="py-3 px-3 text-[10px] font-bold text-[#64748b] uppercase tracking-widest border-b border-[#f1f5f9]">Invoice ID</th>
                    <th className="py-3 px-3 text-[10px] font-bold text-[#64748b] uppercase tracking-widest border-b border-[#f1f5f9]">Invoice Hash</th>
                    <th className="py-3 px-3 text-[10px] font-bold text-[#64748b] uppercase tracking-widest border-b border-[#f1f5f9]">Lender</th>
                    <th className="py-3 px-3 text-[10px] font-bold text-[#64748b] uppercase tracking-widest border-b border-[#f1f5f9]">Status</th>
                    <th className="py-3 px-3 text-[10px] font-bold text-[#64748b] uppercase tracking-widest border-b border-[#f1f5f9] text-right">Fraud Score</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedData.map((row, i) => (
                    <tr key={i} className="hover:bg-[#f8fafc] transition-colors border-b border-[#f1f5f9] last:border-none">
                      <td className="py-3 px-3 text-[11px] text-[#475569] font-bold align-middle">{row.time}</td>
                      <td className="py-3 px-3 text-[11px] font-bold text-[#0f172a] align-middle">{row.id}</td>
                      <td className="py-3 px-3 align-middle">
                        <div className="bg-[#f8fafc] text-[#64748b] text-[10px] font-mono py-1 px-2 rounded w-fit border border-[#e2e8f0] shadow-[0_1px_2px_rgba(71,85,105,0.05)]">{row.hash}</div>
                      </td>
                      <td className="py-3 px-3 text-[11px] text-[#334155] font-bold align-middle pr-4 leading-tight whitespace-normal">
                        {row.lender}
                      </td>
                      <td className="py-3 px-3 align-middle">
                        {getStatusBadge(row.status)}
                      </td>
                      <td className="py-3 px-3 text-[12px] font-bold text-[#475569] text-right align-middle">
                        {row.score}
                      </td>
                    </tr>
                  ))}
                  {paginatedData.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-[12px] font-bold text-[#94a3b8] uppercase tracking-wider">
                        No matching entries found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>

            </div>

            {/* Pagination Footer */}
            <div className="border-t border-[#f1f5f9] px-5 py-4 flex items-center justify-between mt-auto">
              <span className="text-[11px] font-bold text-[#64748b] tracking-wider uppercase">
                Showing {paginatedData.length} of {filteredData.length} Entries
                {(searchQuery || lenderFilter !== 'All Participants' || statusFilter !== 'All Records') &&
                  <span className="text-[#94a3b8]"> (filtered from {ledgerData.length})</span>
                }
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={safeCurrentPage <= 1}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-[#e2e8f0] text-[10px] font-bold uppercase tracking-widest transition-colors ${safeCurrentPage <= 1 ? 'text-[#cbd5e1] cursor-not-allowed' : 'text-[#475569] hover:bg-[#f8fafc] cursor-pointer'}`}
                >
                  <ChevronLeft size={12} /> Prev
                </button>
                <span className="flex items-center px-2 text-[10px] font-bold text-[#475569]">{safeCurrentPage} / {totalPages}</span>
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={safeCurrentPage >= totalPages}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-[#e2e8f0] text-[10px] font-bold uppercase tracking-widest transition-colors ${safeCurrentPage >= totalPages ? 'text-[#cbd5e1] cursor-not-allowed' : 'text-[#0f172a] hover:bg-[#f8fafc] cursor-pointer'}`}
                >
                  Next <ChevronRight size={12} />
                </button>
              </div>
            </div>
          </div>

          {/* Right Sidebar Modules */}
          <div className="w-[260px] shrink-0 flex flex-col gap-4">

            {/* Chain Integrity Card */}
            <div className="bg-[#1e293b] rounded-xl p-5 shadow-[0_15px_30px_rgba(30,41,59,0.3)] border border-[#334155] relative overflow-hidden">
              {/* Background accents */}
              <div className="absolute top-0 right-0 w-24 h-24 bg-white opacity-[0.03] rounded-full blur-2xl -translate-y-1/2 translate-x-1/2"></div>

              <div className="flex items-center gap-2 mb-6 relative z-10">
                <ShieldCheck size={14} className="text-white" />
                <h2 className="text-[11px] font-bold text-white tracking-widest uppercase m-0">Chain Integrity</h2>
              </div>

              <div className="mb-4 relative z-10 w-full overflow-hidden">
                <div className="text-[9px] font-bold text-[#94a3b8] uppercase tracking-widest mb-1.5">Previous Hash</div>
                <div className="bg-[#0f172a] border border-[#334155] rounded-xl p-3 text-[10px] font-mono text-[#cbd5e1] break-all leading-relaxed shadow-inner truncate">
                  {chainState.prevHash}
                </div>
              </div>

              <div className="mb-6 relative z-10 w-full overflow-hidden">
                <div className="text-[9px] font-bold text-[#94a3b8] uppercase tracking-widest mb-1.5">Current Hash</div>
                <div className="bg-[#0f172a] border border-[#334155] rounded-xl p-3 text-[10px] font-mono text-[#cbd5e1] break-all leading-relaxed shadow-inner truncate">
                  {chainState.currHash}
                </div>
              </div>

              <div className="flex items-center gap-3 mb-6 pt-4 border-t border-[#334155] relative z-10">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${chainState.valid ? 'bg-[#10b981]' : 'bg-[#ef4444]'}`}>
                  {chainState.valid ? <CheckCircle2 size={16} className="text-white" strokeWidth={2.5} /> : <ShieldAlert size={16} className="text-white" strokeWidth={2.5} />}
                </div>
                <div>
                  <div className="text-[12px] font-bold text-white">{chainState.valid ? 'Chain Verified' : 'Breach Detected'}</div>
                  <div className={`text-[10px] mt-0.5 ${chainState.valid ? 'text-[#94a3b8]' : 'text-[#ef4444]'}`}>{chainState.msg}</div>
                </div>
              </div>

              <button disabled={chainState.verifying} onClick={runValidation} className={`w-full py-2.5 ${chainState.verifying ? 'bg-[#475569]' : 'bg-[#334155] hover:bg-[#475569]'} text-white text-[10px] font-bold uppercase tracking-widest rounded-xl transition-colors border border-white/10 relative z-10 shadow-lg cursor-pointer`}>
                {chainState.verifying ? 'Validating Nodes...' : 'Run Deep Validation'}
              </button>
            </div>

            {/* Registry Summary Card */}
            <div className="bg-white rounded-xl p-5 border border-[#e2e8f0] shadow-[0_8px_25px_rgba(71,85,105,0.12)]">
              <h3 className="text-[11px] font-bold text-[#0f172a] uppercase tracking-widest mb-5">Registry Summary</h3>

              <div className="flex flex-col gap-4">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-bold text-[#64748b] tracking-widest uppercase">Active Nodes</span>
                  <span className="text-[13px] font-bold text-[#0f172a]">{stats.nodes || 1}</span>
                </div>

                <div className="w-full h-[1px] bg-[#f1f5f9]"></div>

                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-bold text-[#64748b] tracking-widest uppercase">Ledger Uptime</span>
                  <span className="text-[13px] font-bold text-[#0f172a]">99.99%</span>
                </div>

                <div className="w-full h-[1px] bg-[#f1f5f9]"></div>

                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-bold text-[#64748b] tracking-widest uppercase">Daily Volume</span>
                  <span className="text-[13px] font-bold text-[#0f172a]">₹14.2M</span>
                </div>
              </div>
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
