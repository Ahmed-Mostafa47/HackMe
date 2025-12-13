import React, { useState } from "react";
import { Mail, ChevronRight, Shield, ArrowLeft, Check } from "lucide-react";
import BinaryRain from "@/features/shared/ui/BinaryRain";

const ForgotPasswordPage = ({ onBackToLogin, onResetSent }) => {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSent, setIsSent] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!email) return;

    setIsLoading(true);

    try {
      const response = await fetch('http://localhost/HackMe/server/auth/forgot_password.php', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: email }),
      });

      const data = await response.json();

      if (data.success) {
        setIsLoading(false);
        setIsSent(true);
        if (onResetSent) {
          onResetSent(email);
        }
      } else {
        setIsLoading(false);
        alert('Error: ' + (data.message || 'Failed to send reset email'));
      }
    } catch (error) {
      setIsLoading(false);
      alert('Network error: ' + error.message);
    }
  };

  const handleReset = () => {
    setEmail("");
    setIsSent(false);
  };

  if (isSent) {
    return (
      <div className="h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black flex items-center justify-center p-3 sm:p-4 relative overflow-hidden">
        <BinaryRain />

        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-green-500/10 via-gray-900 to-black"></div>

        <div className="relative w-full max-w-md mx-auto py-4 sm:py-0">
          <div className="bg-gray-800/90 backdrop-blur-lg rounded-lg shadow-2xl overflow-hidden border border-green-500/30">
            <div className="bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 p-3 sm:p-4 text-center relative overflow-hidden border-b border-green-500/30">
              <div className="absolute inset-0 bg-green-500/5"></div>
              <div className="relative z-10">
                <div className="inline-flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 bg-green-500/20 backdrop-blur-sm rounded-full mb-1.5 border border-green-500/30 mx-auto">
                  <Check className="w-6 h-6 sm:w-7 sm:h-7 text-green-400" />
                </div>
                <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-green-400 mb-0.5 font-mono">
                  RECOVERY_SENT
                </h1>
                <p className="text-gray-400 font-mono text-[10px] sm:text-xs">
                  ACCESS_RECOVERY_INITIATED
                </p>
              </div>
            </div>

            <div className="p-3 sm:p-4 text-center">
              <div className="mb-3 sm:mb-4">
                <h2 className="text-base sm:text-lg md:text-xl font-bold text-white mb-2 font-mono">
                  RECOVERY_PROTOCOL_ACTIVE
                </h2>
                <p className="text-gray-400 font-mono mb-1.5 text-center text-xs sm:text-sm">
                  ACCESS_RECOVERY_INSTRUCTIONS_SENT_TO:
                </p>
                <p className="text-green-400 font-mono font-semibold break-all text-xs sm:text-sm">
                  {email}
                </p>
              </div>

              <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-2.5 sm:p-3 mb-3 sm:mb-4">
                <p className="text-green-300 font-mono text-[10px] sm:text-xs text-center break-words">
                  CHECK_YOUR_COMMUNICATION_CHANNEL_FOR_RECOVERY_INSTRUCTIONS
                </p>
              </div>

              <div className="space-y-2.5 sm:space-y-3">
                <button
                  onClick={handleReset}
                  className="w-full bg-gradient-to-r from-green-600 to-green-700 text-white py-2.5 rounded-lg font-semibold hover:shadow-lg transform hover:scale-105 transition-all duration-300 border border-green-500/30 font-mono text-sm"
                >
                  RESET_ANOTHER_ACCOUNT
                </button>

                <button
                  onClick={onBackToLogin}
                  className="w-full bg-gray-700/50 text-gray-300 py-2.5 rounded-lg font-semibold hover:bg-gray-700/80 transition-all duration-300 border border-gray-600 font-mono flex items-center justify-center gap-1.5 text-xs sm:text-sm"
                >
                  <ArrowLeft className="w-3 h-3" />
                  BACK_TO_ACCESS_PORTAL
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black flex items-center justify-center p-3 sm:p-4 relative overflow-hidden">
      <BinaryRain />

      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-orange-500/10 via-gray-900 to-black"></div>
      <div className="absolute top-0 left-0 w-full h-1 bg-orange-400 animate-pulse"></div>

      <div className="relative w-full max-w-md mx-auto py-4 sm:py-0">
        <div className="bg-gray-800/90 backdrop-blur-lg rounded-lg shadow-2xl overflow-hidden border border-orange-500/30">
          <div className="bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 p-3 sm:p-4 text-center relative overflow-hidden border-b border-orange-500/30">
            <div className="absolute inset-0 bg-orange-500/5"></div>
            <div className="relative z-10">
              <div className="inline-flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 bg-orange-500/20 backdrop-blur-sm rounded-full mb-1.5 border border-orange-500/30 mx-auto">
                <Shield className="w-6 h-6 sm:w-7 sm:h-7 text-orange-400" />
              </div>
              <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-orange-400 mb-0.5 font-mono">
                ACCESS_RECOVERY
              </h1>
              <p className="text-gray-400 font-mono text-[10px] sm:text-xs">
                OPERATIVE_IDENTITY_RECOVERY
              </p>
            </div>
          </div>

          <div className="p-3 sm:p-4">
            <div className="text-center mb-4 sm:mb-5">
              <h2 className="text-base sm:text-lg md:text-xl font-bold text-white mb-1 font-mono">
                RECOVER_ACCESS
              </h2>
              <p className="text-gray-400 font-mono text-[10px] sm:text-xs text-center">
                ENTER_OPERATIVE_IDENTIFIER
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
              <div className="relative group">
                <label className="block text-xs font-semibold text-gray-400 mb-1.5 font-mono text-left">
                  OPERATIVE_IDENTIFIER
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-orange-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full pl-10 pr-3 py-2.5 bg-gray-700/50 border-2 border-gray-600 rounded-lg text-white text-sm placeholder-gray-500 outline-none focus:border-orange-500 focus:bg-gray-700/80 transition-all duration-300 font-mono"
                    placeholder="operative@secure.com"
                  />
                </div>
              </div>

              <button
                type="submit"
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
                disabled={isLoading || !email}
                className="w-full bg-gradient-to-r from-orange-600 to-orange-700 text-white py-2.5 sm:py-3 rounded-lg font-bold text-sm shadow-lg hover:shadow-orange-500/20 transform hover:scale-105 transition-all duration-300 border border-orange-500/30 font-mono flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
              >
                {isLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span className="text-xs sm:text-sm">INITIATING_RECOVERY...</span>
                  </>
                ) : (
                  <>
                    <span className="text-xs sm:text-sm">RECOVER_ACCESS</span>
                    <ChevronRight
                      className={`w-4 h-4 transition-transform duration-300 ${
                        isHovered ? "translate-x-1" : ""
                      }`}
                    />
                  </>
                )}
              </button>
            </form>

            <div className="mt-3 sm:mt-4 text-center">
              <button
                onClick={onBackToLogin}
                className="text-orange-400 hover:text-orange-300 font-mono text-xs transition-colors duration-200 flex items-center justify-center gap-1.5 mx-auto"
              >
                <ArrowLeft className="w-3 h-3" />
                BACK_TO_ACCESS_PORTAL
              </button>
            </div>

            <div className="mt-3 sm:mt-4 bg-gray-700/50 backdrop-blur-sm border border-orange-500/30 rounded-lg p-2.5">
              <div className="flex items-center justify-center gap-1.5 mb-1">
                <Shield className="w-3 h-3 text-orange-400" />
                <p className="font-semibold text-white text-xs font-mono">
                  SECURE_RECOVERY
                </p>
              </div>
              <p className="text-gray-300 text-[10px] font-mono text-center break-words">
                RECOVERY_INSTRUCTIONS_WILL_BE_SENT_TO_YOUR_REGISTERED_COMMUNICATION_CHANNEL
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;
