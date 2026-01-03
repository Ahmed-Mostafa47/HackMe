import React, { use, useState } from "react";
import {
  Lock,
  Key,
  Eye,
  EyeOff,
  ChevronRight,
  Shield,
  Check,
  X,
} from "lucide-react";
import BinaryRain from "@/features/shared/ui/BinaryRain";
import axios from "axios";



const SetPasswordPage = ({ email, onPasswordSet, onBackToVerification }) => {
  // Retrieve registration data from localStorage
  const userEmail = email || localStorage.getItem('userEmail') || '';
  const username = localStorage.getItem('username') || '';
  const fullName = localStorage.getItem('fullName') || '';

  const [formData, setFormData] = useState({
    password: "",
    confirmPassword: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [isHovered, setIsHovered] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });

    // Clear errors when user types
    if (errors[e.target.name]) {
      setErrors({
        ...errors,
        [e.target.name]: "",
      });
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (formData.password.length < 8) {
      newErrors.password = "PASSWORD_TOO_SHORT_MIN_8_CHARACTERS";
    }

    if (
      !/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/.test(formData.password)
    ) {
      newErrors.password =
        "PASSWORD_REQUIRES_UPPERCASE_LOWERCASE_NUMBER_SPECIAL_CHAR";
    }

    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = "PASSWORDS_DO_NOT_MATCH";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
  e.preventDefault();

  if (!validateForm()) {
    return;
  }

  setIsLoading(true);

  // Debug: Log what we're sending
  const requestData = {
    email: userEmail,
    password: formData.password,
    fullName: fullName,
    username: username,
  };

  // Validate that we have all required data
  if (!userEmail || !username || !fullName) {
    alert("❌ Missing registration data. Please start the registration process again.");
    setIsLoading(false);
    return;
  }

  try {
    const response = await axios.post(
      "http://localhost/HackMe/server/auth/set_password.php",
      requestData,
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    const data = response.data;

    if (data && data.success) {
      // Pass the complete response data including user_id
      const userData = {
        user_id: data.user_id,
        username: username,
        email: userEmail,
        full_name: fullName,
        total_points: 0,
        profile_meta: {
          avatar: "🆕",
          rank: "USER",
          specialization: "TRAINING",
          join_date: new Date().toISOString()
        }
      };
      
      // Clear registration data from localStorage after successful password set
      localStorage.removeItem('userEmail');
      localStorage.removeItem('username');
      localStorage.removeItem('fullName');
      
      // Pass user data instead of just password - no alert here, will show in handlePasswordSet
      onPasswordSet(userData);
    } else {
      const errorMessage = data?.message || response.data || "Failed to set password";
      alert("❌ " + errorMessage);
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


  const getPasswordStrength = (password) => {
    if (password.length === 0)
      return { strength: 0, text: "ENTER_PASSWORD", color: "gray" };
    if (password.length < 8)
      return { strength: 25, text: "TOO_SHORT", color: "red" };

    const hasLower = /[a-z]/.test(password);
    const hasUpper = /[A-Z]/.test(password);
    const hasNumber = /\d/.test(password);
    const hasSpecial = /[@$!%*?&]/.test(password);

    const requirements = [hasLower, hasUpper, hasNumber, hasSpecial];
    const metCount = requirements.filter(Boolean).length;

    if (metCount === 1) return { strength: 25, text: "WEAK", color: "red" };
    if (metCount === 2) return { strength: 50, text: "FAIR", color: "yellow" };
    if (metCount === 3) return { strength: 75, text: "GOOD", color: "blue" };
    if (metCount === 4)
      return { strength: 100, text: "STRONG", color: "green" };

    return { strength: 0, text: "WEAK", color: "red" };
  };

  const passwordStrength = getPasswordStrength(formData.password);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black flex items-center justify-center p-4 relative overflow-hidden">
      <BinaryRain />

      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-indigo-500/10 via-gray-900 to-black"></div>
      <div className="absolute top-0 left-0 w-full h-1 bg-indigo-400 animate-pulse"></div>

      <div className="relative w-full max-w-md">
        <div className="bg-gray-800/90 backdrop-blur-lg rounded-lg shadow-2xl overflow-hidden border border-indigo-500/30">
          <div className="bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 p-8 text-center relative overflow-hidden border-b border-indigo-500/30">
            <div className="absolute inset-0 bg-indigo-500/5"></div>
            <div className="relative z-10">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-indigo-500/20 backdrop-blur-sm rounded-full mb-4 border border-indigo-500/30 mx-auto">
                <Shield className="w-10 h-10 text-indigo-400" />
              </div>
              <h1 className="text-3xl font-bold text-indigo-400 mb-2 font-mono">
                SECURE_ACCESS
              </h1>
              <p className="text-gray-400 font-mono text-sm">
                PASSWORD_SETUP
              </p>
            </div>
          </div>

          <div className="p-8">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-white mb-2 font-mono">
                SET_PASSWORD
              </h2>
              <p className="text-gray-400 font-mono text-center">
                OPERATIVE: {userEmail}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Password Input */}
              <div className="relative group">
                <label className="block text-sm font-semibold text-gray-400 mb-2 font-mono text-left">
                  NEW_PASSWORD
                </label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-indigo-400" />
                  <input
                    type={showPassword ? "text" : "password"}
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    required
                    className="w-full pl-12 pr-12 py-4 bg-gray-700/50 border-2 border-gray-600 rounded-lg text-white placeholder-gray-500 outline-none focus:border-indigo-500 focus:bg-gray-700/80 transition-all duration-300 font-mono"
                    placeholder="MIN_8_CHARACTERS"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 transform -translate-y-1/2 text-indigo-400 hover:text-indigo-300 transition"
                  >
                    {showPassword ? (
                      <EyeOff className="w-5 h-5" />
                    ) : (
                      <Eye className="w-5 h-5" />
                    )}
                  </button>
                </div>

                {/* Password Strength Indicator */}
                {formData.password && (
                  <div className="mt-2">
                    <div className="flex justify-between text-xs text-gray-400 font-mono mb-1">
                      <span>STRENGTH: {passwordStrength.text}</span>
                      <span>{formData.password.length}/8</span>
                    </div>
                    <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          passwordStrength.color === "red"
                            ? "bg-red-500"
                            : passwordStrength.color === "yellow"
                            ? "bg-yellow-500"
                            : passwordStrength.color === "blue"
                            ? "bg-blue-500"
                            : "bg-green-500"
                        }`}
                        style={{ width: `${passwordStrength.strength}%` }}
                      ></div>
                    </div>
                  </div>
                )}

                {errors.password && (
                  <div className=" items-center gap-2 text-red-400 font-mono text-sm mt-2 break-words">
                    <X className="w-4 h-4" />
                    <span className="text-left">{errors.password}</span>
                  </div>
                )}
              </div>

              {/* Confirm Password Input */}
              <div className="relative group">
                <label className="block text-sm font-semibold text-gray-400 mb-2 font-mono text-left">
                  CONFIRM_PASSWORD
                </label>
                <div className="relative">
                  <Key className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-indigo-400" />
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    required
                    className="w-full pl-12 pr-12 py-4 bg-gray-700/50 border-2 border-gray-600 rounded-lg text-white placeholder-gray-500 outline-none focus:border-indigo-500 focus:bg-gray-700/80 transition-all duration-300 font-mono"
                    placeholder="REPEAT_PASSWORD"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-4 top-1/2 transform -translate-y-1/2 text-indigo-400 hover:text-indigo-300 transition"
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="w-5 h-5" />
                    ) : (
                      <Eye className="w-5 h-5" />
                    )}
                  </button>
                </div>

                {errors.confirmPassword && (
                  <div className="flex items-center gap-2 text-red-400 font-mono text-sm mt-2">
                    <X className="w-4 h-4" />
                    <span className="text-left">{errors.confirmPassword}</span>
                  </div>
                )}
              </div>

              {/* Password Requirements */}
              <div className="bg-gray-700/30 rounded-lg p-4 border border-gray-600">
                <h3 className="text-green-400 font-mono text-sm mb-2 text-left">
                  SECURITY_REQUIREMENTS:
                </h3>
                <div className="space-y-1 text-xs text-gray-400 font-mono">
                  <div className="flex items-center gap-2">
                    <Check
                      className={`w-3 h-3 ${
                        formData.password.length >= 8
                          ? "text-green-400"
                          : "text-gray-500"
                      }`}
                    />
                    <span className="text-left">MINIMUM_8_CHARACTERS</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check
                      className={`w-3 h-3 ${
                        /(?=.*[a-z])/.test(formData.password)
                          ? "text-green-400"
                          : "text-gray-500"
                      }`}
                    />
                    <span className="text-left">LOWERCASE_LETTER</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check
                      className={`w-3 h-3 ${
                        /(?=.*[A-Z])/.test(formData.password)
                          ? "text-green-400"
                          : "text-gray-500"
                      }`}
                    />
                    <span className="text-left">UPPERCASE_LETTER</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check
                      className={`w-3 h-3 ${
                        /\d/.test(formData.password)
                          ? "text-green-400"
                          : "text-gray-500"
                      }`}
                    />
                    <span className="text-left">NUMERIC_CHARACTER</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check
                      className={`w-3 h-3 ${
                        /[@$!%*?&]/.test(formData.password)
                          ? "text-green-400"
                          : "text-gray-500"
                      }`}
                    />
                    <span className="text-left">
                      SPECIAL_CHARACTER (@$!%*?&)
                    </span>
                  </div>
                </div>
              </div>

              <button
                type="submit"
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-indigo-600 to-indigo-700 text-white py-4 rounded-lg font-bold text-lg shadow-lg hover:shadow-indigo-500/20 transform hover:scale-105 transition-all duration-300 border border-indigo-500/30 font-mono flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
              >
                {isLoading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    SECURING_ACCESS...
                  </>
                ) : (
                  <>
                    ACTIVATE_OPERATIVE
                    <ChevronRight
                      className={`w-5 h-5 transition-transform duration-300 ${
                        isHovered ? "translate-x-1" : ""
                      }`}
                    />
                  </>
                )}
              </button>
            </form>

            {/* Back to Verification */}
            <div className="mt-6 text-center">
              <button
                onClick={onBackToVerification}
                className="text-indigo-400 hover:text-indigo-300 font-mono text-sm transition-colors duration-200"
              >
                ← BACK_TO_VERIFICATION
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SetPasswordPage;
