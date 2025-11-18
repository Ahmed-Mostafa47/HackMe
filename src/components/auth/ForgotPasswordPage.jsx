import React, { useState } from "react";
import { Mail, ChevronRight, Shield, ArrowLeft, Check } from "lucide-react";
import BinaryRain from "../ui/BinaryRain";

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
      const response = await fetch('http://localhost/graduatoin_project/src/components/auth/forgot_password.php', {
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
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black flex items-center justify-center p-4 relative overflow-hidden">
        <BinaryRain />

        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-green-500/10 via-gray-900 to-black"></div>

        <div className="relative w-full max-w-md">
          <div className="bg-gray-800/90 backdrop-blur-lg rounded-lg shadow-2xl overflow-hidden border border-green-500/30">
            <div className="bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 p-8 text-center relative overflow-hidden border-b border-green-500/30">
              <div className="absolute inset-0 bg-green-500/5"></div>
              <div className="relative z-10">
                <div className="inline-flex items-center justify-center w-20 h-20 bg-green-500/20 backdrop-blur-sm rounded-full mb-4 border border-green-500/30 mx-auto">
                  <Check className="w-10 h-10 text-green-400" />
                </div>
                <h1 className="text-3xl font-bold text-green-400 mb-2 font-mono">
                  RECOVERY_SENT
                </h1>
                <p className="text-gray-400 font-mono text-sm">
                  ACCESS_RECOVERY_INITIATED
                </p>
              </div>
            </div>

            <div className="p-8 text-center">
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-white mb-4 font-mono">
                  RECOVERY_PROTOCOL_ACTIVE
                </h2>
                <p className="text-gray-400 font-mono mb-2 text-center">
                  ACCESS_RECOVERY_INSTRUCTIONS_SENT_TO:
                </p>
                <p className="text-green-400 font-mono font-semibold break-all">
                  {email}
                </p>
              </div>

              <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4 mb-6">
                <p className="text-green-300 font-mono text-sm text-center break-words">
                  CHECK_YOUR_COMMUNICATION_CHANNEL_FOR_RECOVERY_INSTRUCTIONS
                </p>
              </div>

              <div className="space-y-4">
                <button
                  onClick={handleReset}
                  className="w-full bg-gradient-to-r from-green-600 to-green-700 text-white py-3 rounded-lg font-semibold hover:shadow-lg transform hover:scale-105 transition-all duration-300 border border-green-500/30 font-mono"
                >
                  RESET_ANOTHER_ACCOUNT
                </button>

                <button
                  onClick={onBackToLogin}
                  className="w-full bg-gray-700/50 text-gray-300 py-3 rounded-lg font-semibold hover:bg-gray-700/80 transition-all duration-300 border border-gray-600 font-mono flex items-center justify-center gap-2"
                >
                  <ArrowLeft className="w-4 h-4" />
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
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black flex items-center justify-center p-4 relative overflow-hidden">
      <BinaryRain />

      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-orange-500/10 via-gray-900 to-black"></div>
      <div className="absolute top-0 left-0 w-full h-1 bg-orange-400 animate-pulse"></div>

      <div className="relative w-full max-w-md">
        <div className="bg-gray-800/90 backdrop-blur-lg rounded-lg shadow-2xl overflow-hidden border border-orange-500/30">
          <div className="bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 p-8 text-center relative overflow-hidden border-b border-orange-500/30">
            <div className="absolute inset-0 bg-orange-500/5"></div>
            <div className="relative z-10">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-orange-500/20 backdrop-blur-sm rounded-full mb-4 border border-orange-500/30 mx-auto">
                <Shield className="w-10 h-10 text-orange-400" />
              </div>
              <h1 className="text-3xl font-bold text-orange-400 mb-2 font-mono">
                ACCESS_RECOVERY
              </h1>
              <p className="text-gray-400 font-mono text-sm">
                OPERATIVE_IDENTITY_RECOVERY
              </p>
            </div>
          </div>

          <div className="p-8">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-white mb-2 font-mono">
                RECOVER_ACCESS
              </h2>
              <p className="text-gray-400 font-mono text-center">
                ENTER_OPERATIVE_IDENTIFIER
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="relative group">
                <label className="block text-sm font-semibold text-gray-400 mb-2 font-mono text-left">
                  OPERATIVE_IDENTIFIER
                </label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-orange-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full pl-12 pr-4 py-4 bg-gray-700/50 border-2 border-gray-600 rounded-lg text-white placeholder-gray-500 outline-none focus:border-orange-500 focus:bg-gray-700/80 transition-all duration-300 font-mono"
                    placeholder="operative@secure.com"
                  />
                </div>
              </div>

              <button
                type="submit"
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
                disabled={isLoading || !email}
                className="w-full bg-gradient-to-r from-orange-600 to-orange-700 text-white py-4 rounded-lg font-bold text-lg shadow-lg hover:shadow-orange-500/20 transform hover:scale-105 transition-all duration-300 border border-orange-500/30 font-mono flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
              >
                {isLoading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    INITIATING_RECOVERY...
                  </>
                ) : (
                  <>
                    RECOVER_ACCESS
                    <ChevronRight
                      className={`w-5 h-5 transition-transform duration-300 ${
                        isHovered ? "translate-x-1" : ""
                      }`}
                    />
                  </>
                )}
              </button>
            </form>

            <div className="mt-6 text-center">
              <button
                onClick={onBackToLogin}
                className="text-orange-400 hover:text-orange-300 font-mono text-sm transition-colors duration-200 flex items-center justify-center gap-2 mx-auto"
              >
                <ArrowLeft className="w-4 h-4" />
                BACK_TO_ACCESS_PORTAL
              </button>
            </div>

            <div className="mt-6 bg-gray-700/50 backdrop-blur-sm border border-orange-500/30 rounded-lg p-4">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Shield className="w-4 h-4 text-orange-400" />
                <p className="font-semibold text-white text-sm font-mono">
                  SECURE_RECOVERY
                </p>
              </div>
              <p className="text-gray-300 text-xs font-mono text-center break-words">
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
