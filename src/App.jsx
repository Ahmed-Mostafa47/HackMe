import React, { useState, useEffect, useRef } from "react";
import {
  BrowserRouter as Router,
  useNavigate,
  useLocation,
  Navigate,
} from "react-router-dom";
import LoginPage from "./features/auth/pages/LoginPage";
import RegisterPage from "./features/auth/pages/RegisterPage";
import EmailVerificationPage from "./features/auth/pages/EmailVerificationPage";
import SetPasswordPage from "./features/auth/pages/SetPasswordPage";
import ForgotPasswordPage from "./features/auth/pages/ForgotPasswordPage";
import ResetPasswordPage from "./features/auth/pages/ResetPasswordPage";
import ChangePasswordPage from "./features/auth/pages/ChangePasswordPage";
import Navbar from "./features/layout/Navbar";
import HomePage from "./features/home/HomePage";
import LandingPage from "./features/home/LandingPage";
import LeaderboardPage from "./features/dashboard/LeaderboardPage";
import TrainingSelectionPage from "./features/dashboard/TrainingSelectionPage";
import LabsListModern from "./features/labs/LabsListModern";
import LabsCategoriesPage from "./features/labs/LabsCategoriesPage";
import LabDetailsModern from "./features/labs/LabDetailsModern";
import LabWhiteboxPage from "./features/labs/LabWhiteboxPage";
import InstructorLabsDashboard from "./features/labs/InstructorLabsDashboard";
import AdminLabsDashboard from "./features/labs/AdminLabsDashboard";
import SandboxLabApp from "./features/labs/SandboxLabApp";
import CommentsPage from "./features/network/CommentsPage";
import ProfilePage from "./features/profile/ProfilePage";
import AdminDashboardPage from "./features/dashboard/AdminDashboardPage";
import AuditLogsPage from "./features/dashboard/AuditLogsPage";
import AttemptLogsPage from "./features/dashboard/AttemptLogsPage";
import SecurityDashboardPage from "./features/dashboard/SecurityDashboardPage";
import NotificationsPage from "./features/notifications/NotificationsPage";
import NotificationContainer from "./components/notifications/NotificationContainer";
import axios from "axios";
import { useAuth } from "./hooks/useAuth";
import { useLabs } from "./hooks/useLabs";
import "./styles/animations.css";
import { WHITEBOX_WORKBENCH_LAB_IDS } from "./constants/labs";
import { fetchHackMeMachineIdentity } from "./utils/hackmeIdentity";

const API_BASE = "http://localhost/HackMe/server/api";

function AppContent() {
  const {
    isLoggedIn,
    currentUser,
    handleLogin,
    handleLogout,
    checkExistingSession,
    updateUserPoints,
  } = useAuth();
  const { selectedLabType, setSelectedLabType } = useLabs();

  const navigate = useNavigate();
  const location = useLocation();

  const [authMode, setAuthMode] = useState("login");
  const [pendingUser, setPendingUser] = useState(null);
  const [verificationEmail, setVerificationEmail] = useState("");
  const [roleRequestStatus, setRoleRequestStatus] = useState(null);
  const [roleRequestLoading, setRoleRequestLoading] = useState(false);
  const [roleRequestMessage, setRoleRequestMessage] = useState("");
  const [pendingRoleRequests, setPendingRoleRequests] = useState([]);
  const [adminStats, setAdminStats] = useState(null);
  const [roleRequestAlert, setRoleRequestAlert] = useState(null);
  const lastRestrictedAttemptKeyRef = useRef({});
  const lastUrlTamperAttemptKeyRef = useRef({});

  const buildLabRoute = (lab, fromCategory, labType) => {
    const id = Number(lab?.lab_id);
    if (WHITEBOX_WORKBENCH_LAB_IDS.includes(id)) {
      const q = new URLSearchParams();
      q.set("labId", String(id));
      if (fromCategory) q.set("fromCategory", String(fromCategory));
      if (labType) q.set("labType", String(labType));
      return `/lab-whitebox?${q.toString()}`;
    }
    const q = new URLSearchParams();
    q.set("labId", String(id));
    if (fromCategory) q.set("fromCategory", String(fromCategory));
    if (labType) q.set("labType", String(labType));
    return `/lab-modern?${q.toString()}`;
  };

  const markAllowedLabNav = (labId) => {
    try {
      sessionStorage.setItem(
        "hackme_allowed_lab_nav",
        JSON.stringify({
          lab_id: Number(labId),
          ts: Date.now(),
        })
      );
    } catch (_) {}
  };

  const isAllowedLabNav = (labId) => {
    try {
      const raw = sessionStorage.getItem("hackme_allowed_lab_nav");
      if (!raw) return false;
      const parsed = JSON.parse(raw);
      const sameLab = Number(parsed?.lab_id) === Number(labId);
      const fresh = Number(parsed?.ts || 0) > 0 && Date.now() - Number(parsed.ts) <= 10 * 60 * 1000;
      return sameLab && fresh;
    } catch {
      return false;
    }
  };

  const reportUrlTamperAttempt = async (path, reason) => {
    const uid = currentUser?.user_id ?? currentUser?.id;
    if (!uid) return false;
    let localIp = "";
    try {
      const identity = await fetchHackMeMachineIdentity();
      localIp = identity?.local_ipv4 || "";
    } catch (_) {}
    const payload = JSON.stringify({
      user_id: uid,
      username: currentUser?.username || "",
      action: "url_tamper_attempt",
      status: "failed",
      details: `URL tamper attempt: ${path} | ${reason}`,
      client_local_ip: localIp,
      client_time_utc: new Date().toISOString(),
      client_timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "",
      client_tz_offset_minutes: new Date().getTimezoneOffset(),
    });
    try {
      const res = await fetch(`${API_BASE}/audit_event.php`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: payload,
        keepalive: true,
      });
      const data = await res.json().catch(() => ({}));
      return Boolean(data?.blocked);
    } catch (_) {
      return false;
    }
  };

  useEffect(() => {
    checkExistingSession();
  }, []);

  useEffect(() => {
    if (!authMode) {
      setAuthMode("login");
    }
    const path = location.pathname;
    // For authenticated routes, don't change authMode
    if (isLoggedIn && (path === "/change-password" || path === "/profile")) {
      return;
    }
    if (path === "/register") setAuthMode("register");
    else if (path === "/verify") setAuthMode("verification");
    else if (path === "/set-password") setAuthMode("setPassword");
    else if (path === "/forgot-password") setAuthMode("forgotPassword");
    else if (path === "/reset-password") setAuthMode("resetPassword");
    else if (path === "/login") setAuthMode("login");
    else if (path === "/" && !isLoggedIn) setAuthMode("landing");
    else setAuthMode("login");
  }, [location, isLoggedIn]);

  useEffect(() => {
    const savedEmail = sessionStorage.getItem("verificationEmail");
    if (savedEmail && !verificationEmail) {
      setVerificationEmail(savedEmail);
    }
  }, [verificationEmail]);

  useEffect(() => {
    if (currentUser?.user_id) {
      fetchRoleRequestStatus(currentUser.user_id);
    } else {
      setRoleRequestStatus(null);
      setRoleRequestMessage("");
    }
  }, [currentUser]);

  useEffect(() => {
    if (!roleRequestMessage) return;
    const timer = setTimeout(() => {
      setRoleRequestMessage("");
      setRoleRequestAlert(null);
    }, 4000);
    return () => clearTimeout(timer);
  }, [roleRequestMessage]);

  // When lab is solved (e.g. SQL lab in new tab), refresh points from DB
  useEffect(() => {
    const handler = async (e) => {
      const t = e?.data?.type;
      if (t !== "LAB_SOLVED" && t !== "HACKME_LAB_SOLVED") return;
      const uid = currentUser?.user_id ?? currentUser?.id;
      if (!uid) return;
      try {
        const res = await fetch(`${API_BASE}/get_user_points.php?user_id=${uid}`);
        const data = await res.json();
        if (data.success && data.total_points != null) {
          updateUserPoints(data.total_points);
        }
      } catch (_) {}
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, [currentUser?.user_id, currentUser?.id, updateUserPoints]);

  // Refresh points when user returns to tab (e.g. after solving lab in another tab)
  useEffect(() => {
    const refetchPoints = async () => {
      if (!currentUser?.user_id || document.visibilityState !== "visible") return;
      try {
        const res = await fetch(`${API_BASE}/get_user_points.php?user_id=${currentUser.user_id}`);
        const data = await res.json();
        if (data.success && data.total_points != null) {
          updateUserPoints(data.total_points);
        }
      } catch (_) {}
    };
    const onVisible = () => refetchPoints();
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [currentUser?.user_id, updateUserPoints]);

  const handleRegisterStart = async (userData) => {
    try {
      const response = await fetch(
        "http://localhost/HackMe/server/auth/send_verification.php",
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
        
        // Store expiration time (5 minutes from now)
        const expirationTime = Date.now() + (5 * 60 * 1000); // 5 minutes in milliseconds
        localStorage.setItem("verificationCodeExpiresAt", expirationTime.toString());
        
        navigate("/verify");
      } else {
        alert(data.message || "❌ Registration failed.");
      }
    } catch (error) {
      alert("⚠️ Error connecting to server.");
    }
  };

  const handleVerificationComplete = () => {
    // Clear expiration time on verification complete
    localStorage.removeItem("verificationCodeExpiresAt");
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
      // Clear pending user state
      setPendingUser(null);
      sessionStorage.removeItem("verificationEmail");
      alert("✅ Account created successfully! Please log in with your credentials.");
      navigate("/");
    } else {
      alert("⚠️ Account created but there was an error. Please try logging in manually.");
      navigate("/");
    }
  };

  const handleBackToVerification = () => navigate("/verify");
  const handleForgotPassword = () => navigate("/forgot-password");
  const handleBackToLogin = () => navigate("/login");
  const handleChangePassword = () => navigate("/change-password");
  const handleProfilePasswordReset = () => navigate("/reset-password?mode=profile");
  
  const handleDeleteAccount = async (password) => {
    if (!currentUser?.user_id) {
      alert("⚠️ Error: User not found.");
      return false;
    }

    try {
      const response = await axios.post(
        "http://localhost/HackMe/server/auth/delete_account.php",
        {
          user_id: currentUser.user_id,
          password: password,
        },
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      if (response.data && response.data.success) {
        // Logout user and redirect to landing page
        handleLogout();
        navigate("/");
        alert("✅ Account deleted successfully.");
        return true;
      } else {
        const errorMessage = response.data?.message || "Failed to delete account.";
        alert("⚠️ " + errorMessage);
        return false;
      }
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message || "Error connecting to server.";
      alert("⚠️ " + errorMessage);
      return false;
    }
  };
  const handleLoginSuccess = (userData) => {
    handleLogin(userData);
    navigate("/home");
  };
  const handleLogoutWithNavigation = async () => {
    const userId = currentUser?.user_id || currentUser?.id;
    const username = currentUser?.username || "";
    if (userId) {
      let localIp = "";
      try {
        const identity = await fetchHackMeMachineIdentity();
        localIp = identity?.local_ipv4 || "";
      } catch (_) {}
      const payload = JSON.stringify({
        user_id: userId,
        username,
        action: "logout",
        status: "success",
        details: "User logged out",
        client_local_ip: localIp,
        client_time_utc: new Date().toISOString(),
        client_timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "",
        client_tz_offset_minutes: new Date().getTimezoneOffset(),
      });
      try {
        await fetch(`${API_BASE}/audit_event.php`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: payload,
          keepalive: true,
        });
      } catch (_) {}
    }
    handleLogout();
    navigate("/");
  };

  const fetchRoleRequestStatus = async (userId) => {
    try {
      const { data } = await axios.get(`${API_BASE}/request_role.php`, {
        params: { user_id: userId },
      });
      if (data.success) {
        setRoleRequestStatus(data.request?.status || null);
      }
    } catch (error) {
      setRoleRequestAlert("error");
      setRoleRequestMessage(
        error.response?.data?.message || "Unable to load role requests."
      );
    }
  };

  const fetchPendingRoleRequests = async () => {
    try {
      const { data } = await axios.get(`${API_BASE}/request_role.php`, {
        params: { all: 1 },
      });
      if (data.success) {
        setPendingRoleRequests(data.requests || []);
        setAdminStats(data.stats || null);
      }
    } catch (error) {
      setRoleRequestAlert("error");
      setRoleRequestMessage(
        error.response?.data?.message || "Unable to load pending requests."
      );
    }
  };

  const handleRoleRequest = async (requestedRole, comment = "") => {
    if (!currentUser?.user_id) {
      console.error("No user_id available");
      return;
    }
    setRoleRequestLoading(true);
    setRoleRequestMessage("");
    
    const requestData = {
      user_id: currentUser.user_id,
      requested_role: requestedRole,
      comment: comment,
    };
    
    console.log("Sending role request:", requestData);
    console.log("API URL:", `${API_BASE}/request_role.php`);
    
    try {
      const response = await axios.post(`${API_BASE}/request_role.php`, requestData, {
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      console.log("Role request response:", response);
      const data = response.data;
      
      if (data.success) {
        setRoleRequestStatus(data.request?.status || "pending");
        setRoleRequestMessage(
          data.message || "Role request submitted successfully."
        );
        setRoleRequestAlert("success");
        fetchPendingRoleRequests();
      } else {
        console.error("Role request failed - success is false:", data);
        setRoleRequestMessage(data.message || "Unable to submit role request.");
        setRoleRequestAlert("error");
      }
    } catch (error) {
      console.error("Role request catch block - Full error:", error);
      console.error("Error response:", error.response);
      console.error("Error response data:", error.response?.data);
      console.error("Error message:", error.message);
      
      const errorMessage = error.response?.data?.message || 
                          error.response?.data?.error || 
                          error.message || 
                          "Unable to submit role request.";
      setRoleRequestMessage(errorMessage);
      setRoleRequestAlert("error");
    } finally {
      setRoleRequestLoading(false);
    }
  };

  const getUserRoles = () => {
    if (!currentUser) return [];
    if (Array.isArray(currentUser.roles)) {
      return currentUser.roles;
    }
    if (currentUser.role) {
      return [currentUser.role];
    }
    if (currentUser.profile_meta?.rank) {
      return [currentUser.profile_meta.rank.toLowerCase()];
    }
    return [];
  };

  const hasRole = (roleName) => {
    const normalized = roleName?.toLowerCase();
    return getUserRoles()
      .map((role) =>
        typeof role === "string" ? role.toLowerCase() : String(role).toLowerCase()
      )
      .includes(normalized);
  };

  const isAdmin =
    hasRole("admin") || hasRole("superadmin") || currentUser?.profile_meta?.rank === "ADMIN";
  const isSuperAdmin = hasRole("superadmin");
  const isInstructor =
    hasRole("instructor") ||
    currentUser?.profile_meta?.rank === "INSTRUCTOR";

  useEffect(() => {
    if (isAdmin) {
      fetchPendingRoleRequests();
    } else {
      setPendingRoleRequests([]);
      setAdminStats(null);
    }
  }, [isAdmin]);

  useEffect(() => {
    const path = location.pathname;
    const uid = currentUser?.user_id ?? currentUser?.id;
    if (!isLoggedIn || !uid) {
      lastUrlTamperAttemptKeyRef.current = {};
      return;
    }

    if (path !== "/lab-whitebox" && path !== "/lab-modern") {
      lastUrlTamperAttemptKeyRef.current = {};
      return;
    }

    const params = new URLSearchParams(location.search);
    const currentLabId = params.get("labId") || "";
    if (!currentLabId || isAllowedLabNav(currentLabId)) {
      lastUrlTamperAttemptKeyRef.current = {};
      return;
    }

    const key = `${uid}:${path}:${currentLabId}`;
    const now = Date.now();
    const lastAt = Number(lastUrlTamperAttemptKeyRef.current[key] || 0);
    if (now - lastAt < 1500) {
      return;
    }
    lastUrlTamperAttemptKeyRef.current[key] = now;

    navigate("/home", { replace: true });
    reportUrlTamperAttempt(path, "lab_id_modified").then((blocked) => {
      if (blocked) {
        handleLogout();
        navigate("/", { replace: true });
      }
    });
  }, [
    isLoggedIn,
    currentUser?.user_id,
    currentUser?.id,
    location.pathname,
    location.search,
    navigate,
  ]);

  useEffect(() => {
    const path = location.pathname;
    const uid = currentUser?.user_id ?? currentUser?.id;
    if (!isLoggedIn || !uid) {
      lastRestrictedAttemptKeyRef.current = {};
      return;
    }

    let restrictionMessage = "";
    if (path === "/instructor-labs" && !isInstructor && !isAdmin) {
      restrictionMessage = "INSTRUCTOR_PRIVILEGES_REQUIRED";
    } else if ((path === "/admin" || path === "/admin-labs") && !isAdmin && !isSuperAdmin) {
      restrictionMessage = "ADMIN_PRIVILEGES_REQUIRED";
    } else if (
      (path === "/audit-logs" || path === "/attempt-logs" || path === "/security-dashboard") &&
      !isSuperAdmin
    ) {
      restrictionMessage = "SUPERADMIN_PRIVILEGES_REQUIRED";
    }

    if (!restrictionMessage) {
      lastRestrictedAttemptKeyRef.current = {};
      return;
    }

    const key = `${uid}:${path}:${restrictionMessage}`;
    const now = Date.now();
    const lastAt = Number(lastRestrictedAttemptKeyRef.current[key] || 0);
    if (now - lastAt < 1500) return;
    lastRestrictedAttemptKeyRef.current[key] = now;

    navigate("/home", { replace: true });

    (async () => {
      let localIp = "";
      try {
        const identity = await fetchHackMeMachineIdentity();
        localIp = identity?.local_ipv4 || "";
      } catch (_) {}
      const payload = JSON.stringify({
        user_id: uid,
        username: currentUser?.username || "",
        action: "access_restricted",
        status: "failed",
        details: `Attempted restricted route: ${path} | ${restrictionMessage}`,
        client_local_ip: localIp,
        client_time_utc: new Date().toISOString(),
        client_timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "",
        client_tz_offset_minutes: new Date().getTimezoneOffset(),
      });
      try {
        const res = await fetch(`${API_BASE}/audit_event.php`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: payload,
          keepalive: true,
        });
        const data = await res.json().catch(() => ({}));
        if (data?.blocked) {
          handleLogout();
          navigate("/", { replace: true });
        }
      } catch (_) {}
    })();
  }, [
    location.pathname,
    isLoggedIn,
    isInstructor,
    isAdmin,
    isSuperAdmin,
    currentUser?.user_id,
    currentUser?.id,
    currentUser?.username,
    navigate,
  ]);

  // Special-case: sandbox lab app (isolated, no auth / navbar)
  if (location.pathname === "/lab-sandbox") {
    return <SandboxLabApp />;
  }

  const renderAuthPage = () => {
    switch (authMode) {
      case "landing":
        return (
          <LandingPage
            onNavigateToLogin={() => navigate("/login")}
            onNavigateToRegister={() => navigate("/register")}
          />
        );
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
            onSwitchToLogin={() => navigate("/login")}
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
        if (location.pathname === "/" && !isLoggedIn) {
          return (
            <LandingPage
              onNavigateToLogin={() => navigate("/login")}
              onNavigateToRegister={() => navigate("/register")}
            />
          );
        }
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
    const params = new URLSearchParams(location.search);
    const routeToken = params.get("token");
    const resetMode = params.get("mode");
    const labId = params.get("labId");
    switch (path) {
      case "/home":
      case "/":
        return <HomePage setCurrentPage={(p) => navigate(`/${p}`)} />;
      case "/dashboard":
        return <LeaderboardPage currentUser={currentUser} />;
      case "/training":
        return (
          <TrainingSelectionPage
            setCurrentPage={(p) => navigate(`/${p}`)}
            setSelectedLabType={setSelectedLabType}
            isAdmin={isAdmin}
            isInstructor={isInstructor}
            onAddLab={() => navigate("/instructor-labs")}
          />
        );
      case "/labs": {
        const labTypeParam = params.get("labType");
        const categoryParam = params.get("category");
        const backToCategories = () =>
          navigate(`/labs?labType=${labTypeParam || "white_box"}`);
        const backToTraining = () => navigate("/training");

        if (!labTypeParam) {
          return <Navigate to="/training" replace />;
        }

        if (!categoryParam) {
          return (
            <LabsCategoriesPage
              labType={labTypeParam}
              onBack={backToTraining}
              onSelectCategory={(cat) =>
                navigate(`/labs?labType=${labTypeParam}&category=${cat}`)
              }
              onOpenLab={(lab, categoryKey) => {
                if (lab?.coming_soon) {
                  window.alert("Soon");
                  return;
                }
                markAllowedLabNav(lab?.lab_id);
                navigate(buildLabRoute(lab, categoryKey, labTypeParam));
              }}
            />
          );
        }

        return (
          <LabsListModern
            selectedLabType={selectedLabType}
            isAdmin={isAdmin}
            isInstructor={isInstructor}
            labType={labTypeParam}
            category={categoryParam}
            onEditLab={() => {}}
            onRemoveLab={() => {}}
            onBack={backToCategories}
            onAddLab={() => navigate("/instructor-labs")}
            onLabClick={(lab) => {
              if (lab?.coming_soon) {
                window.alert("Soon");
                return;
              }
              markAllowedLabNav(lab?.lab_id);
              navigate(buildLabRoute(lab, categoryParam, labTypeParam));
            }}
          />
        );
      }
      case "/lab-whitebox": {
        const wbLabId = params.get("labId") || String(WHITEBOX_WORKBENCH_LAB_IDS[0]);
        if (!isAllowedLabNav(wbLabId)) {
          return <HomePage setCurrentPage={(p) => navigate(`/${p}`)} />;
        }
        return (
          <LabWhiteboxPage
            key={wbLabId}
            currentUser={currentUser}
            onFlagSuccess={async () => {
              if (!currentUser?.user_id) return;
              try {
                const res = await fetch(`${API_BASE}/get_user_points.php?user_id=${currentUser.user_id}`);
                const data = await res.json();
                if (data.success && data.total_points != null) {
                  updateUserPoints(data.total_points);
                }
              } catch (_) {}
            }}
          />
        );
      }
      case "/lab-modern": {
        const fromCat = params.get("fromCategory");
        const fromType = params.get("labType");
        const labBack =
          fromCat && fromType
            ? `/labs?labType=${fromType}&category=${fromCat}`
            : "/training";
        if (!isAllowedLabNav(labId)) {
          return <HomePage setCurrentPage={(p) => navigate(`/${p}`)} />;
        }
        return (
          <LabDetailsModern
            key={labId}
            labId={labId}
            onBack={() => navigate(labBack)}
            currentUser={currentUser}
            onFlagSuccess={async () => {
              if (!currentUser?.user_id) return;
              try {
                const res = await fetch(`${API_BASE}/get_user_points.php?user_id=${currentUser.user_id}`);
                const data = await res.json();
                if (data.success && data.total_points != null) {
                  updateUserPoints(data.total_points);
                }
              } catch (_) {}
            }}
          />
        );
      }
      case "/comments":
        return <CommentsPage currentUser={currentUser} isAdmin={isAdmin} />;
      case "/notifications":
        return <NotificationsPage currentUser={currentUser} />;
      case "/profile":
        return (
          <ProfilePage
            currentUser={currentUser}
            onRequestRole={handleRoleRequest}
            onChangePassword={handleChangePassword}
            onDeleteAccount={handleDeleteAccount}
            roleRequestStatus={roleRequestStatus}
            isAdmin={isAdmin}
            isInstructor={isInstructor}
            roleRequestMessage={roleRequestMessage}
            roleRequestLoading={roleRequestLoading}
            roleRequestAlert={roleRequestAlert}
          />
        );
      case "/instructor-labs":
        if (!isInstructor && !isAdmin) return <HomePage setCurrentPage={(p) => navigate(`/${p}`)} />;
        return <InstructorLabsDashboard />;
      case "/admin":
        if (!isAdmin && !isSuperAdmin) return <HomePage setCurrentPage={(p) => navigate(`/${p}`)} />;
        return (
          <AdminDashboardPage
            pendingRoleRequests={pendingRoleRequests}
            overviewStats={adminStats}
            currentUser={currentUser}
            onOpenAdminLabs={() => navigate("/admin-labs#lab-proposals")}
          />
        );
      case "/admin-labs":
        if (!isAdmin && !isSuperAdmin) return <HomePage setCurrentPage={(p) => navigate(`/${p}`)} />;
        return <AdminLabsDashboard />;
      case "/audit-logs":
        if (!isSuperAdmin) return <HomePage setCurrentPage={(p) => navigate(`/${p}`)} />;
        return <AuditLogsPage currentUser={currentUser} />;
      case "/attempt-logs":
        if (!isSuperAdmin) return <HomePage setCurrentPage={(p) => navigate(`/${p}`)} />;
        return <AttemptLogsPage currentUser={currentUser} />;
      case "/security-dashboard":
        if (!isSuperAdmin) return <HomePage setCurrentPage={(p) => navigate(`/${p}`)} />;
        return <SecurityDashboardPage currentUser={currentUser} />;
      case "/reset-password":
        return (
          <ResetPasswordPage
            token={routeToken}
            isAuthenticatedReset={!routeToken && resetMode === "profile"}
            currentUser={currentUser}
            onBackToLogin={() => navigate("/profile")}
            onResetSuccess={() => navigate("/home")}
          />
        );
      case "/change-password":
        return (
          <ChangePasswordPage
            currentUser={currentUser}
            onBackToProfile={() => navigate("/profile")}
            onPasswordChangeSuccess={() => navigate("/profile")}
            onForgotPassword={handleForgotPassword}
          />
        );
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
            isAdmin={isAdmin}
            isSuperAdmin={isSuperAdmin}
          />
          <NotificationContainer 
            userId={currentUser?.user_id || currentUser?.id} 
            onNotificationClick={(notification) => {
              if (notification.link) {
                navigate(notification.link);
              }
            }}
          />
          <div key={location.pathname + location.search}>
            {renderPage()}
          </div>
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
