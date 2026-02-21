import { BrowserRouter as Router, Routes, Route, useNavigate } from 'react-router-dom';
import LoginPage from './LoginPage';
import AdminDashboard from './AdminDashboard';
import AuditTrail from './AuditTrail';
import FraudInsights from './FraudInsights';

function AppContent() {
  const navigate = useNavigate();
  return (
      <div className="min-h-screen w-full bg-[#f4f7f9] font-sans text-[#111827]">
        <Routes>
          <Route path="/" element={<LoginPage />} />
          <Route path="/admin" element={<AdminDashboard onNavigate={(path) => navigate(`/${path}`)} />} />
          <Route path="/admin/audit-trail" element={<AuditTrail onNavigate={(path) => navigate(`/${path}`)} />} />
          <Route path="/admin/fraud-insights" element={<FraudInsights onNavigate={(path) => navigate(`/${path}`)} />} />
        </Routes>
      </div>
  );
}

function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}

export default App;
