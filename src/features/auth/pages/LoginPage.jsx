import React, { useState } from 'react';
import { Mail, Lock, Key, Eye, EyeOff, ChevronRight, Zap, UserPlus, LogIn, HelpCircle, X } from 'lucide-react';
import BinaryRain from '@/features/shared/ui/BinaryRain';
import axios from 'axios';

const LoginPage = ({ onLogin, onSwitchToRegister, onForgotPassword }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const response = await axios.post(
        'http://localhost/HackMe/server/auth/login.php',
        {
          email: email,
          password: password
        },
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      const data = response.data;

      if (data && data.success && data.user) {
        onLogin(data.user);
      } else {
        const errorMessage = data?.message || "Login failed. Please check your credentials.";
        setError(errorMessage);
      }
    } catch (error) {
      if (error.response && error.response.data) {
        const errorData = error.response.data;
        const errorMessage = errorData.message || JSON.stringify(errorData);
        setError(errorMessage);
      } else {
        setError("Error connecting to server. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black flex items-center justify-center p-3 sm:p-4 relative overflow-hidden">
      <BinaryRain />
      
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-green-500/10 via-gray-900 to-black"></div>
      <div className="absolute top-0 left-0 w-full h-1 bg-green-400 animate-pulse"></div>

      <div className="relative w-full max-w-md">
        <div className="bg-gray-800/90 backdrop-blur-lg rounded-lg shadow-2xl overflow-hidden border border-green-500/30">
          <div className="bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 p-4 sm:p-6 text-center relative overflow-hidden border-b border-green-500/30">
            <div className="absolute inset-0 bg-green-500/5"></div>
            <div className="relative z-10">
              <div className="inline-flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 bg-green-500/20 backdrop-blur-sm rounded-full mb-2 sm:mb-3 border border-green-500/30">
                <LogIn className="w-7 h-7 sm:w-8 sm:h-8 text-green-400" />
              </div>
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-green-400 mb-1 font-mono">HACK_ME</h1>
              <p className="text-gray-400 font-mono text-xs sm:text-sm">// PENETRATION_TESTING_PLATFORM</p>
            </div>
          </div>

          <div className="p-4 sm:p-6">
            <div className="text-center mb-4 sm:mb-6">
              <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-white mb-1 font-mono">ACCESS_CONTROL</h2>
              <p className="text-gray-400 font-mono text-xs sm:text-sm">AUTHENTICATION_REQUIRED</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
              <div className="relative group">
                <label className="block text-xs sm:text-sm font-semibold text-gray-400 mb-1.5 font-mono">
                  [USER_IDENTIFIER]
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 sm:left-4 top-1/2 transform -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-green-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (error) setError('');
                    }}
                    required
                    className="w-full pl-10 sm:pl-12 pr-3 sm:pr-4 py-2.5 sm:py-3 bg-gray-700/50 border-2 border-gray-600 rounded-lg text-white text-sm placeholder-gray-500 outline-none focus:border-green-500 focus:bg-gray-700/80 transition-all duration-300 font-mono"
                    placeholder="user@domain.com"
                  />
                </div>
              </div>

              <div className="relative group">
                <div className="flex justify-between items-center mb-1.5">
                  <label className="block text-xs sm:text-sm font-semibold text-gray-400 font-mono">
                    [PASSWORD]
                  </label>
                  <button
                    type="button"
                    onClick={onForgotPassword}
                    className="text-green-400 hover:text-green-300 font-mono text-[10px] sm:text-xs transition-colors duration-200 flex items-center gap-1"
                  >
                    <HelpCircle className="w-3 h-3" />
                    FORGOT_PASSWORD?
                  </button>
                </div>
                <div className="relative">
                  <Key className="absolute left-3 sm:left-4 top-1/2 transform -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-green-400" />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (error) setError('');
                    }}
                    required
                    className="w-full pl-10 sm:pl-12 pr-10 sm:pr-12 py-2.5 sm:py-3 bg-gray-700/50 border-2 border-gray-600 rounded-lg text-white text-sm placeholder-gray-500 outline-none focus:border-green-500 focus:bg-gray-700/80 transition-all duration-300 font-mono"
                    placeholder="********"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 sm:right-4 top-1/2 transform -translate-y-1/2 text-green-400 hover:text-green-300 transition"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4 sm:w-5 sm:h-5" /> : <Eye className="w-4 h-4 sm:w-5 sm:h-5" />}
                  </button>
                </div>
              </div>

              {error && (
                <div className="flex items-center gap-2 text-red-400 font-mono text-xs sm:text-sm bg-red-500/10 border border-red-500/30 rounded-lg p-2 sm:p-2.5">
                  <X className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
                  <span className="text-left break-words flex-1">{error}</span>
                </div>
              )}

              <button
                type="submit"
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-green-600 to-green-700 text-white py-2.5 sm:py-3 rounded-lg font-bold text-sm sm:text-base shadow-lg hover:shadow-green-500/20 transform hover:scale-105 transition-all duration-300 relative overflow-hidden border border-green-500/30 font-mono flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
              >
                {isLoading ? (
                  <>
                    <div className="w-4 h-4 sm:w-5 sm:h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span className="text-xs sm:text-sm">AUTHENTICATING...</span>
                  </>
                ) : (
                  <>
                    <span className="text-xs sm:text-sm">INITIATE_SESSION</span>
                    <ChevronRight className={`w-4 h-4 sm:w-5 sm:h-5 transition-transform duration-300 ${isHovered ? 'translate-x-1' : ''}`} />
                  </>
                )}
              </button>
            </form>

            <div className="mt-4 sm:mt-5 text-center">
              <button
                onClick={onSwitchToRegister}
                className="text-green-400 hover:text-green-300 font-mono text-xs sm:text-sm transition-colors duration-200 flex items-center justify-center gap-1.5 mx-auto"
              >
                <UserPlus className="w-3 h-3 sm:w-4 sm:h-4" />
                CREATE_NEW_ACCOUNT
              </button>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
