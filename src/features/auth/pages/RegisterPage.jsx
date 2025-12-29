import React, { useState } from 'react';
import { UserPlus, Mail, Users, ChevronRight, Shield, LogIn } from 'lucide-react';
import BinaryRain from '@/features/shared/ui/BinaryRain';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const RegisterPage = ({ onRegister, onSwitchToLogin }) => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    fullName: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

const handleSubmit = async (e) => {
  e.preventDefault();
  setIsLoading(true);

  try {
    const response = await axios.post(
      'http://localhost/HackMe/server/auth/send_verification.php',
      formData,
      { headers: { 'Content-Type': 'application/json' } }
    );

    const data = response.data;

    if (data && data.success) {
      alert("✅ Verification code sent to your email.");
      localStorage.setItem('userEmail', formData.email);
      localStorage.setItem('username', formData.username);
      localStorage.setItem('fullName', formData.fullName);
      
      // Store expiration time (5 minutes from now)
      const expirationTime = Date.now() + (5 * 60 * 1000); // 5 minutes in milliseconds
      localStorage.setItem("verificationCodeExpiresAt", expirationTime.toString());
      
      navigate("/verify");
    } else {
      const errorMessage = data?.message || response.data || "❌ Registration failed.";
      alert(errorMessage);
    }
  } catch (error) {
    if (error.response && error.response.data) {
      const errorData = error.response.data;
      const errorMessage = errorData.message || JSON.stringify(errorData);
      alert("⚠️ " + errorMessage);
    } else {
      alert("⚠️ Error connecting to server: " + (error.message || "Network error"));
    }
  } finally {
    setIsLoading(false);
  }
};


  return (
    <div className="h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black flex items-center justify-center p-2 sm:p-3 relative overflow-hidden">
      <BinaryRain />

      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-blue-500/10 via-gray-900 to-black"></div>
      <div className="absolute top-0 left-0 w-full h-1 bg-blue-400 animate-pulse"></div>

      <div className="relative w-full max-w-md mx-auto max-h-[95vh] flex flex-col">
        <div className="bg-gray-800/90 backdrop-blur-lg rounded-lg shadow-2xl overflow-hidden border border-blue-500/30 flex flex-col max-h-full">
          <div className="bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 p-2 sm:p-3 text-center relative overflow-hidden border-b border-blue-500/30 flex-shrink-0">
            <div className="absolute inset-0 bg-blue-500/5"></div>
            <div className="relative z-10">
              <div className="inline-flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 bg-blue-500/20 backdrop-blur-sm rounded-full mb-1 border border-blue-500/30 mx-auto">
                <UserPlus className="w-5 h-5 sm:w-6 sm:h-6 text-blue-400" />
              </div>
              <h1 className="text-base sm:text-lg md:text-xl font-bold text-blue-400 mb-0.5 font-mono">OPERATIVE_REGISTRATION</h1>
              <p className="text-gray-400 font-mono text-[10px] sm:text-xs">INITIAL_IDENTITY_SETUP</p>
            </div>
          </div>

          <div className="p-2 sm:p-3 overflow-y-auto flex-1 min-h-0">
            <div className="text-center mb-1.5 sm:mb-2">
              <h2 className="text-sm sm:text-base md:text-lg font-bold text-white mb-0.5 font-mono">NEW_OPERATIVE</h2>
              <p className="text-gray-400 font-mono text-[10px] sm:text-xs text-center">ACCOUNT_CREATION_PHASE_1</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-2 sm:space-y-2.5">
              {/* Username */}
              <div className="relative group">
                <label className="block text-[10px] sm:text-xs font-semibold text-gray-400 mb-1 font-mono text-left">
                  OPERATIVE_CODENAME
                </label>
                <div className="relative">
                  <Users className="absolute left-2.5 sm:left-3 top-1/2 transform -translate-y-1/2 w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-400" />
                  <input
                    type="text"
                    name="username"
                    value={formData.username}
                    onChange={handleChange}
                    required
                    className="w-full pl-9 sm:pl-10 pr-2.5 sm:pr-3 py-2 sm:py-2.5 bg-gray-700/50 border-2 border-gray-600 rounded-lg text-white text-xs sm:text-sm placeholder-gray-500 outline-none focus:border-blue-500 focus:bg-gray-700/80 transition-all duration-300 font-mono"
                    placeholder="ghost_operative"
                  />
                </div>
              </div>

              {/* Email */}
              <div className="relative group">
                <label className="block text-[10px] sm:text-xs font-semibold text-gray-400 mb-1 font-mono text-left">
                  COMMUNICATION_CHANNEL
                </label>
                <div className="relative">
                  <Mail className="absolute left-2.5 sm:left-3 top-1/2 transform -translate-y-1/2 w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-400" />
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    className="w-full pl-9 sm:pl-10 pr-2.5 sm:pr-3 py-2 sm:py-2.5 bg-gray-700/50 border-2 border-gray-600 rounded-lg text-white text-xs sm:text-sm placeholder-gray-500 outline-none focus:border-blue-500 focus:bg-gray-700/80 transition-all duration-300 font-mono"
                    placeholder="operative@secure.com"
                  />
                </div>
              </div>

              {/* Full name */}
              <div className="relative group">
                <label className="block text-[10px] sm:text-xs font-semibold text-gray-400 mb-1 font-mono text-left">
                  FULL_IDENTITY
                </label>
                <div className="relative">
                  <UserPlus className="absolute left-2.5 sm:left-3 top-1/2 transform -translate-y-1/2 w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-400" />
                  <input
                    type="text"
                    name="fullName"
                    value={formData.fullName}
                    onChange={handleChange}
                    required
                    className="w-full pl-9 sm:pl-10 pr-2.5 sm:pr-3 py-2 sm:py-2.5 bg-gray-700/50 border-2 border-gray-600 rounded-lg text-white text-xs sm:text-sm placeholder-gray-500 outline-none focus:border-blue-500 focus:bg-gray-700/80 transition-all duration-300 font-mono"
                    placeholder="Ahmed Mohammed"
                  />
                </div>
              </div>

              {/* Info */}
              <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-2 sm:p-2.5">
                <div className="text-blue-300 font-mono text-[10px] sm:text-xs text-center break-words">
                  ENCRYPTION_KEY_WILL_BE_SET_AFTER_VERIFICATION
                </div>
              </div>

              <button
                type="submit"
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white py-2 sm:py-2.5 rounded-lg font-bold text-xs sm:text-sm shadow-lg hover:shadow-blue-500/20 transform hover:scale-105 transition-all duration-300 border border-blue-500/30 font-mono flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
              >
                {isLoading ? (
                  <>
                    <div className="w-3.5 h-3.5 sm:w-4 sm:h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span className="text-[10px] sm:text-xs">INITIATING...</span>
                  </>
                ) : (
                  <>
                    <span className="text-[10px] sm:text-xs">CONTINUE</span>
                    <ChevronRight className={`w-3.5 h-3.5 sm:w-4 sm:h-4 transition-transform duration-300 ${isHovered ? 'translate-x-1' : ''}`} />
                  </>
                )}
              </button>
            </form>

            <div className="mt-1.5 sm:mt-2 text-center">
              <button
                onClick={onSwitchToLogin}
                className="text-blue-400 hover:text-blue-300 font-mono text-[10px] sm:text-xs transition-colors duration-200 flex items-center justify-center gap-1 mx-auto"
              >
                <LogIn className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                EXISTING_OPERATIVE_ACCESS
              </button>
            </div>

            <div className="mt-1.5 sm:mt-2 bg-gray-700/50 backdrop-blur-sm border border-blue-500/30 rounded-lg p-1.5 sm:p-2">
              <div className="flex items-center justify-center gap-1 mb-0.5">
                <Shield className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-blue-400" />
                <p className="font-semibold text-white text-[10px] sm:text-xs font-mono">SECURE_REGISTRATION</p>
              </div>
              <p className="text-gray-400 text-[9px] sm:text-[10px] font-mono text-center break-words">
                IDENTITY_VERIFICATION_REQUIRED
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
