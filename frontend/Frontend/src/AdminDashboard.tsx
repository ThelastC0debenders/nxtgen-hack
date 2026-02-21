import { 
  LayoutGrid, ShieldAlert, ShieldCheck, 
  Settings, LogOut, Search, FileText, Ban, Zap, 
  Calendar, CheckCircle2, XCircle, AlertTriangle 
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { 
  Radar, RadarChart, PolarGrid, PolarAngleAxis, ResponsiveContainer,
  BarChart, Bar, XAxis, Cell
} from 'recharts';
import { useState, useEffect } from 'react';

// --- Mock Data ---

const CountUp = ({ end, duration = 2000 }: { end: number, duration?: number }) => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let startTime: number | null = null;
    const updateCount = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = timestamp - startTime;
      const percentage = Math.min(progress / duration, 1);
      const easeProgress = percentage === 1 ? 1 : 1 - Math.pow(2, -10 * percentage);
      setCount(Math.min(end, Math.floor(easeProgress * end)));
      if (progress < duration) {
        requestAnimationFrame(updateCount);
      } else {
        setCount(end);
      }
    };
    requestAnimationFrame(updateCount);
  }, [end, duration]);

  return <span>{count.toLocaleString()}</span>;
};


const registryLogs = [
  { time: '14:22:01', id: 'INV-1001', desc: 'Approved – Lender A Registry', status: 'LOGGED', type: 'success' },
  { time: '14:21:45', id: 'INV-1001', desc: 'Duplicate Attempt – Lender B', status: 'DENIED', type: 'error' },
  { time: '14:20:30', id: 'VND-V22', desc: 'High Risk Score detected (0.89)', status: 'FLAGGED', type: 'warning' },
  { time: '14:19:12', id: 'INV-0998', desc: 'Approved – Bank of Heritage', status: 'LOGGED', type: 'success' },
  { time: '14:18:55', id: 'INV-0997', desc: 'Approved – Apex Capital', status: 'LOGGED', type: 'success' },
  { time: '14:17:02', id: 'INV-0882', desc: 'Invalid VAT checksum format', status: 'DENIED', type: 'error' },
  { time: '14:15:21', id: 'INV-0996', desc: 'Approved – Lender A', status: 'LOGGED', type: 'success' },
  { time: '14:14:44', id: 'VND-V12', desc: 'Expired certificate in KYC module', status: 'REVIEW', type: 'warning' },
  { time: '14:12:00', id: 'INV-0995', desc: 'Approved – Global Trust', status: 'LOGGED', type: 'success' },
  { time: '14:10:33', id: 'INV-0994', desc: 'Approved – Lender B', status: 'LOGGED', type: 'success' },
];

const radarData = [
  { subject: 'IDENTITY', A: 80, B: 100, fullMark: 100 },
  { subject: 'HISTORY', A: 90, B: 100, fullMark: 100 },
  { subject: 'VELOCITY', A: 60, B: 100, fullMark: 100 },
  { subject: 'VOLUME', A: 85, B: 100, fullMark: 100 },
  { subject: 'NETWORK', A: 70, B: 100, fullMark: 100 },
];

const barData = [
  { name: 'MON', value: 30, color: '#f1f5f9' },
  { name: 'TUE', value: 45, color: '#f1f5f9' },
  { name: 'WED', value: 35, color: '#f1f5f9' },
  { name: 'THU', value: 85, color: '#ef4444' }, // Highlighted Red
  { name: 'FRI', value: 40, color: '#f1f5f9' },
  { name: 'SAT', value: 20, color: '#f1f5f9' },
  { name: 'SUN', value: 15, color: '#f1f5f9' },
];

// --- Subcomponents ---

const SidebarItem = ({ icon: Icon, label, active = false, onClick }: { icon: LucideIcon, label: string, active?: boolean, onClick?: () => void }) => (
  <div onClick={onClick} className={`flex items-center gap-3.5 px-3 py-3 mb-1 rounded-lg cursor-pointer transition-all ${active ? 'bg-white/10' : 'hover:bg-white/5 relative overflow-hidden group'}`}>
    {!active && <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-[100%] group-hover:translate-x-[100%] transition-transform duration-700 ease-in-out"></div>}
    <Icon size={18} className={`${active ? 'text-white' : 'text-[#94a3b8]'} relative z-10`} strokeWidth={active ? 2.5 : 2} />
    <span className={`text-[14px] relative z-10 ${active ? 'text-white font-bold' : 'text-[#94a3b8] font-semibold'}`}>{label}</span>
  </div>
);

const StatCard = ({ icon: Icon, title, value, unit = "" }: { icon: LucideIcon, title: string, value: number, unit?: string }) => (
  <div className="bg-white rounded-xl p-5 flex flex-col justify-center border border-[#e2e8f0] flex-1 shadow-[0_8px_25px_rgba(71,85,105,0.12)]">
    <div className="flex items-center gap-4">
      <div className="bg-[#f8fafc] w-[48px] h-[48px] rounded-lg flex items-center justify-center border border-[#e2e8f0]">
        <Icon size={20} className="text-[#475569]" strokeWidth={2} />
      </div>
      <div className="flex flex-col gap-1">
        <div className="text-[14px] font-bold text-[#475569] uppercase tracking-wider">{title}</div>
        <div className="text-[24px] font-bold text-[#0f172a] leading-none">
          <CountUp end={value} /> {unit && <span className="text-[14px] font-semibold text-[#475569] ml-1">{unit}</span>}
        </div>
      </div>
    </div>
  </div>
);

const getStatusBadge = (status: string, type: string) => {
  const styles: Record<string, string> = {
    success: 'text-[#475569] border-[#e2e8f0]', // "LOGGED"
    error: 'text-[#ef4444] border-[#fecaca] bg-[#fef2f2]', // "DENIED"
    warning: 'text-[#f59e0b] border-[#fde68a] bg-[#fffbeb]', // "FLAGGED" / "REVIEW"
  };
  return (
    <span className={`px-2 py-[2px] text-[14px] font-bold tracking-wider border ${styles[type]}`}>
      {status}
    </span>
  );
};

// --- Main Layout ---

const AdminDashboard = ({ onNavigate }: { onNavigate?: (path: string) => void }) => {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredLogs = registryLogs.filter(log => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return log.id.toLowerCase().includes(q) || log.desc.toLowerCase().includes(q) || log.status.toLowerCase().includes(q);
  });

  return (
    <div className="flex h-screen w-full bg-[#f1f5f9] text-[#0f172a] overflow-hidden">

      {/* Sidebar - Fixed Height 100vh */}
      <aside className="w-[230px] h-screen shrink-0 flex flex-col px-4 py-6 bg-[#1e293b]">
        {/* Top Logo Area */}
        <div className="flex items-center gap-3 mb-10 px-2 mt-2">
          <div className="bg-white/10 rounded-lg p-2.5 flex items-center justify-center">
            <LayoutGrid className="text-white" size={24} />
          </div>
          <div className="flex flex-col">
            <span className="text-[18px] font-bold text-white leading-tight tracking-tight">Admin</span>
          </div>
        </div>

        <div className="flex flex-col gap-1 flex-1">
          <SidebarItem icon={LayoutGrid} label="Risk Overview" active />
          <SidebarItem icon={FileText} label="Audit Trails" onClick={() => onNavigate?.('admin/audit-trail')} />
          <SidebarItem icon={ShieldAlert} label="Fraud Insights" onClick={() => onNavigate?.('admin/fraud-insights')} />
        </div>

        <div className="flex flex-col gap-1 pt-4 mt-auto border-t border-[#334155]">
          <SidebarItem icon={Settings} label="Preferences" />
          <SidebarItem icon={LogOut} label="Sign Out" />
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 pr-6 pb-6 pt-6 pl-6 overflow-y-auto">
        
        {/* Top Header */}
        <header className="flex items-center justify-between mb-8">
          <div className="relative w-full max-w-[500px]">
            <Search className="absolute left-[18px] top-1/2 -translate-y-1/2 text-[#475569]" size={18} />
            <input 
              type="text" 
              placeholder="Search Risk IDs, Vendors, or Sessions..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white py-3.5 pl-12 pr-4 text-[14px] text-[#0f172a] outline-none shadow-[0_8px_25px_rgba(71,85,105,0.08)] border-none focus:ring-2 focus:ring-[#e2e8f0] transition-shadow placeholder:text-[#475569]"
            />
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="text-[14px] font-bold text-[#0f172a]">Risk Admin</div>
              <div className="text-[12px] font-bold text-[#94a3b8]">Compliance Oversight</div>
            </div>
            <div className="w-10 h-10 bg-gradient-to-tr from-[#e2e8f0] to-[#f8fafc] shadow-sm ml-1 border-2 border-white"></div>
          </div>
        </header>

        {/* 4 Stat Cards */}
        <div className="flex gap-6 mb-6">
          <StatCard icon={FileText} title="Total Invoices Verified" value={12482} />
          <StatCard icon={Ban} title="Duplicate Attempts Blocked" value={382} />
          <StatCard icon={Zap} title="Avg Verification Latency" value={143} unit="ms" />
          <StatCard icon={ShieldAlert} title="High Risk Vendors" value={29} />
        </div>

        {/* Main Grid: Left Column and Right Profile */}
        <div className="flex gap-6 items-start">
          
          {/* Left Column */}
          <div className="flex-1 flex flex-col gap-6 min-w-0">
            
            {/* High Density Registry Log */}
            <div className="bg-white rounded-xl border border-[#e2e8f0] overflow-hidden flex flex-col h-[400px] shadow-[0_8px_25px_rgba(71,85,105,0.12)]">
              <div className="flex items-center justify-between px-6 py-5 border-b border-[#f1f5f9] shrink-0">
                <h3 className="text-[14px] font-bold text-[#0f172a] tracking-wider uppercase m-0">High-Density Registry Log</h3>
                <div className="px-2.5 py-1 bg-[#f1f5f9] text-[14px] font-bold text-[#475569] tracking-wider uppercase">Real-Time Sync</div>
              </div>
              <div className="flex-1 overflow-y-auto px-2 pb-2 custom-scrollbar">
                <table className="w-full text-left border-none">
                  <tbody>
                    {filteredLogs.map((log, i) => (
                      <tr key={i} className="hover:bg-[#f8fafc] transition-colors border-b border-[#f1f5f9] last:border-none">
                        <td className="py-3.5 px-4 text-[14px] text-[#475569] font-semibold w-[90px]">{log.time}</td>
                        <td className="py-3.5 px-2 w-[130px]">
                          <div className="flex items-center gap-2 text-[14px] font-semibold text-[#334155]">
                            {log.type === 'success' && <CheckCircle2 size={16} className="text-[#10b981]" strokeWidth={2}/>}
                            {log.type === 'error' && <XCircle size={16} className="text-[#ef4444]" strokeWidth={2} />}
                            {log.type === 'warning' && <AlertTriangle size={16} className="text-[#f59e0b]" strokeWidth={2} />}
                            {log.id}
                          </div>
                        </td>
                        <td className="py-3.5 px-2 text-[14px] text-[#475569]">{log.desc}</td>
                        <td className="py-3.5 px-4 text-right">
                          {getStatusBadge(log.status, log.type)}
                        </td>
                      </tr>
                    ))}
                    {filteredLogs.length === 0 && (
                      <tr>
                        <td colSpan={4} className="py-12 text-center text-[13px] font-bold text-[#94a3b8] uppercase tracking-wider">
                          No matching log entries
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              <div className="py-4 border-t border-[#f1f5f9] text-center shrink-0">
                <button className="text-[14px] font-bold text-[#475569] uppercase tracking-wider hover:text-[#0f172a] transition-colors cursor-pointer bg-transparent border-none">View All Transactions</button>
              </div>
            </div>

            {/* Risk Profile Analysis */}
            <div className="bg-white rounded-xl border border-[#e2e8f0] p-6 shadow-[0_8px_25px_rgba(71,85,105,0.12)]">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-[15px] font-bold text-[#0f172a] m-0 mb-1">Risk Profile Analysis</h3>
                  <div className="text-[14px] font-semibold text-[#475569] tracking-wider uppercase">Multi-Vector Fraud Correlation</div>
                </div>
                <div className="flex items-center gap-4 text-[14px] font-semibold text-[#475569]">
                  <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-[#1e293b]"></div>Current</div>
                  <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-[#cbd5e1]"></div>Baseline</div>
                </div>
              </div>

              <div className="flex items-center justify-between mt-6 px-4">
                {/* Radar Chart */}
                <div className="w-[300px] h-[260px] -ml-5 shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart cx="50%" cy="50%" outerRadius="75%" data={radarData}>
                      <PolarGrid stroke="#e2e8f0" strokeWidth={1} />
                      <PolarAngleAxis dataKey="subject" tick={{ fill: '#475569', fontSize: 10, fontWeight: 600 }} />
                      <Radar name="Current" dataKey="A" stroke="#e2e8f0" fill="#e2e8f0" fillOpacity={0.6} />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>

                {/* Right Side Stats */}
                <div className="flex-1 flex flex-col gap-5 max-w-[320px]">
                  <div className="bg-[#f8fafc] rounded-lg p-5 border border-[#e2e8f0] shadow-[0_4px_15px_rgba(71,85,105,0.06)]">
                    <div className="flex justify-between items-end mb-2">
                      <div className="text-[14px] font-bold text-[#0f172a]">Fraud Score Index</div>
                      <div className="text-[24px] font-bold text-[#0f172a] leading-none">72.4</div>
                    </div>
                    <div className="w-full bg-[#e2e8f0] h-1.5 rounded-full mb-3 overflow-hidden">
                      <div className="bg-[#1e293b] h-full w-[72%] rounded-full"></div>
                    </div>
                    <div className="text-[14px] italic text-[#475569]">Moderately high velocity detected in secondary markets.</div>
                  </div>

                  <div className="bg-[#f8fafc] rounded-lg p-5 border border-[#e2e8f0] shadow-[0_4px_15px_rgba(71,85,105,0.06)]">
                    <div className="flex justify-between items-end mb-2">
                      <div className="text-[14px] font-bold text-[#0f172a]">Anomalous Clusters</div>
                      <div className="text-[24px] font-bold text-[#0f172a] leading-none">04</div>
                    </div>
                    <div className="w-full bg-[#e2e8f0] h-1.5 rounded-full mb-3 overflow-hidden">
                      <div className="bg-[#1e293b] h-full w-[40%] rounded-full"></div>
                    </div>
                    <div className="text-[14px] italic text-[#475569]">Concentrated activities found in region AF-9.</div>
                  </div>
                </div>
              </div>
            </div>

          </div>

          {/* Right Column */}
          <div className="w-[300px] shrink-0 flex flex-col gap-6">
            
            {/* Duplicate Attempts */}
            <div className="bg-white rounded-xl border border-[#e2e8f0] p-6 pb-2 flex flex-col h-[350px] overflow-hidden shadow-[0_8px_25px_rgba(71,85,105,0.12)]">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h3 className="text-[15px] font-bold text-[#0f172a] m-0 mb-1">Duplicate Attempts</h3>
                  <div className="text-[14px] font-bold text-[#475569] uppercase tracking-wider">Blocked Trend (7 Days)</div>
                </div>
                <div className="p-1.5 bg-[#f8fafc] rounded-md border border-[#e2e8f0] text-[#475569] cursor-pointer hover:bg-[#f1f5f9]">
                  <Calendar size={16} />
                </div>
              </div>

              {/* Bar Chart */}
              <div className="flex-1 w-[calc(100%+20px)] -ml-5 mt-4 h-full relative">
                 <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={barData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                    <XAxis 
                      dataKey="name" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: '#475569', fontSize: 10, fontWeight: 600 }}
                      dy={10}
                    />
                    <Bar dataKey="value" radius={[4, 4, 4, 4]} barSize={20}>
                      {barData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Small Stats */}
            <div className="bg-white rounded-xl border border-[#e2e8f0] p-5 flex justify-between items-center shadow-[0_8px_25px_rgba(71,85,105,0.12)]">
              <div className="text-[14px] font-bold text-[#475569] tracking-wider uppercase">Avg Daily Blocks</div>
              <div className="text-[16px] font-bold text-[#0f172a]">47.8</div>
            </div>

            <div className="bg-white rounded-xl border border-[#e2e8f0] p-5 flex justify-between items-center shadow-[0_8px_25px_rgba(71,85,105,0.12)]">
              <div className="text-[14px] font-bold text-[#475569] tracking-wider uppercase">Peak Threshold</div>
              <div className="text-[14px] font-bold text-[#ef4444]">90 / Day</div>
            </div>

            {/* Policy Update Notice */}
            <div className="bg-[#1e293b] rounded-xl shadow-[0_15px_30px_rgba(30,41,59,0.3)] p-6 text-white overflow-hidden relative flex-1 flex flex-col justify-between">
              <div className="absolute -right-8 -top-8 w-24 h-24 bg-white opacity-5 blur-2xl rounded-full"></div>
              
              <div>
                <div className="flex items-center gap-2 mb-3 relative z-10">
                  <ShieldCheck size={16} className="text-[#64748b]" />
                  <div className="text-[14px] font-bold tracking-wide">Policy Update</div>
                </div>
                <p className="text-[14px] text-[#64748b] leading-relaxed mb-4 relative z-10 pr-2">
                  System adjusted fraud sensitivity to 0.85 for Tier-1 institutions. Review active rules to ensure compliance.
                </p>
                <div className="relative z-10 flex flex-col gap-2 mb-6">
                   <div className="flex items-center gap-2 text-[14px] text-[#cbd5e1]">
                     <div className="w-1.5 h-1.5 bg-[#10b981] rounded-full"></div>
                     Velocity Checks: Active
                   </div>
                   <div className="flex items-center gap-2 text-[14px] text-[#cbd5e1]">
                     <div className="w-1.5 h-1.5 bg-[#f59e0b] rounded-full"></div>
                     Network Graphs: Syncing
                   </div>
                </div>
              </div>

              <button className="w-full py-2.5 bg-[#334155] border border-white/10 rounded-lg text-[14px] font-bold tracking-widest hover:bg-[#475569] transition-colors relative z-10 cursor-pointer text-white mt-auto">
                UPDATE POLICY
              </button>
            </div>

          </div>

        </div>
      </main>
    </div>
  );
};

export default AdminDashboard;
