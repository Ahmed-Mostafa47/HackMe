import React, { useState, useEffect, useRef } from "react";
import {
  Mail,
  Clock,
  RotateCcw,
  ChevronRight,
  Shield,
  Check,
  X,
} from "lucide-react";
import BinaryRain from "@/features/shared/ui/BinaryRain";
import axios from "axios";

const EmailVerificationPage = ({
  email,
  onVerificationComplete,
  onResendCode,
}) => {
  const savedEmail = sessionStorage.getItem("verificationEmail");
  const [code, setCode] = useState(["", "", "", "", "", ""]);
  
  // Calculate initial time left from stored expiration timestamp
  const getInitialTimeLeft = () => {
    const expirationTime = localStorage.getItem("verificationCodeExpiresAt");
    if (expirationTime) {
      const now = Date.now();
      const expiresAt = parseInt(expirationTime, 10);
      const remaining = Math.max(0, Math.floor((expiresAt - now) / 1000));
      return remaining;
    }
    return 300; // Default 5 minutes if no stored time
  };
  
  const [timeLeft, setTimeLeft] = useState(getInitialTimeLeft());
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const inputRefs = useRef([]);
  const userEmail = localStorage.getItem("userEmail") || email || savedEmail || "";
  const savedUsername = localStorage.getItem("username") || "";
  const savedFullName = localStorage.getItem("fullName") || "";

  useEffect(() => {
    if (timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      // Clear expiration time when timer reaches 0
      localStorage.removeItem("verificationCodeExpiresAt");
    }
  }, [timeLeft]);

  const handleChange = (index, value) => {
    if (!/^\d?$/.test(value)) return;

    const newCode = [...code];
    newCode[index] = value;
    setCode(newCode);

    if (value && index < 5) {
      inputRefs.current[index + 1].focus();
    }

    if (newCode.every((digit) => digit !== "") && index === 5) {
      handleSubmit(newCode.join(""));
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === "Backspace" && !code[index] && index > 0) {
      inputRefs.current[index - 1].focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text");
    const digits = pastedData.replace(/\D/g, "").split("").slice(0, 6);

    if (digits.length === 6) {
      const newCode = [...code];
      digits.forEach((digit, index) => {
        newCode[index] = digit;
      });
      setCode(newCode);
      inputRefs.current[5].focus();
      handleSubmit(digits.join(""));
    }
  };

  const handleSubmit = async (verificationCode = code.join("")) => {
    if (verificationCode.length !== 6) {
      setError("INVALID_VERIFICATION_CODE");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const response = await axios.post(
        "http://localhost/HackMe/server/auth/verify_code.php",
        {
          email: userEmail,
          code: verificationCode,
        },
        {
          headers: { "Content-Type": "application/json" },
        }
      );

      const data = response.data;

      if (data.success) {
        setIsLoading(false);
        // Clear expiration time on successful verification
        localStorage.removeItem("verificationCodeExpiresAt");
        onVerificationComplete();
      } else {
        setIsLoading(false);
        setError(data.message || "INVALID_VERIFICATION_CODE");
      }
    } catch (err) {
      setIsLoading(false);
      setError("SERVER_ERROR");
    }
  };

  const handleResendCode = async () => {
    // Allow resending only when time is up (timeLeft === 0)
    if (timeLeft > 0) return;

    setIsLoading(true);
    setError("");
    setSuccessMessage("");

    try {
      const emailToUse = email || userEmail || savedEmail;
      
      if (!emailToUse) {
        setError("Email not found. Please register again.");
        setIsLoading(false);
        return;
      }

      const username = savedUsername || emailToUse.split('@')[0];
      const fullName = savedFullName || emailToUse.split('@')[0];

      const requestData = {
        email: emailToUse,
        username: username,
        fullName: fullName,
      };

      const response = await axios.post(
        "http://localhost/HackMe/server/auth/send_verification.php",
        requestData,
        {
          headers: { "Content-Type": "application/json" },
        }
      );

      const data = response.data;

      if (data.success) {
        // Set new expiration time (5 minutes from now)
        const expirationTime = Date.now() + (5 * 60 * 1000); // 5 minutes in milliseconds
        localStorage.setItem("verificationCodeExpiresAt", expirationTime.toString());
        
        setTimeLeft(300);
        setCode(["", "", "", "", "", ""]);
        setError("");
        setSuccessMessage("Verification code sent successfully!");
        
        if (onResendCode) {
          onResendCode();
        }
        
        setTimeout(() => {
          setSuccessMessage("");
        }, 3000);
        
        setTimeout(() => {
          if (inputRefs.current[0]) {
            inputRefs.current[0].focus();
          }
        }, 100);
      } else {
        setError(data.message || "Failed to resend code");
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Error resending code. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black flex items-center justify-center p-4 relative overflow-hidden">
      <BinaryRain />

      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-green-500/10 via-gray-900 to-black"></div>
      <div className="absolute top-0 left-0 w-full h-1 bg-green-400 animate-pulse"></div>

      <div className="relative w-full max-w-md">
        <div className="bg-gray-800/90 backdrop-blur-lg rounded-lg shadow-2xl overflow-hidden border border-green-500/30">
          <div className="bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 p-8 text-center relative overflow-hidden border-b border-green-500/30">
            <div className="absolute inset-0 bg-green-500/5"></div>
            <div className="relative z-10">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-green-500/20 backdrop-blur-sm rounded-full mb-4 border border-green-500/30 mx-auto relative">
                <Shield className="w-10 h-10 text-green-400" />
                <div className="absolute inset-0 rounded-full bg-green-400/20 animate-ping"></div>
              </div>
              <h1 className="text-3xl font-bold text-green-400 mb-2 font-mono">
                IDENTITY_VERIFICATION
              </h1>
              <p className="text-gray-400 font-mono text-sm">
                SECURE_ACCESS_PROTOCOL
              </p>
            </div>
          </div>

          <div className="p-8">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-white mb-3 font-mono">
                VERIFICATION_REQUIRED
              </h2>
              <p className="text-gray-400 font-mono text-lg mb-1 text-center">
                CODE_SENT_TO:
              </p>
              <p className="text-green-400 font-mono font-semibold text-lg break-all text-center">
                {email ? email.replace(/[<>]/g, '') : ''}
              </p>
            </div>

            <div className="mb-8">
              <label className="block text-sm font-semibold text-gray-400 mb-4 font-mono text-center">
                ENTER_6_DIGIT_CODE
              </label>

              <div className="flex justify-center gap-3 mb-6">
                {code.map((digit, index) => (
                  <input
                    key={index}
                    ref={(el) => (inputRefs.current[index] = el)}
                    type="text"
                    inputMode="numeric"
                    maxLength="1"
                    value={digit}
                    onChange={(e) => handleChange(index, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(index, e)}
                    onPaste={handlePaste}
                    className="w-14 h-14 bg-gray-700/50 border-2 border-gray-600 rounded-lg text-white text-center text-xl font-mono outline-none focus:border-green-500 focus:bg-gray-700/80 transition-all duration-300"
                    disabled={isLoading}
                  />
                ))}
              </div>

              <div className="flex items-center justify-center gap-2 text-sm text-gray-400 font-mono mb-4">
                <Clock className="w-4 h-4" />
                <span>CODE_EXPIRES_IN: {formatTime(timeLeft)}</span>
              </div>

              {successMessage && (
                <div className="flex items-center justify-center gap-2 text-green-400 font-mono text-sm mb-4 bg-green-500/10 border border-green-500/30 rounded-lg p-3">
                  <Check className="w-4 h-4 flex-shrink-0" />
                  <span className="text-center">{successMessage.replace(/[<>]/g, '')}</span>
                </div>
              )}

              {error && (
                <div className="flex items-center justify-center gap-2 text-red-400 font-mono text-sm mb-4">
                  <X className="w-4 h-4" />
                  <span>{error.replace(/[<>]/g, '')}</span>
                </div>
              )}
            </div>

            <div className="text-center mb-6">
              <button
                onClick={handleResendCode}
                disabled={timeLeft > 0 || isLoading}
                className={`flex items-center justify-center gap-2 mx-auto font-mono text-sm transition-all duration-200 px-4 py-2 rounded-lg border ${
                  timeLeft > 0 || isLoading
                    ? "text-gray-500 border-gray-600/30 bg-gray-700/20 cursor-not-allowed"
                    : "text-green-400 border-green-500/30 bg-green-500/10 hover:bg-green-500/20 hover:border-green-500/50 hover:text-green-300"
                }`}
              >
                <RotateCcw className="w-4 h-4" />
                {timeLeft > 0
                  ? `RESEND_IN: ${formatTime(timeLeft)}`
                  : "RESEND_CODE"}
              </button>
            </div>

            <button
              onClick={() => handleSubmit()}
              disabled={isLoading || code.some((digit) => digit === "")}
              className="w-full bg-gradient-to-r from-green-600 to-green-700 text-white py-4 rounded-lg font-bold text-lg shadow-lg hover:shadow-green-500/20 transform hover:scale-105 transition-all duration-300 border border-green-500/30 font-mono flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              {isLoading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  VERIFYING_IDENTITY
                </>
              ) : (
                <>
                  VERIFY_OPERATIVE
                  <ChevronRight className="w-5 h-5" />
                </>
              )}
            </button>

            <div className="mt-6 bg-gray-700/50 backdrop-blur-sm border border-green-500/30 rounded-lg p-4">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Shield className="w-4 h-4 text-green-400" />
                <p className="font-semibold text-white text-sm font-mono">
                  SECURE_VERIFICATION
                </p>
              </div>
              <p className="text-gray-400 text-xs font-mono text-center leading-relaxed break-words">
                ENTER_THE_6_DIGIT_CODE_SENT_TO_YOUR_COMMUNICATION_CHANNEL
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmailVerificationPage;
