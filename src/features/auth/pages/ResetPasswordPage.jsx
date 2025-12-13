import React, { useState, useEffect } from "react";
import { Lock, Eye, EyeOff, Check, AlertCircle, ArrowLeft } from "lucide-react";
import BinaryRain from "@/features/shared/ui/BinaryRain";
import axios from "axios";

const API_URL = "http://localhost/HackMe/server/auth/reset_password.php";

const ResetPasswordPage = ({
  token,
  onBackToLogin,
  onResetSuccess,
  isAuthenticatedReset = false,
  currentUser = null,
}) => {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [tokenValid, setTokenValid] = useState(true);
  const isSelfReset = Boolean(isAuthenticatedReset && currentUser);

  useEffect(() => {
    if (!isSelfReset && !token) {
      setTokenValid(false);
      setError("No reset token provided. Invalid or expired link.");
    } else {
      setTokenValid(true);
      setError("");
    }
  }, [token, isSelfReset]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    // Client-side validation
    if (!password || !confirmPassword) {
      setError("Please fill in all fields");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters long");
      return;
    }

    setIsLoading(true);

    try {
      if (isSelfReset && !currentUser?.user_id) {
        setError("Unable to verify user session.");
        setIsLoading(false);
        return;
      }

      const payload = isSelfReset
        ? { user_id: currentUser.user_id, password: password }
        : { token: token, password: password };

      const { data } = await axios.post(API_URL, payload);

      if (data.success) {
        setSuccess(true);
        setPassword("");
        setConfirmPassword("");
        // Redirect after 2 seconds
        setTimeout(() => {
          if (onResetSuccess) {
            onResetSuccess();
          }
        }, 2000);
      } else {
        setError(data.message || "Failed to reset password");
      }
    } catch (err) {
      setError(
        err.response?.data?.message || "Network error: " + err.message
      );
    } finally {
      setIsLoading(false);
    }
  };

  const passwordStrength = () => {
    let strength = 0;
    if (password.length >= 8) strength++;
    if (password.match(/[a-z]/) && password.match(/[A-Z]/)) strength++;
    if (password.match(/[0-9]/)) strength++;
    if (password.match(/[^a-zA-Z0-9]/)) strength++;
    return strength;
  };

  const strengthLabels = ["Very Weak", "Weak", "Good", "Strong"];
  const strengthColors = ["bg-red-500", "bg-orange-500", "bg-yellow-500", "bg-green-500"];

  if (!tokenValid) {
    return (
      <div className="h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black flex items-center justify-center p-3 sm:p-4 relative overflow-hidden">
        <BinaryRain />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-red-500/10 via-gray-900 to-black"></div>

        <div className="relative w-full max-w-md">
          <div className="bg-gray-800/90 backdrop-blur-lg rounded-lg shadow-2xl overflow-hidden border border-red-500/30">
            <div className="bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 p-4 sm:p-5 text-center relative overflow-hidden border-b border-red-500/30">
              <div className="relative z-10">
                <div className="inline-flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 bg-red-500/20 backdrop-blur-sm rounded-full mb-2 border border-red-500/30 mx-auto">
                  <AlertCircle className="w-7 h-7 sm:w-8 sm:h-8 text-red-400" />
                </div>
                <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-red-400 mb-1 font-mono">
                  INVALID_TOKEN
                </h1>
              </div>
            </div>

            <div className="p-4 sm:p-5 text-center">
              <p className="text-gray-400 font-mono mb-4 text-xs sm:text-sm">{error}</p>
              <button
                onClick={onBackToLogin}
                className="w-full bg-gradient-to-r from-red-600 to-red-700 text-white py-2.5 rounded-lg font-semibold hover:shadow-lg transform hover:scale-105 transition-all duration-300 border border-red-500/30 font-mono text-sm"
              >
                BACK_TO_LOGIN
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (success) {
    const successCopy = isSelfReset
      ? "Password updated successfully. Redirecting..."
      : "Password updated successfully. Redirecting to login...";
    const successButton = isSelfReset ? "BACK_TO_HOME" : "BACK_TO_LOGIN";
    return (
      <div className="h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black flex items-center justify-center p-3 sm:p-4 relative overflow-hidden">
        <BinaryRain />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-green-500/10 via-gray-900 to-black"></div>

        <div className="relative w-full max-w-md">
          <div className="bg-gray-800/90 backdrop-blur-lg rounded-lg shadow-2xl overflow-hidden border border-green-500/30">
            <div className="bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 p-4 sm:p-5 text-center relative overflow-hidden border-b border-green-500/30">
              <div className="relative z-10">
                <div className="inline-flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 bg-green-500/20 backdrop-blur-sm rounded-full mb-2 border border-green-500/30 mx-auto">
                  <Check className="w-7 h-7 sm:w-8 sm:h-8 text-green-400" />
                </div>
                <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-green-400 mb-1 font-mono">
                  SUCCESS
                </h1>
              </div>
            </div>

            <div className="p-4 sm:p-5 text-center">
              <p className="text-gray-400 font-mono mb-4 text-xs sm:text-sm">
                {successCopy}
              </p>
              <button
                onClick={onBackToLogin}
                className="w-full bg-gradient-to-r from-green-600 to-green-700 text-white py-2.5 rounded-lg font-semibold hover:shadow-lg transform hover:scale-105 transition-all duration-300 border border-green-500/30 font-mono text-sm"
              >
                {successButton}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black flex items-center justify-center p-3 sm:p-4 relative overflow-hidden">
      <BinaryRain />

      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-blue-500/10 via-gray-900 to-black"></div>
      <div className="absolute top-0 left-0 w-full h-1 bg-indigo-400 animate-pulse"></div>

      <div className="relative w-full max-w-md">
        <div className="bg-gray-800/90 backdrop-blur-lg rounded-lg shadow-2xl overflow-hidden border border-blue-500/30">
          <div className="bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 p-3 sm:p-4 relative overflow-hidden border-b border-blue-500/30">
            <div className="absolute inset-0 bg-blue-500/5"></div>
            <div className="relative z-10 text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 bg-indigo-500/20 backdrop-blur-sm rounded-full mb-2 border border-indigo-500/30 mx-auto">
                <Lock className="w-6 h-6 sm:w-7 sm:h-7 text-indigo-400" />
              </div>
              <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-indigo-400 mb-0.5 font-mono">
                RESET_PASSWORD
              </h1>
              <p className="text-gray-400 font-mono text-[10px] sm:text-xs">
                SECURE_PASSWORD_RECOVERY
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="p-3 sm:p-4 space-y-3 sm:space-y-3.5">
            {error && (
              <div className="flex items-center gap-2 text-red-400 font-mono text-xs bg-red-500/10 border border-red-500/30 rounded-lg p-2">
                <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                <div className="flex-1 break-words">{error}</div>
              </div>
            )}

            {/* New Password Field */}
            <div>
              <label className="block text-gray-300 font-mono text-xs mb-1.5">
                NEW_PASSWORD
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-gray-700/50 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-300 font-mono"
                  placeholder="Enter new password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2.5 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-300"
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>

              {/* Password Strength Indicator - Compact */}
              {password && (
                <div className="mt-1.5">
                  <div className="flex gap-0.5">
                    {[...Array(4)].map((_, i) => (
                      <div
                        key={i}
                        className={`flex-1 h-0.5 rounded-full transition-all ${
                          i < passwordStrength()
                            ? strengthColors[passwordStrength() - 1]
                            : "bg-gray-700"
                        }`}
                      ></div>
                    ))}
                  </div>
                  <p className="text-[10px] font-mono mt-1 text-gray-400">
                    Strength: <span className="text-blue-400">{strengthLabels[Math.max(0, passwordStrength() - 1)]}</span>
                  </p>
                </div>
              )}
            </div>

            {/* Confirm Password Field */}
            <div>
              <label className="block text-gray-300 font-mono text-xs mb-1.5">
                CONFIRM_PASSWORD
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full bg-gray-700/50 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-300 font-mono"
                  placeholder="Confirm new password"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-2.5 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-300"
                >
                  {showConfirmPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>

              {/* Match Indicator - Compact */}
              {confirmPassword && (
                <div className={`mt-1.5 ${password === confirmPassword ? "bg-green-500/10 border border-green-500/30 text-green-300" : "bg-red-500/10 border border-red-500/30 text-red-300"} rounded-lg p-1.5`}>
                  <p className="text-[10px] font-mono">
                    {password === confirmPassword ? "✓ Match" : "✗ No match"}
                  </p>
                </div>
              )}
            </div>

            {/* Password Requirements - Compact */}
            <div className="bg-indigo-500/10 border border-indigo-500/30 rounded-lg p-2">
              <p className="text-gray-300 font-mono text-[10px] mb-1">REQUIREMENTS:</p>
              <ul className="space-y-0.5 text-[10px] font-mono text-gray-400">
                <li className={password.length >= 8 ? "text-green-400" : ""}>• 8+ chars</li>
                <li className={password.match(/[a-z]/) && password.match(/[A-Z]/) ? "text-green-400" : ""}>• Upper & lower</li>
                <li className={password.match(/[0-9]/) ? "text-green-400" : ""}>• Number</li>
                <li className={password.match(/[^a-zA-Z0-9]/) ? "text-green-400" : ""}>• Special char</li>
              </ul>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading || !password || !confirmPassword || password !== confirmPassword}
              className="w-full bg-gradient-to-r from-indigo-600 to-indigo-700 text-white py-2.5 rounded-lg font-semibold hover:shadow-lg transform hover:scale-105 transition-all duration-300 border border-indigo-500/30 font-mono disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center gap-1.5 text-sm"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full"></div>
                  <span className="text-xs">PROCESSING...</span>
                </>
              ) : (
                <>
                  <Lock className="w-3.5 h-3.5" />
                  <span>UPDATE_PASSWORD</span>
                </>
              )}
            </button>

            {/* Back Button */}
            <button
              type="button"
              onClick={onBackToLogin}
              className="w-full bg-gray-700/50 text-gray-300 py-2.5 rounded-lg font-semibold hover:bg-gray-700/80 transition-all duration-300 border border-gray-600 font-mono flex items-center justify-center gap-1.5 text-xs sm:text-sm"
            >
              <ArrowLeft className="w-3 h-3" />
              {isSelfReset ? "BACK_TO_PROFILE" : "BACK_TO_LOGIN"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ResetPasswordPage;
