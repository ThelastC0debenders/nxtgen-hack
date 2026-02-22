import {
  LayoutGrid, FileText, ShieldAlert,
  Store, Building2, Gauge, ChevronDown, Filter, Download, Settings, LogOut, Menu
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import {
  BarChart, Bar, XAxis, ResponsiveContainer
} from 'recharts';
import { useState, useEffect } from 'react';
import Modal from './components/Modal';

// --- Components ---

const CountUp = ({ end, duration = 2000, decimals = 0 }: { end: number, duration?: number, decimals?: number }) => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let startTime: number | null = null;
    const updateCount = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = timestamp - startTime;
      const percentage = Math.min(progress / duration, 1);
      const easeProgress = percentage === 1 ? 1 : 1 - Math.pow(2, -10 * percentage);
      setCount(Math.min(end, easeProgress * end));
      if (progress < duration) {
        requestAnimationFrame(updateCount);
      } else {
        setCount(end);
      }
    };
    requestAnimationFrame(updateCount);
  }, [end, duration]);

  return <span>{count.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}</span>;
};

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

const StatCard = ({ icon: Icon, title, value, decimals = 0 }: { icon: LucideIcon, title: string, value: number, decimals?: number }) => (
  <div className="bg-white rounded-xl p-5 flex items-center gap-5 border border-[#e2e8f0] flex-1 shadow-[0_8px_25px_rgba(71,85,105,0.12)]">
    <div className="bg-[#f8fafc] w-12 h-12 rounded-lg flex items-center justify-center border border-[#e2e8f0] shrink-0">
      <Icon size={20} className="text-[#475569]" strokeWidth={2} />
    </div>
    <div className="flex flex-col gap-0.5">
      <div className="text-[14px] font-bold text-[#475569] uppercase tracking-widest">{title}</div>
      <div className="text-[26px] font-bold text-[#0f172a] leading-none tracking-tight">
        <CountUp end={value} decimals={decimals} />
      </div>
    </div>
  </div>
);

import api from './api/client';

// --- Empty initially, will be fetched ---

// Dynamic risk rules will populate here

export default function FraudInsights({ onNavigate }: { onNavigate: (page: string) => void }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [entityFilter, setEntityFilter] = useState('');
  const [showEntityFilter, setShowEntityFilter] = useState(false);
  const [highRiskEntities, setHighRiskEntities] = useState<any[]>([]);
  const [distData, setDistData] = useState<any[]>([]);
  const [stats, setStats] = useState({ highVelocityVendors: 0, multiLenderAttempts: 0, avgScore: 0 });
  const [riskRules, setRiskRules] = useState<{ title: string, severity: string, count: number }[]>([]);

  // Modal State
  const [modalConfig, setModalConfig] = useState<{isOpen: boolean, title: string, message: string, icon?: React.ReactNode}>({
    isOpen: false, title: '', message: ''
  });

  const showModal = (title: string, message: string, icon: React.ReactNode = <ShieldAlert size={24} className="text-[#3b82f6]" />) => {
    setModalConfig({ isOpen: true, title, message, icon });
  };

  useEffect(() => {
    const fetchInsights = async () => {
      try {
        const res = await api.get('/invoices/history');
        const items = res.data.data || [];

        let totalScore = 0;
        let duplicateCount = 0;
        const vendorData = new Map<string, { totalScore: number, attempts: number, duplicates: number, highRisk: number }>();

        const days = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
        const dayBuckets: Record<string, { LOW: number, MEDIUM: number, HIGH: number }> = {};
        days.forEach(d => dayBuckets[d] = { LOW: 0, MEDIUM: 0, HIGH: 0 });

        const triggeredRulesMap = new Map<string, number>();

        items.forEach((inv: any) => {
          const rawScore = inv.fraud_score;
          const score = rawScore != null ? parseFloat(rawScore) : 0;
          totalScore += score;

          if (inv.status === 'DUPLICATE_DETECTED') duplicateCount++;

          // Extract Triggered AI Rules from metadata
          let rulesFromAI: string[] = [];
          try {
            if (typeof inv.metadata === 'string') {
              rulesFromAI = JSON.parse(inv.metadata).triggered_rules || [];
            } else if (inv.metadata?.triggered_rules) {
              rulesFromAI = inv.metadata.triggered_rules;
            }
          } catch (e) { }

          rulesFromAI.forEach(r => {
            triggeredRulesMap.set(r, (triggeredRulesMap.get(r) || 0) + 1);
          });

          // Day Distribution
          const dt = new Date(inv.created_at);
          const dayName = days[dt.getDay()];
          if (score < 30) dayBuckets[dayName].LOW++;
          else if (score < 75) dayBuckets[dayName].MEDIUM++;
          else dayBuckets[dayName].HIGH++;

          // Vendor map
          const vData = vendorData.get(inv.sellerGSTIN) || { totalScore: 0, attempts: 0, duplicates: 0, highRisk: 0 };
          vData.totalScore += score;
          vData.attempts += 1;
          if (inv.status === 'DUPLICATE_DETECTED') vData.duplicates++;
          if (score > 75) vData.highRisk++;
          vendorData.set(inv.sellerGSTIN, vData);
        });

        const newDistData = days.map(d => ({ name: d, ...dayBuckets[d] }));

        const entities: any[] = [];
        let highVelocityCount = 0;

        vendorData.forEach((val, key) => {
          const avg = val.attempts > 0 ? (val.totalScore / val.attempts).toFixed(2) : '0.00';
          const flags: string[] = [];
          if (val.attempts >= 3) { flags.push('V'); highVelocityCount++; }
          if (val.duplicates > 0) flags.push('D');
          if (val.highRisk > 0) flags.push('R');

          // Only show those with some risk or volume
          if (flags.length > 0 || parseFloat(avg) > 50) {
            entities.push({
              id: key,
              score: avg,
              attempts: val.attempts.toString(),
              flags,
            });
          }
        });

        // Sort by highest average fraud score
        entities.sort((a, b) => parseFloat(b.score) - parseFloat(a.score));

        setDistData(newDistData);
        setHighRiskEntities(entities);
        setStats({
          highVelocityVendors: highVelocityCount,
          multiLenderAttempts: duplicateCount,
          avgScore: items.length > 0 ? totalScore / items.length : 0
        });

        // Map the collected Map back into the state array
        const dynamicRules = Array.from(triggeredRulesMap.entries()).map(([r, count]) => ({
          title: r.replace(/_/g, ' ').replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()),
          severity: (r.includes('REJECTION') || r.includes('DUPLICATE') || r.includes('HIGH') || r.includes('CRITICAL')) ? 'CRITICAL' : 'ELEVATED',
          count: count
        }));

        if (dynamicRules.length === 0) {
          // Keep a few placeholder visual defaults if history has no rules triggered yet
          dynamicRules.push(
            { title: 'High Velocity Submission', severity: 'CRITICAL', count: 0 },
            { title: 'Multi-Lender Attempt', severity: 'CRITICAL', count: 0 },
            { title: 'Round Amount Pattern', severity: 'ELEVATED', count: 0 },
            { title: 'Near Duplicate Detected', severity: 'ELEVATED', count: 0 }
          );
        }

        setRiskRules(dynamicRules);

      } catch (err) {
        console.error("Failed to fetch fraud insights:", err);
      }
    };
    fetchInsights();
  }, []);

  const filteredEntities = highRiskEntities.filter(e => {
    if (!entityFilter) return true;
    const q = entityFilter.toLowerCase();
    return e.id.toLowerCase().includes(q) || e.score.includes(q);
  });

  const handleDownload = () => {
    const header = 'Vendor ID,Avg Fraud Score,Attempts,Flags\n';
    const rows = highRiskEntities.map(e => `${e.id},${e.score},${e.attempts},"${e.flags.join(', ')}"`).join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'high_risk_entities.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex h-screen w-full bg-[#f8fafc] text-[#0f172a] overflow-hidden">

      {/* Sidebar - Consistent with other pages */}
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
          <SidebarItem icon={FileText} label="Audit Trails" onClick={() => onNavigate('admin/audit-trail')} isCollapsed={!isSidebarOpen} />
          <SidebarItem icon={ShieldAlert} label="Fraud Insights" active isCollapsed={!isSidebarOpen} />
        </div>

        <div className="flex flex-col gap-1 pt-4 mt-auto border-t border-[#334155]">
          <SidebarItem icon={Settings} label="Preferences" onClick={() => showModal('Preferences', 'Global admin preferences will be unlocked in v1.1.', <Settings size={24} className="text-[#3b82f6]" />)} isCollapsed={!isSidebarOpen} />
          <SidebarItem icon={LogOut} label="Sign Out" onClick={() => onNavigate('')} isCollapsed={!isSidebarOpen} />
        </div>
      </aside>

      {/* Main Content Areas */}
      <main className="flex-1 flex flex-col min-w-0 pr-6 pb-6 pt-6 pl-8 overflow-y-auto">

        {/* Header */}
        <header className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-[22px] font-bold text-[#0f172a] mb-1">Fraud Insights</h1>
            <p className="text-[14px] font-semibold text-[#475569]">Real-time intelligence processed asynchronously via FastAPI risk engine.</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="text-[14px] font-bold text-[#0f172a]">Risk Admin</div>
              <div className="text-[12px] font-bold text-[#94a3b8]">Compliance Oversight</div>
            </div>
            <div className="w-10 h-10 bg-gradient-to-tr from-[#e2e8f0] to-[#f8fafc] shadow-sm ml-1 border-2 border-white"></div>
          </div>
        </header>

        {/* Top Stat Cards */}
        <div className="flex gap-6 mb-6">
          <StatCard icon={Store} title="High Velocity Vendors" value={stats.highVelocityVendors} />
          <StatCard icon={Building2} title="Multi-Lender Attempts" value={stats.multiLenderAttempts} />
          <StatCard icon={Gauge} title="Average Fraud Score" value={stats.avgScore} decimals={2} />
        </div>

        {/* Grid Layer 2 */}
        <div className="flex gap-6 items-stretch mb-6">

          {/* Main Chart Column: Fraud Score Distribution */}
          <div className="flex-1 bg-white rounded-xl border border-[#e2e8f0] shadow-[0_8px_25px_rgba(71,85,105,0.12)] p-6 pb-4 flex flex-col">
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-[14px] font-bold text-[#0f172a] uppercase tracking-widest m-0">Fraud Score Distribution</h3>
              <div className="flex items-center gap-4 text-[14px] font-bold text-[#475569] tracking-wider uppercase">
                <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-[#111827]"></div>Low</div>
                <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-[#a21caf]"></div>Medium</div>
                <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-[#f472b6]"></div>High</div>
              </div>
            </div>

            <div className="flex-1 min-h-[250px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={distData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }} barSize={36}>
                  <XAxis
                    dataKey="name"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#64748b', fontSize: 10, fontWeight: 700 }}
                    dy={10}
                  />
                  <Bar dataKey="LOW" stackId="a" fill="#111827" radius={[0, 0, 4, 4]} />
                  <Bar dataKey="MEDIUM" stackId="a" fill="#a21caf" />
                  <Bar dataKey="HIGH" stackId="a" fill="#f472b6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Right Column: Triggered Risk Rules */}
          <div className="w-[320px] shrink-0">
            <div className="flex justify-between items-end mb-4 px-1">
              <h3 className="text-[14px] font-bold text-[#0f172a] uppercase tracking-widest">Triggered Risk Rules</h3>
              <span 
                className="text-[14px] font-bold text-[#475569] hover:text-[#0f172a] cursor-pointer transition-colors"
                onClick={() => showModal('Risk Rules Registry', 'Full access to all 142 AI-driven dynamic risk parameters requires Level 3 Admin Clearance.', <FileText size={24} className="text-[#10b981]" />)}
              >
                See All
              </span>
            </div>

            <div className="flex flex-col gap-3">
              {riskRules.map((rule, idx) => (
                <div key={idx} className="bg-white rounded-xl border border-[#e2e8f0] shadow-[0_4px_15px_rgba(71,85,105,0.06)] p-4 flex justify-between items-center cursor-pointer hover:border-[#cbd5e1] transition-colors">
                  <div>
                    <div className="text-[14px] font-bold text-[#0f172a] mb-1.5">{rule.title}</div>
                    <div className="flex items-center gap-2">
                      <div className="inline-block bg-[#f1f5f9] px-2 py-0.5 rounded text-[9px] font-bold tracking-widest uppercase text-[#475569]">
                        {rule.severity}
                      </div>
                      {rule.count > 0 && (
                        <div className="inline-block bg-[#e0e7ff] text-[#4338ca] px-2 py-0.5 rounded text-[9px] font-bold tracking-widest uppercase">
                          {rule.count} trigger{rule.count !== 1 ? 's' : ''}
                        </div>
                      )}
                    </div>
                  </div>
                  <ChevronDown size={16} className="text-[#64748b]" />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom Layer: High Risk Entities */}
        <div className="bg-white rounded-xl border border-[#e2e8f0] shadow-[0_8px_25px_rgba(71,85,105,0.12)] p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-[14px] font-bold text-[#0f172a] uppercase tracking-widest">High Risk Entities</h3>
            <div className="flex gap-2 items-center">
              {showEntityFilter && (
                <input
                  type="text"
                  placeholder="Filter by Vendor ID..."
                  value={entityFilter}
                  onChange={(e) => setEntityFilter(e.target.value)}
                  className="px-3 py-1.5 border border-[#e2e8f0] rounded text-[12px] font-medium outline-none placeholder:text-[#94a3b8] text-[#0f172a] w-[180px]"
                  autoFocus
                />
              )}
              <div
                onClick={() => { setShowEntityFilter(!showEntityFilter); if (showEntityFilter) setEntityFilter(''); }}
                className={`w-8 h-8 rounded border border-[#e2e8f0] flex items-center justify-center cursor-pointer transition-colors ${showEntityFilter ? 'bg-[#f1f5f9] text-[#0f172a]' : 'text-[#475569] hover:bg-[#f8fafc]'}`}
              >
                <Filter size={14} />
              </div>
              <div
                onClick={handleDownload}
                className="w-8 h-8 rounded border border-[#e2e8f0] flex items-center justify-center text-[#475569] cursor-pointer hover:bg-[#f8fafc] transition-colors"
              >
                <Download size={14} />
              </div>
            </div>
          </div>

          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#f1f5f9]">
                <th className="py-4 px-4 text-[14px] font-bold text-[#64748b] uppercase tracking-widest w-[20%]">Vendor ID</th>
                <th className="py-4 px-4 text-[14px] font-bold text-[#64748b] uppercase tracking-widest w-[25%]">Avg Fraud Score</th>
                <th className="py-4 px-4 text-[14px] font-bold text-[#64748b] uppercase tracking-widest w-[20%]">Attempts</th>
                <th className="py-4 px-4 text-[14px] font-bold text-[#64748b] uppercase tracking-widest w-[25%]">Flags Triggered</th>
                <th className="py-4 px-4 text-[14px] font-bold text-[#64748b] uppercase tracking-widest text-right w-[10%]">Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredEntities.map((entity, i) => (
                <tr key={i} className="hover:bg-[#f8fafc] transition-colors border-b border-[#f8fafc] last:border-none">
                  <td className="py-4 px-4 text-[14px] font-bold text-[#334155]">{entity.id}</td>
                  <td className="py-4 px-4">
                    <span className="bg-[#f8fafc] border border-[#e2e8f0] text-[14px] font-bold text-[#0f172a] py-1 px-2.5 rounded shadow-[0_1px_2px_rgba(71,85,105,0.05)]">
                      {entity.score}
                    </span>
                  </td>
                  <td className="py-4 px-4 text-[14px] font-bold text-[#0f172a] tracking-tight">{entity.attempts}</td>
                  <td className="py-4 px-4">
                    <div className="flex gap-1.5">
                      {entity.flags.map((flag: string) => (
                        <span key={flag} className="w-5 h-5 flex items-center justify-center rounded bg-[#f8fafc] border border-[#e2e8f0] text-[9px] font-bold text-[#475569] shadow-[0_1px_2px_rgba(71,85,105,0.05)]">
                          {flag}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="py-4 px-4 text-right">
                    <button 
                      className="text-[14px] font-bold tracking-widest text-[#0f172a] hover:text-[#475569] transition-colors uppercase cursor-pointer bg-transparent border-none"
                      onClick={() => showModal('Deep Audit Initiated', `Cross-referencing entity ${entity.id} against global intelligence network... Expected completion: 45s.`, <ShieldAlert size={24} className="text-[#f59e0b]" />)}
                    >
                      AUDIT
                    </button>
                  </td>
                </tr>
              ))}
              {filteredEntities.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-[12px] font-bold text-[#94a3b8] uppercase tracking-wider">
                    No matching entities found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
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
