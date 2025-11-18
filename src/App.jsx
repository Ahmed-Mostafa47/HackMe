import React, { useState, useEffect } from "react";
import {
  BrowserRouter as Router,
  useNavigate,
  useLocation,
} from "react-router-dom";
import LoginPage from "./components/auth/LoginPage";
import RegisterPage from "./components/auth/RegisterPage";
import EmailVerificationPage from "./components/auth/EmailVerificationPage";
import SetPasswordPage from "./components/auth/SetPasswordPage";
import ForgotPasswordPage from "./components/auth/ForgotPasswordPage";
import ResetPasswordPage from "./components/auth/ResetPasswordPage";
import Navbar from "./components/layout/Navbar";
import HomePage from "./components/pages/HomePage";
import Dashboard from "./components/pages/Dashboard";
import TrainingSelectionPage from "./components/pages/TrainingSelectionPage";
import LabsPage from "./components/pages/LabsPage";
import LabDetailPage from "./components/pages/LabDetailPage";
import ChallengePage from "./components/pages/ChallengePage";
import CommentsPage from "./components/pages/CommentsPage";
import { useAuth } from "./hooks/useAuth";
import { useLabs } from "./hooks/useLabs";
import "./styles/animations.css";

function AppContent() {
  const { isLoggedIn, currentUser, handleLogin, handleRegister, handleLogout } =
    useAuth();
  const { selectedLabType, setSelectedLabType } = useLabs();

  const navigate = useNavigate();
  const location = useLocation();

  const [authMode, setAuthMode] = useState("login");
  const [pendingUser, setPendingUser] = useState(null);
  const [verificationEmail, setVerificationEmail] = useState("");

  useEffect(() => {
    if (!authMode) {
      setAuthMode("login");
    }
    const path = location.pathname;
    if (path === "/register") setAuthMode("register");
    else if (path === "/verify") setAuthMode("verification");
    else if (path === "/set-password") setAuthMode("setPassword");
    else if (path === "/forgot-password") setAuthMode("forgotPassword");
    else if (path === "/reset-password") setAuthMode("resetPassword");
    else setAuthMode("login");
  }, [location]);

  useEffect(() => {
    const savedEmail = sessionStorage.getItem("verificationEmail");
    if (savedEmail && !verificationEmail) {
      setVerificationEmail(savedEmail);
    }
  }, [verificationEmail]);

  const handleRegisterStart = async (userData) => {
    try {
      const response = await fetch(
        "http://localhost/graduatoin%20project/src/components/auth/send_verification.php",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(userData),
        }
      );
      const data = await response.json();

      if (data.success) {
        alert("✅ Verification code sent to your email.");
        setPendingUser(userData);
        setVerificationEmail(userData.email);
        sessionStorage.setItem("verificationEmail", userData.email); // حفظ الإيميل مؤقتًا
        navigate("/verify");
      } else {
        alert(data.message || "❌ Registration failed.");
      }
    } catch (error) {
      console.error("Error:", error);
      alert("⚠️ Error connecting to server.");
    }
  };

  const handleVerificationComplete = () => {
    navigate("/set-password");
  };

  const handleResendCode = () => {
    alert("📧 Verification code re-sent to " + verificationEmail);
  };

  // 🔐 بعد تعيين الباسورد
  const handlePasswordSet = (userData) => {
    // Password is already set in the database by SetPasswordPage
    // userData contains the complete user information from the server response
    if (userData && userData.user_id) {
      console.log("Account created successfully!", userData);
      // Clear pending user state
      setPendingUser(null);
      sessionStorage.removeItem("verificationEmail");
      alert("✅ Account created successfully! Please log in with your credentials.");
      navigate("/");
    } else {
      console.error("Invalid user data received:", userData);
      alert("⚠️ Account created but there was an error. Please try logging in manually.");
      navigate("/");
    }
  };

  const handleBackToVerification = () => navigate("/verify");
  const handleForgotPassword = () => navigate("/forgot-password");
  const handleBackToLogin = () => navigate("/");
  const handleLoginSuccess = (userData) => {
    handleLogin(userData);
    navigate("/home");
  };
  const handleLogoutWithNavigation = () => {
    handleLogout();
    navigate("/");
  };

  const renderAuthPage = () => {
    switch (authMode) {
      case "login":
        return (
          <LoginPage
            onLogin={handleLoginSuccess}
            onSwitchToRegister={() => navigate("/register")}
            onForgotPassword={handleForgotPassword}
          />
        );
      case "register":
        return (
          <RegisterPage
            onRegister={handleRegisterStart}
            onSwitchToLogin={() => navigate("/")}
          />
        );
      case "verification":
        return (
          <EmailVerificationPage
            email={
              verificationEmail || sessionStorage.getItem("verificationEmail")
            }
            onVerificationComplete={handleVerificationComplete}
            onResendCode={handleResendCode}
          />
        );
      case "setPassword":
        return (
          <SetPasswordPage
            email={
              verificationEmail || sessionStorage.getItem("verificationEmail")
            }
            onPasswordSet={handlePasswordSet}
            onBackToVerification={handleBackToVerification}
          />
        );
      case "forgotPassword":
        return <ForgotPasswordPage onBackToLogin={handleBackToLogin} />;
      case "resetPassword":
        const params = new URLSearchParams(location.search);
        const resetToken = params.get("token");
        return (
          <ResetPasswordPage
            token={resetToken}
            onBackToLogin={handleBackToLogin}
            onResetSuccess={() => {
              handleBackToLogin();
            }}
          />
        );
      default:
        return (
          <LoginPage
            onLogin={handleLoginSuccess}
            onSwitchToRegister={() => navigate("/register")}
            onForgotPassword={handleForgotPassword}
          />
        );
    }
  };

  const renderPage = () => {
    const path = location.pathname;
    switch (path) {
      case "/home":
      case "/":
        return <HomePage setCurrentPage={(p) => navigate(`/${p}`)} />;
      case "/dashboard":
        return <Dashboard />;
      case "/training":
        return (
          <TrainingSelectionPage
            setCurrentPage={(p) => navigate(`/${p}`)}
            setSelectedLabType={setSelectedLabType}
          />
        );
      case "/labs":
        return (
          <LabsPage
            setCurrentPage={(p) => navigate(`/${p}`)}
            selectedLabType={selectedLabType}
          />
        );
      case "/lab-detail":
        return <LabDetailPage setCurrentPage={(p) => navigate(`/${p}`)} />;
      case "/challenge":
        return <ChallengePage setCurrentPage={(p) => navigate(`/${p}`)} />;
      case "/comments":
        return <CommentsPage />;
      default:
        return <HomePage setCurrentPage={(p) => navigate(`/${p}`)} />;
    }
  };

  return (
    <div className="min-h-screen">
      {!isLoggedIn ? (
        renderAuthPage()
      ) : (
        <>
          <Navbar
            setCurrentPage={(p) => navigate(`/${p}`)}
            onLogout={handleLogoutWithNavigation}
            currentPage={location.pathname.replace("/", "") || "home"}
            currentUser={currentUser}
          />
          {renderPage()}
        </>
      )}
    </div>
  );
}

export default function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}
