import React, { useState } from "react";
import { Lock, Eye, EyeOff, Check, AlertCircle, ArrowLeft } from "lucide-react";
import BinaryRain from "@/features/shared/ui/BinaryRain";
import axios from "axios";

const API_URL = "http://localhost/HackMe/server/auth/change_password.php";

const ChangePasswordPage = ({
  currentUser,
  onBackToProfile,
  onPasswordChangeSuccess,
  onForgotPassword,
}) => {
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [oldPasswordInvalid, setOldPasswordInvalid] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setOldPasswordInvalid(false);

    // Client-side validation
    if (!oldPassword || !newPassword || !confirmPassword) {
      setError("Please fill in all fields");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("New passwords do not match");
      return;
    }

    if (newPassword.length < 8) {
      setError("New password must be at least 8 characters long");
      return;
    }

    if (oldPassword === newPassword) {
      setError("New password must be different from old password");
      return;
    }

    setIsLoading(true);

    try {
      const { data } = await axios.post(API_URL, {
        user_id: currentUser.user_id,
        old_password: oldPassword,
        new_password: newPassword,
        client_time_utc: new Date().toISOString(),
        client_timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "",
        client_tz_offset_minutes: new Date().getTimezoneOffset(),
      });

      if (data.success) {
        setSuccess(true);
        setOldPassword("");
        setNewPassword("");
        setConfirmPassword("");
        // Redirect after 2 seconds
        setTimeout(() => {
          if (onPasswordChangeSuccess) {
            onPasswordChangeSuccess();
          }
        }, 2000);
      } else {
        if (data.message && (data.message.includes("incorrect") || data.message.includes("invalid"))) {
          setOldPasswordInvalid(true);
          setError(data.message);
        } else {
          setError(data.message || "Failed to change password");
        }
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
    if (newPassword.length >= 8) strength++;
    if (newPassword.match(/[a-z]/) && newPassword.match(/[A-Z]/)) strength++;
    if (newPassword.match(/[0-9]/)) strength++;
    if (newPassword.match(/[^a-zA-Z0-9]/)) strength++;
    return strength;
  };

  const strengthLabels = ["Very Weak", "Weak", "Good", "Strong"];
  const strengthColors = ["bg-red-500", "bg-orange-500", "bg-yellow-500", "bg-green-500"];

  if (success) {
    return (
      <div className="h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black flex items-center justify-center p-2 sm:p-3 pt-16 sm:pt-20 relative overflow-hidden">
        <BinaryRain />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-green-500/10 via-gray-900 to-black"></div>

        <div className="relative w-full max-w-md mx-auto max-h-[85vh] flex flex-col">
          <div className="bg-gray-800/90 backdrop-blur-lg rounded-lg shadow-2xl overflow-hidden border border-green-500/30 flex flex-col max-h-full">
            <div className="bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 p-2 sm:p-3 text-center relative overflow-hidden border-b border-green-500/30 flex-shrink-0">
              <div className="relative z-10">
                <div className="inline-flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 bg-green-500/20 backdrop-blur-sm rounded-full mb-1 border border-green-500/30 mx-auto">
                  <Check className="w-5 h-5 sm:w-6 sm:h-6 text-green-400" />
                </div>
                <h1 className="text-base sm:text-lg md:text-xl font-bold text-green-400 mb-0.5 font-mono">
                  PASSWORD_CHANGED
                </h1>
              </div>
            </div>

            <div className="p-2 sm:p-3 text-center">
              <p className="text-gray-400 font-mono mb-2 sm:mb-3 text-[10px] sm:text-xs">
                Password changed successfully. Redirecting...
              </p>
              <button
                onClick={onBackToProfile}
                className="w-full bg-gradient-to-r from-green-600 to-green-700 text-white py-2 sm:py-2.5 rounded-lg font-semibold hover:shadow-lg transform hover:scale-105 transition-all duration-300 border border-green-500/30 font-mono text-xs sm:text-sm"
              >
                BACK_TO_PROFILE
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black flex items-center justify-center p-2 sm:p-3 pt-16 sm:pt-20 relative overflow-hidden">
      <BinaryRain />

      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-blue-500/10 via-gray-900 to-black"></div>
      <div className="absolute top-0 left-0 w-full h-1 bg-indigo-400 animate-pulse"></div>

      <div className="relative w-full max-w-md mx-auto max-h-[85vh] flex flex-col">
        <div className="bg-gray-800/90 backdrop-blur-lg rounded-lg shadow-2xl overflow-hidden border border-blue-500/30 flex flex-col max-h-full">
          <div className="bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 p-2 sm:p-3 text-center relative overflow-hidden border-b border-blue-500/30 flex-shrink-0">
            <div className="absolute inset-0 bg-blue-500/5"></div>
            <div className="relative z-10 text-center">
              <div className="inline-flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 bg-indigo-500/20 backdrop-blur-sm rounded-full mb-1 border border-indigo-500/30 mx-auto">
                <Lock className="w-5 h-5 sm:w-6 sm:h-6 text-indigo-400" />
              </div>
              <h1 className="text-base sm:text-lg md:text-xl font-bold text-indigo-400 mb-0.5 font-mono">
                CHANGE_PASSWORD
              </h1>
              <p className="text-gray-400 font-mono text-[10px] sm:text-xs">
                UPDATE_SECURITY_CREDENTIALS
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="p-2 sm:p-3 pb-4 sm:pb-5 space-y-2 sm:space-y-2.5">
            {error && (
              <div className="flex items-start gap-1.5 text-red-400 font-mono text-[10px] sm:text-xs bg-red-500/10 border border-red-500/30 rounded-lg p-2">
                <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="break-words">{error}</p>
                  {oldPasswordInvalid && (
                    <button
                      type="button"
                      onClick={() => {
                        setError("");
                        setOldPasswordInvalid(false);
                      }}
                      className="mt-1.5 text-orange-400 hover:text-orange-300 underline text-[9px] sm:text-[10px] break-words"
                    >
                      Use "Forgot Password" instead →
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Old Password Field */}
            <div>
              <label className="block text-gray-300 font-mono text-[10px] sm:text-xs mb-1">
                CURRENT_PASSWORD
              </label>
              <div className="relative">
                <input
                  type={showOldPassword ? "text" : "password"}
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  className={`w-full bg-gray-700/50 border rounded-lg px-2.5 sm:px-3 py-2 sm:py-2.5 text-white text-xs sm:text-sm placeholder-gray-500 focus:outline-none focus:ring-2 transition-all duration-300 font-mono ${
                    oldPasswordInvalid
                      ? "border-red-500 focus:border-red-500 focus:ring-red-500/20"
                      : "border-gray-600 focus:border-blue-500 focus:ring-blue-500/20"
                  }`}
                  placeholder="Enter current password"
                />
                <button
                  type="button"
                  onClick={() => setShowOldPassword(!showOldPassword)}
                  className="absolute right-2 sm:right-2.5 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-300"
                >
                  {showOldPassword ? (
                    <EyeOff className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  ) : (
                    <Eye className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  )}
                </button>
              </div>
            </div>

            {/* New Password Field */}
            <div>
              <label className="block text-gray-300 font-mono text-[10px] sm:text-xs mb-1">
                NEW_PASSWORD
              </label>
              <div className="relative">
                <input
                  type={showNewPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full bg-gray-700/50 border border-gray-600 rounded-lg px-2.5 sm:px-3 py-2 sm:py-2.5 text-white text-xs sm:text-sm placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-300 font-mono"
                  placeholder="Enter new password"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-2 sm:right-2.5 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-300"
                >
                  {showNewPassword ? (
                    <EyeOff className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  ) : (
                    <Eye className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  )}
                </button>
              </div>

              {/* Password Strength Indicator */}
              {newPassword && (
                <div className="mt-1.5">
                  <div className="flex gap-0.5">
                    {[...Array(4)].map((_, i) => (
                      <div
                        key={i}
                        className={`flex-1 h-0.5 sm:h-1 rounded-full transition-all ${
                          i < passwordStrength()
                            ? strengthColors[passwordStrength() - 1]
                            : "bg-gray-700"
                        }`}
                      ></div>
                    ))}
                  </div>
                  <p className="text-[9px] sm:text-[10px] font-mono mt-1 text-gray-400">
                    Strength: <span className="text-blue-400">{strengthLabels[Math.max(0, passwordStrength() - 1)]}</span>
                  </p>
                </div>
              )}
            </div>

            {/* Confirm Password Field */}
            <div>
              <label className="block text-gray-300 font-mono text-[10px] sm:text-xs mb-1">
                CONFIRM_NEW_PASSWORD
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full bg-gray-700/50 border border-gray-600 rounded-lg px-2.5 sm:px-3 py-2 sm:py-2.5 text-white text-xs sm:text-sm placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-300 font-mono"
                  placeholder="Confirm new password"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-2 sm:right-2.5 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-300"
                >
                  {showConfirmPassword ? (
                    <EyeOff className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  ) : (
                    <Eye className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  )}
                </button>
              </div>

              {/* Match Indicator */}
              {confirmPassword && (
                <div className={`mt-1.5 ${newPassword === confirmPassword ? "bg-green-500/10 border border-green-500/30 text-green-300" : "bg-red-500/10 border border-red-500/30 text-red-300"} rounded-lg p-1.5`}>
                  <p className="text-[9px] sm:text-[10px] font-mono">
                    {newPassword === confirmPassword ? "✓ Match" : "✗ No match"}
                  </p>
                </div>
              )}
            </div>

            {/* Password Requirements */}
            <div className="bg-indigo-500/10 border border-indigo-500/30 rounded-lg p-2 sm:p-2.5">
              <p className="text-gray-300 font-mono text-[9px] sm:text-[10px] mb-1">REQUIREMENTS:</p>
              <ul className="space-y-0.5 text-[9px] sm:text-[10px] font-mono text-gray-400">
                <li className={newPassword.length >= 8 ? "text-green-400" : ""}>• 8+ chars</li>
                <li className={newPassword.match(/[a-z]/) && newPassword.match(/[A-Z]/) ? "text-green-400" : ""}>• Upper & lower</li>
                <li className={newPassword.match(/[0-9]/) ? "text-green-400" : ""}>• Number</li>
                <li className={newPassword.match(/[^a-zA-Z0-9]/) ? "text-green-400" : ""}>• Special char</li>
              </ul>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading || !oldPassword || !newPassword || !confirmPassword}
              className="w-full bg-gradient-to-r from-indigo-600 to-indigo-700 text-white py-2 sm:py-2.5 rounded-lg font-semibold hover:shadow-lg transform hover:scale-105 transition-all duration-300 border border-indigo-500/30 font-mono text-xs sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              {isLoading ? (
                <>
                  <span className="inline-flex items-center gap-1.5">
                    <div className="w-3.5 h-3.5 sm:w-4 sm:h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span className="text-[10px] sm:text-xs">UPDATING...</span>
                  </span>
                </>
              ) : (
                "UPDATE_PASSWORD"
              )}
            </button>

            {/* Back to Profile Button */}
            <button
              type="button"
              onClick={onBackToProfile}
              className="w-full bg-gray-700/50 text-gray-300 py-2 sm:py-2.5 rounded-lg font-semibold hover:bg-gray-700/80 transition-all duration-300 border border-gray-600 font-mono flex items-center justify-center gap-1.5 text-[10px] sm:text-xs mb-2 sm:mb-3"
            >
              <ArrowLeft className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              BACK_TO_PROFILE
            </button>

            {/* Forgot Password Link */}
            {oldPasswordInvalid && (
              <div className="text-center mb-2 sm:mb-3">
                <button
                  type="button"
                  onClick={() => {
                    if (onForgotPassword) {
                      onForgotPassword();
                    } else {
                      window.location.href = "/forgot-password";
                    }
                  }}
                  className="text-orange-400 hover:text-orange-300 font-mono text-[9px] sm:text-[10px] underline"
                >
                  FORGOT_PASSWORD? →
                </button>
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
};

export default ChangePasswordPage;
