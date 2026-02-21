import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, User, Mail, Lock, Eye, EyeOff, ChevronDown, AlertCircle } from 'lucide-react';
import api from './api/client';
import admindash from './assets/admindash.png';
import adminhash from './assets/adminhash.png';
import adminrisk from './assets/adminrisk.png';
import lenderdash from './assets/lenderdash.png';
import lenderhis from './assets/lenderhis.png';
import vendorveri from './assets/vendorveri.png';
import vendortable from './assets/vendortable.png';

// Credentials Map
const VALID_CREDENTIALS = {
  admin: { email: 'admin@gmail.com', password: '1234567890' },
  lender: { email: 'lendor@gmail.com', password: '0987654321' },
  vendor: { email: 'vendor@gmail.com', password: '1234567890' }
};

const LoginPage = () => {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);

  // Form State
  const [role, setRole] = useState<'admin' | 'lender' | 'vendor'>('admin');
  const [email, setEmail] = useState('admin@gmail.com');
  const [password, setPassword] = useState('1234567890');
  const [error, setError] = useState('');

  const slides = [
    {
      title: "Admin dashboard",
      description: "Monitor high-density registry logs, maintain an immutable financing ledger, and leverage real-time fraud intelligence.",
      images: [admindash, adminhash, adminrisk]
    },
    {
      title: "Lenders domain",
      description: "Content for the Lenders domain will be updated shortly.",
      images: [lenderdash, lenderhis, lenderhis]
    },
    {
      title: "Vendors domain",
      description: "Content for the Vendors domain will be updated shortly.",
      images: [vendorveri, vendortable, vendorveri] // reusing vendorveri as 3rd image since only 2 were provided
    }
  ];

  // Auto-advance slideshow
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [slides.length]);

  // Handle role change to prepopulate correct email/password, and tie the slide to the role
  const handleRoleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newRole = e.target.value as 'admin' | 'lender' | 'vendor';
    setRole(newRole);
    setError(''); // clear errors

    // Auto-fill the required credentials for convenience (optional)
    setEmail(VALID_CREDENTIALS[newRole].email);
    setPassword(VALID_CREDENTIALS[newRole].password);

    // Sync slide to role
    if (newRole === 'admin') setCurrentSlide(0);
    if (newRole === 'lender') setCurrentSlide(1);
    if (newRole === 'vendor') setCurrentSlide(2);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      const response = await api.post('/auth/login', {
        email,
        password,
        role: role.toUpperCase() // Ensure it matches backend ROLES ('ADMIN', 'LENDER', 'VENDOR')
      });

      const { role: backendRole, userId } = response.data;
      const lowerRole = backendRole.toLowerCase();

      // Store userId for other pages
      if (userId) {
        localStorage.setItem('userId', userId);
      }

      // Success - redirect based on role
      if (lowerRole === 'admin') {
        navigate('/admin');
      } else if (lowerRole === 'lender') {
        navigate('/lender');
      } else if (lowerRole === 'vendor') {
        navigate('/vendor');
      }
    } catch (err: any) {
      if (err.response && err.response.data && err.response.data.error) {
        setError(err.response.data.error);
      } else {
        setError('Login failed. Please verify your credentials and ensure the backend is running.');
      }
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-[20px] box-border relative">
      <div className="flex flex-col md:flex-row w-full md:w-[90vw] md:max-w-[1200px] min-h-[100vh] md:min-h-[600px] md:h-[85vh] bg-white md:rounded-2xl shadow-[0_10px_30px_rgba(0,0,0,0.1)] overflow-hidden">
        {/* Left Form Section */}
        <div className="flex-1 py-[30px] px-[20px] md:py-[40px] md:px-[60px] flex flex-col justify-center bg-white z-20 relative">
          <div className="flex items-center gap-3 mb-10">
            <div className="bg-[#137780] text-white w-9 h-9 rounded-lg flex items-center justify-center">
              <Shield size={20} strokeWidth={2.5} />
            </div>
            <div className="text-2xl font-bold text-[#0b1c2d] tracking-wide">NIVR</div>
          </div>

          <div className="mb-[30px] text-center">
            <h1 className="text-[28px] font-bold text-[#0c1b2f] m-0 mb-2.5">Welcome Back</h1>
            <p className="text-[#6c788c] text-[15px] m-0">Log in to access your secure dashboard</p>
          </div>

          <form onSubmit={handleLogin}>
            {error && (
              <div className="mb-5 p-3 bg-red-50 border border-red-200 text-red-600 rounded-lg text-sm flex items-center gap-2">
                <AlertCircle size={16} />
                {error}
              </div>
            )}

            <div className="mb-5 flex flex-col">
              <label className="text-[14px] font-semibold text-[#2b3a4a] mb-2 flex justify-between">Select Your Role</label>
              <div className="relative flex items-center">
                <User size={18} className="absolute left-[14px] text-[#929ba8]" />
                <select
                  className="w-full py-3 px-[14px] pl-[42px] pr-[40px] border border-[#e0e5ea] rounded-lg text-[14px] text-[#2b3a4a] outline-none transition-colors duration-200 bg-white focus:border-[#137780] appearance-none cursor-pointer"
                  value={role}
                  onChange={handleRoleChange}
                >
                  <option value="admin">Admin</option>
                  <option value="lender">Lender</option>
                  <option value="vendor">Vendor</option>
                </select>
                <ChevronDown size={18} className="absolute right-[14px] text-[#929ba8] pointer-events-none" />
              </div>
            </div>

            <div className="mb-5 flex flex-col">
              <label className="text-[14px] font-semibold text-[#2b3a4a] mb-2 flex justify-between">Work Email Address</label>
              <div className="relative flex items-center">
                <Mail size={18} className="absolute left-[14px] text-[#929ba8]" />
                <input
                  type="email"
                  className="w-full py-3 px-[14px] pl-[42px] border border-[#e0e5ea] rounded-lg text-[14px] text-[#2b3a4a] outline-none transition-colors duration-200 bg-white focus:border-[#137780]"
                  placeholder="name@institution.com"
                  spellCheck="false"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="mb-5 flex flex-col">
              <label className="text-[14px] font-semibold text-[#2b3a4a] mb-2 flex justify-between">
                Password
                <a href="#" className="text-[#137780] text-[13px] font-semibold no-underline">Forgot Password?</a>
              </label>
              <div className="relative flex items-center">
                <Lock size={18} className="absolute left-[14px] text-[#929ba8]" />
                <input
                  type={showPassword ? "text" : "password"}
                  className="w-full py-3 px-[14px] pl-[42px] border border-[#e0e5ea] rounded-lg text-[14px] text-[#2b3a4a] outline-none transition-colors duration-200 bg-white focus:border-[#137780]"
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                {showPassword ? (
                  <EyeOff size={18} className="absolute right-[14px] text-[#929ba8] cursor-pointer" onClick={() => setShowPassword(false)} />
                ) : (
                  <Eye size={18} className="absolute right-[14px] text-[#929ba8] cursor-pointer" onClick={() => setShowPassword(true)} />
                )}
              </div>
            </div>

            <button type="submit" className="w-full p-[14px] bg-[#137780] text-white border-none rounded-lg text-[16px] font-semibold cursor-pointer mt-2.5 transition-colors duration-200 hover:bg-[#0f6269] flex items-center justify-center gap-2">
              Sign In
            </button>
          </form>
        </div>

        {/* Right Slideshow Section */}
        <div className="hidden md:flex flex-[1.2] bg-gradient-to-br from-[#093739] to-[#052123] relative overflow-hidden flex-col justify-between p-[40px] perspective-[1000px]">

          {/* Fanned Image Stack */}
          <div className="flex-1 w-full flex items-center justify-center relative z-10 scale-[0.8] origin-top -translate-y-4">
            {/* Left Back Image (-25 deg) */}
            <div
              className="absolute w-[75%] max-w-[380px] rounded-xl shadow-[0_20px_40px_rgba(0,0,0,0.6)] overflow-hidden border-[4px] border-white/20 z-10 opacity-80 pointer-events-none transition-all duration-700 ease-in-out"
              style={{ transform: 'rotate(-25deg) translateX(-110px) translateY(80px)' }}
            >
              <img src={slides[currentSlide].images[1]} alt="Dashboard View 2" className="w-full h-auto object-cover block" />
            </div>

            {/* Right Back Image (+25 deg) */}
            <div
              className="absolute w-[75%] max-w-[380px] rounded-xl shadow-[0_20px_40px_rgba(0,0,0,0.6)] overflow-hidden border-[4px] border-white/20 z-10 opacity-80 pointer-events-none transition-all duration-700 ease-in-out"
              style={{ transform: 'rotate(25deg) translateX(110px) translateY(80px)' }}
            >
              <img src={slides[currentSlide].images[2]} alt="Dashboard View 3" className="w-full h-auto object-cover block" />
            </div>

            {/* Center Front Image (straight) */}
            <div
              className="absolute w-[85%] max-w-[420px] rounded-xl shadow-[0_30px_60px_rgba(0,0,0,0.7)] overflow-hidden border-[4px] border-white/30 z-20 transition-all duration-700 ease-in-out"
            >
              <img src={slides[currentSlide].images[0]} alt="Dashboard View 1" className="w-full h-auto object-cover block" />
            </div>
          </div>

          <div className="relative z-30 text-center text-white mt-auto pt-8">
            <div className="">
              <h2 className="text-[24px] font-semibold m-0 mb-2.5 drop-shadow-md">{slides[currentSlide].title}</h2>
              <p className="text-[14px] text-[#a4b3b5] m-0 mb-[30px] leading-relaxed drop-shadow">{slides[currentSlide].description}</p>
            </div>
            <div className="flex gap-2 justify-center">
              {slides.map((_, index) => (
                <button
                  key={index}
                  className={`w-10 h-1 rounded-sm cursor-pointer border-none p-0 transition-colors ${index === currentSlide ? 'bg-white shadow-[0_0_8px_rgba(255,255,255,0.8)]' : 'bg-white/30 hover:bg-white/50'}`}
                  onClick={() => setCurrentSlide(index)}
                  aria-label={`Go to slide ${index + 1}`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
