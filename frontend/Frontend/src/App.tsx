import { BrowserRouter as Router, Routes, Route, useNavigate } from 'react-router-dom';
import LoginPage from './LoginPage';
import AdminDashboard from './AdminDashboard';
import AuditTrail from './AuditTrail';
import FraudInsights from './FraudInsights';
import LenderDashboard from './LenderDashboard';
import InvoiceHistory from './InvoiceHistory';
import UploadInvoice from './UploadInvoice';
import VerificationStatus from './VerificationStatus';

function AppContent() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen w-full bg-[#f4f7f9] font-sans text-[#111827]">
      <Routes>
        <Route path="/" element={<LoginPage />} />
        <Route path="/admin" element={<AdminDashboard onNavigate={(path) => navigate(`/${path}`)} />} />
        <Route path="/admin/audit-trail" element={<AuditTrail onNavigate={(path) => navigate(`/${path}`)} />} />
        <Route path="/admin/fraud-insights" element={<FraudInsights onNavigate={(path) => navigate(`/${path}`)} />} />
        <Route path="/lender" element={<LenderDashboard onNavigate={(path) => navigate(`/${path}`)} />} />
        <Route path="/lender/invoice-history" element={<InvoiceHistory onNavigate={(path) => navigate(`/${path}`)} />} />
        <Route path="/vendor" element={<UploadInvoice onNavigate={(path) => navigate(`/${path}`)} />} />
        <Route path="/vendor/verification-status" element={<VerificationStatus onNavigate={(path) => navigate(`/${path}`)} />} />
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
