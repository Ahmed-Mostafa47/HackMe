import React, { useState, useEffect, useRef } from "react";
import { Shield, Users, Database, Activity, ChevronDown, ChevronUp, UserPlus, UserMinus, Trash2, AlertTriangle, Search } from "lucide-react";
import axios from "axios";

const API_BASE = "http://localhost/HackMe/server/api";

const AdminDashboardPage = ({
  pendingRoleRequests = [],
  overviewStats = {},
  currentUser = null,
}) => {
  const [requests, setRequests] = useState(pendingRoleRequests);
  const [processingId, setProcessingId] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [statsData, setStatsData] = useState(overviewStats);
  const [statusMessage, setStatusMessage] = useState(null);
  const [statusType, setStatusType] = useState("info");
  const statusTimerRef = useRef(null);
  const prevPendingRef = useRef(
    pendingRoleRequests.filter((r) => r.status === "pending" || !r.status)
      .length
  );
  
  // Users management state
  const [showUsers, setShowUsers] = useState(false);
  const [users, setUsers] = useState([]);
  const [availableRoles, setAvailableRoles] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [processingUserId, setProcessingUserId] = useState(null);
  const [deleteConfirmUserId, setDeleteConfirmUserId] = useState(null);
  const [deletingUserId, setDeletingUserId] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    setRequests(pendingRoleRequests);
  }, [pendingRoleRequests]);
  useEffect(() => {
    const pendingCount = requests.filter(
      (r) => r.status === "pending" || !r.status
    ).length;
    if (pendingCount > (prevPendingRef.current ?? 0)) {
      triggerStatusMessage("REQUEST SUBMITTED SUCCESSFULLY", "success");
    }
    prevPendingRef.current = pendingCount;
  }, [requests]);


  useEffect(() => {
    setStatsData(overviewStats);
  }, [overviewStats]);

  useEffect(() => {
    return () => {
      if (statusTimerRef.current) {
        clearTimeout(statusTimerRef.current);
      }
    };
  }, []);

  const triggerStatusMessage = (message, type = "info") => {
    setStatusMessage(message);
    setStatusType(type);
    if (statusTimerRef.current) {
      clearTimeout(statusTimerRef.current);
    }
    statusTimerRef.current = setTimeout(() => {
      setStatusMessage(null);
    }, 4000);
  };

  const fetchLatestRequests = async () => {
    setIsRefreshing(true);
    try {
      const { data } = await axios.get(`${API_BASE}/request_role.php`, {
        params: { all: 1 },
      });
      if (data.success) {
        const nextRequests = data.requests || [];
        setRequests(nextRequests);
        setStatsData((prev) => data.stats || prev || {});
        const pendingCount = nextRequests.filter(
          (r) => r.status === "pending" || !r.status
        ).length;
        if (pendingCount > (prevPendingRef.current ?? 0)) {
          triggerStatusMessage("REQUEST SUBMITTED SUCCESSFULLY", "success");
        }
        prevPendingRef.current = pendingCount;
      }
    } catch (error) {
      triggerStatusMessage(
        error.response?.data?.message || "FAILED TO REFRESH REQUESTS",
        "error"
      );
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchLatestRequests();
  }, []);

  // Fetch users when section is opened
  useEffect(() => {
    if (showUsers) {
      fetchUsers();
    }
  }, [showUsers]);

  const fetchUsers = async () => {
    setLoadingUsers(true);
    try {
      const { data } = await axios.get(`${API_BASE}/manage_users.php`, {
        params: {
          current_user_id: currentUser?.user_id,
        },
      });
      if (data.success) {
        setUsers(data.users || []);
        setAvailableRoles(data.available_roles || []);
      }
    } catch (error) {
      triggerStatusMessage(
        error.response?.data?.message || "FAILED TO LOAD USERS",
        "error"
      );
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleAssignRole = async (targetUserId, roleName) => {
    setProcessingUserId(targetUserId);
    try {
      const { data } = await axios.post(`${API_BASE}/manage_users.php`, {
        current_user_id: currentUser?.user_id,
        target_user_id: targetUserId,
        role_name: roleName,
      });
      if (data.success) {
        triggerStatusMessage(
          `ROLE ${roleName.toUpperCase()} ASSIGNED (PREVIOUS_ROLES_REMOVED)`,
          "success"
        );
        fetchUsers();
      }
    } catch (error) {
      triggerStatusMessage(
        error.response?.data?.message || "FAILED TO ASSIGN ROLE",
        "error"
      );
    } finally {
      setProcessingUserId(null);
    }
  };

  const handleRemoveRole = async (targetUserId, roleName) => {
    setProcessingUserId(targetUserId);
    try {
      const { data } = await axios.put(`${API_BASE}/manage_users.php`, {
        current_user_id: currentUser?.user_id,
        target_user_id: targetUserId,
        role_name: roleName,
      });
      if (data.success) {
        triggerStatusMessage(`ROLE ${roleName.toUpperCase()} REMOVED`, "success");
        fetchUsers();
      }
    } catch (error) {
      triggerStatusMessage(
        error.response?.data?.message || "FAILED TO REMOVE ROLE",
        "error"
      );
    } finally {
      setProcessingUserId(null);
    }
  };

  const handleDeleteUser = async (targetUserId) => {
    setDeletingUserId(targetUserId);
    try {
      const { data } = await axios.delete(`${API_BASE}/manage_users.php`, {
        data: {
          current_user_id: currentUser?.user_id,
          target_user_id: targetUserId,
        },
      });
      if (data.success) {
        triggerStatusMessage("USER_DELETED_SUCCESSFULLY", "success");
        setDeleteConfirmUserId(null);
        fetchUsers();
      }
    } catch (error) {
      triggerStatusMessage(
        error.response?.data?.message || "FAILED_TO_DELETE_USER",
        "error"
      );
    } finally {
      setDeletingUserId(null);
    }
  };

  const isSuperAdmin = currentUser?.roles?.includes('superadmin') || currentUser?.permissions?.includes('manage_permissions');

  const handleApprove = async (requestId, userId) => {
    setProcessingId(requestId);
    try {
      const { data } = await axios.put(`${API_BASE}/request_role.php`, {
        request_id: requestId,
        status: "approved",
      });
      if (data.success) {
        setRequests((prev) =>
          prev.filter((r) => (r.request_id || r.id || r?.req_id) !== requestId)
        );
        triggerStatusMessage("REQUEST APPROVED", "success");
        fetchLatestRequests();
      }
    } catch (error) {
      triggerStatusMessage(
        error.response?.data?.message || "APPROVAL_FAILED",
        "error"
      );
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (requestId) => {
    setProcessingId(requestId);
    try {
      const { data } = await axios.put(`${API_BASE}/request_role.php`, {
        request_id: requestId,
        status: "rejected",
      });
      if (data.success) {
        setRequests((prev) =>
          prev.filter((r) => (r.request_id || r.id || r?.req_id) !== requestId)
        );
        triggerStatusMessage("REQUEST REJECTED", "success");
        fetchLatestRequests();
      }
    } catch (error) {
      triggerStatusMessage(
        error.response?.data?.message || "REJECTION_FAILED",
        "error"
      );
    } finally {
      setProcessingId(null);
    }
  };

  const pendingRequests = requests.filter(
    (r) => r.status === "pending" || !r.status
  ).length;

  const stats = [
    {
      label: "TOTAL_USERS",
      value: statsData?.total_users ?? 0,
      icon: Users,
      gradient: "from-green-600 to-green-700",
    },
    {
      label: "TOTAL_LABS",
      value: statsData?.total_labs ?? 0,
      icon: Database,
      gradient: "from-blue-600 to-blue-700",
    },
    {
      label: "PENDING_ROLE_REQUESTS",
      value: statsData?.pending_role_requests ?? pendingRequests,
      icon: Shield,
      gradient: "from-purple-600 to-purple-700",
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-gray-800 pt-20 sm:pt-24 pb-8 sm:pb-12 px-3 sm:px-4 md:px-6">
      {statusMessage && (
        <div
          className={`fixed top-20 sm:top-24 left-1/2 -translate-x-1/2 md:left-auto md:right-6 md:translate-x-0 z-50 px-3 sm:px-4 md:px-5 py-2 sm:py-3 rounded-lg sm:rounded-xl border font-mono text-xs sm:text-sm shadow-xl transition-all max-w-[90vw] ${
            statusType === "success"
              ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-100"
              : "bg-blue-500/15 border-blue-500/40 text-blue-100"
          }`}
        >
          {statusMessage}
        </div>
      )}
      <div className="max-w-6xl mx-auto px-2 sm:px-4 md:px-6">
        <div className="mb-6 sm:mb-8 md:mb-10 text-center">
          <p className="text-xs sm:text-sm text-gray-500 font-mono">
            ADMINISTRATIVE_CONTROL
          </p>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white font-mono mt-1 sm:mt-2">
            ADMIN_DASHBOARD
          </h1>
          <div className="flex flex-col items-center gap-2 sm:gap-3 mt-3 sm:mt-4 sm:flex-row sm:justify-center">
            <p className="text-gray-400 font-mono text-xs sm:text-sm text-center sm:text-left">
              SYSTEM_OVERVIEW_AND_ROLE_GOVERNANCE
            </p>
            <button
              onClick={fetchLatestRequests}
              disabled={isRefreshing}
              className="px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg border border-blue-500/50 text-blue-200 font-mono text-[10px] sm:text-xs hover:bg-blue-500/10 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isRefreshing ? "REFRESHING..." : "REFRESH_FEED"}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 md:gap-5 lg:gap-6 mb-6 sm:mb-8 md:mb-10">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <div
                key={stat.label}
                className="bg-gray-900/70 border border-gray-700 rounded-xl sm:rounded-2xl p-4 sm:p-5 md:p-6 shadow-xl"
              >
                <div
                  className={`w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl bg-gradient-to-br ${stat.gradient} flex items-center justify-center mb-3 sm:mb-4 border border-white/20`}
                >
                  <Icon className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                </div>
                <p className="text-xs sm:text-sm text-gray-500 font-mono">{stat.label}</p>
                <p className="text-2xl sm:text-3xl font-bold text-white font-mono">
                  {stat.value}
                </p>
              </div>
            );
          })}
        </div>

        {/* Users Management Section */}
        <div className="bg-gray-900/70 border border-gray-800 rounded-2xl p-6 shadow-2xl mb-6">
          <button
            onClick={() => setShowUsers(!showUsers)}
            className="w-full flex items-center justify-between p-4 hover:bg-gray-800/50 rounded-xl transition-all"
          >
            <div className="flex items-center gap-3">
              <Users className="w-6 h-6 text-blue-400" />
              <h2 className="text-2xl font-bold text-white font-mono">
                USERS_MANAGEMENT
              </h2>
            </div>
            {showUsers ? (
              <ChevronUp className="w-5 h-5 text-gray-400" />
            ) : (
              <ChevronDown className="w-5 h-5 text-gray-400" />
            )}
          </button>

          {showUsers && (
            <div className="mt-6 border-t border-gray-700 pt-6">
              {/* Search Bar */}
              <div className="mb-6">
                <div className="relative group">
                  <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-blue-400 transition-colors" />
                  <input
                    type="text"
                    placeholder="SEARCH_USER_BY_USERNAME_EMAIL_OR_NAME"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 bg-gradient-to-r from-gray-800/70 to-gray-800/50 border border-gray-700/80 rounded-lg text-white placeholder-gray-500 outline-none focus:border-blue-500/60 focus:bg-gray-800/90 focus:shadow-lg focus:shadow-blue-500/10 transition-all duration-300 font-mono text-sm backdrop-blur-sm"
                  />
                </div>
              </div>

              {loadingUsers ? (
                <div className="text-center py-10 text-gray-500 font-mono">
                  LOADING_USERS...
                </div>
              ) : (() => {
                // Filter users based on search query
                const filteredUsers = users.filter((user) => {
                  if (!searchQuery.trim()) return true;
                  const query = searchQuery.toLowerCase();
                  return (
                    user.username?.toLowerCase().includes(query) ||
                    user.email?.toLowerCase().includes(query) ||
                    user.full_name?.toLowerCase().includes(query)
                  );
                });

                return filteredUsers.length === 0 ? (
                  <div className="text-center py-10 text-gray-500 font-mono">
                    {searchQuery.trim() ? "NO_USERS_FOUND_MATCHING_SEARCH" : "NO_USERS_FOUND"}
                  </div>
                ) : (
                  <div className="space-y-4 max-h-[600px] overflow-y-auto custom-scrollbar pr-2">
                    {filteredUsers.map((user) => {
                    const userRoles = user.roles || [];
                    // Only SuperAdmin can manage roles (assign/remove)
                    const canManage = isSuperAdmin;
                    // Protected user (ID = 9) cannot be modified
                    const isProtectedUser = user.user_id === 9;
                    
                    return (
                      <div
                        key={user.user_id}
                        className="bg-gradient-to-br from-gray-800/70 to-gray-800/50 border border-gray-700/80 rounded-xl p-5 hover:border-blue-500/50 hover:shadow-lg hover:shadow-blue-500/10 transition-all duration-300 backdrop-blur-sm"
                      >
                        <div className="flex flex-col gap-4">
                          {/* User Header */}
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-3 flex-1">
                              <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center text-white font-bold font-mono border border-blue-500/30">
                                {user.username?.charAt(0)?.toUpperCase() || "U"}
                              </div>
                              <div className="flex-1">
                                <p className="text-white font-mono font-semibold text-lg">
                                  {user.full_name || user.username}
                                </p>
                                <p className="text-gray-400 text-xs font-mono">
                                  @{user.username}
                                </p>
                                <p className="text-gray-500 text-xs font-mono">
                                  {user.email}
                                </p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-xs text-gray-500 font-mono mb-1">
                                USER_ID
                              </p>
                              <p className="text-sm text-gray-400 font-mono">
                                #{user.user_id}
                              </p>
                            </div>
                          </div>

                          {/* Current Role */}
                          <div className="bg-gray-900/40 border border-gray-700 rounded-lg p-3">
                            <p className="text-xs text-gray-500 font-mono mb-2">
                              CURRENT_ROLE
                            </p>
                            {userRoles.length > 0 ? (
                              <span className="px-3 py-1.5 rounded-lg bg-blue-500/20 border border-blue-500/50 text-blue-300 font-mono text-sm font-semibold">
                                {userRoles[0].toUpperCase()}
                              </span>
                            ) : (
                              <span className="text-gray-500 font-mono text-xs">
                                NO_ROLE_ASSIGNED
                              </span>
                            )}
                          </div>

                          {/* Role Management */}
                          {canManage && (
                            <div className="bg-gray-900/40 border border-gray-700 rounded-lg p-4">
                              {isProtectedUser ? (
                                <div className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg border border-yellow-500/30 bg-yellow-500/5 text-yellow-400/70 font-mono text-xs">
                                  <Shield className="w-4 h-4" />
                                  PROTECTED_ACCOUNT_CANNOT_BE_MODIFIED
                                </div>
                              ) : (
                                <>
                                  <p className="text-xs text-gray-500 font-mono mb-3">
                                    ASSIGN_ROLE
                                  </p>
                                  
                                  {processingUserId === user.user_id ? (
                                    <div className="text-center py-3">
                                      <p className="text-xs text-gray-400 font-mono">
                                        PROCESSING...
                                      </p>
                                    </div>
                                  ) : (
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                      {availableRoles.map((role) => {
                                        const hasRole = userRoles.includes(role.name.toLowerCase());
                                        
                                        return (
                                          <button
                                            key={role.role_id}
                                            onClick={() => {
                                              handleAssignRole(user.user_id, role.name);
                                            }}
                                            disabled={processingUserId === user.user_id}
                                            className={`px-3 py-2 rounded-lg border font-mono text-xs font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                                              hasRole
                                                ? "bg-blue-500/20 border-blue-500/50 text-blue-300"
                                                : "bg-gray-800/50 border-gray-600 text-gray-300 hover:bg-gray-700/50 hover:border-gray-500"
                                            }`}
                                          >
                                            {role.name.toUpperCase()}
                                          </button>
                                        );
                                      })}
                                    </div>
                                  )}
                                  
                                  <p className="text-xs text-gray-500 font-mono mt-3 text-center italic mb-3">
                                    ASSIGNING_NEW_ROLE_WILL_REMOVE_CURRENT_ROLE
                                  </p>

                                  {/* Delete User Button */}
                                  <button
                                    onClick={() => setDeleteConfirmUserId(user.user_id)}
                                    disabled={processingUserId === user.user_id || deletingUserId === user.user_id}
                                    className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg border border-red-500/50 bg-red-500/10 text-red-400 font-mono text-xs font-semibold hover:bg-red-500/20 hover:border-red-500/70 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                    DELETE_USER
                                  </button>
                                </>
                              )}
                            </div>
                          )}

                          {/* User Status */}
                          <div className="flex items-center gap-4 text-xs font-mono">
                            <div>
                              <span className="text-gray-500">STATUS: </span>
                              <span
                                className={
                                  user.is_active
                                    ? "text-green-400"
                                    : "text-red-400"
                                }
                              >
                                {user.is_active ? "ACTIVE" : "INACTIVE"}
                              </span>
                            </div>
                            {user.last_login && (
                              <div>
                                <span className="text-gray-500">LAST_LOGIN: </span>
                                <span className="text-gray-400">
                                  {new Date(user.last_login).toLocaleDateString()}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  </div>
                );
              })()}
            </div>
          )}
        </div>

        <div className="bg-gray-900/70 border border-gray-800 rounded-2xl p-6 shadow-2xl">
          <div className="flex items-center gap-3 mb-6">
            <Activity className="w-5 h-5 text-green-400" />
            <h2 className="text-2xl font-bold text-white font-mono">
              ROLE_REQUEST_INTEL
            </h2>
          </div>

          {pendingRequests === 0 ? (
            <div className="text-center py-10 text-gray-500 font-mono">
              NO_ACTIVE_ROLE_REQUESTS
            </div>
          ) : (
            <div className="space-y-4">
              {requests
                .filter((r) => r.status === "pending" || !r.status)
                .map((request) => {
                  const requestId = request.request_id || request.id || request?.req_id;
                  let profileMeta = request.profile_meta;
                  if (profileMeta && typeof profileMeta === "string") {
                    try {
                      profileMeta = JSON.parse(profileMeta);
                    } catch (e) {
                      profileMeta = {};
                    }
                  }
                  profileMeta = profileMeta || {};
                  return (
                  <div
                    key={requestId}
                    className="bg-gray-800/60 border border-gray-700 rounded-xl p-6 hover:border-blue-500/50 transition-all"
                  >
                    <div className="flex flex-col gap-4">
                      {/* Header with User Info */}
                      <div className="flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-start border-b border-gray-700 pb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center text-white font-bold font-mono border border-blue-500/30">
                              {request.username?.charAt(0)?.toUpperCase() || "U"}
                            </div>
                            <div>
                              <p className="text-white font-mono font-semibold text-lg">
                                {request.full_name || request.username}
                              </p>
                              <p className="text-gray-400 text-xs font-mono">
                                @{request.username}
                              </p>
                              <p className="text-gray-500 text-xs font-mono">
                                {request.email}
                              </p>
                            </div>
                          </div>
                        </div>
                        <div className="text-left sm:text-right">
                          <p className="text-xs text-gray-500 font-mono mb-1">REQUEST_ID</p>
                          <p className="text-sm text-gray-400 font-mono">#{requestId}</p>
                          <p className="text-xs text-gray-500 font-mono mt-2">
                            {new Date(request.created_at).toLocaleDateString("en-US", {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </p>
                        </div>
                      </div>

                      {/* Requested Role */}
                      <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
                        <p className="text-xs text-blue-400 font-mono mb-1">REQUESTED_ROLE</p>
                        <p className="text-lg font-bold text-blue-300 font-mono">
                          {(request.requested_role || request.role)?.toUpperCase()}
                        </p>
                      </div>

                      <div className="grid sm:grid-cols-3 gap-3">
                        <div className="bg-gray-900/40 border border-gray-700 rounded-lg p-3">
                          <p className="text-xs text-gray-500 font-mono">CURRENT_RANK</p>
                          <p className="text-sm text-white font-mono">
                            {profileMeta.rank || "UNKNOWN"}
                          </p>
                        </div>
                        <div className="bg-gray-900/40 border border-gray-700 rounded-lg p-3">
                          <p className="text-xs text-gray-500 font-mono">SPECIALIZATION</p>
                          <p className="text-sm text-white font-mono">
                            {profileMeta.specialization || "N/A"}
                          </p>
                        </div>
                        <div className="bg-gray-900/40 border border-gray-700 rounded-lg p-3">
                          <p className="text-xs text-gray-500 font-mono">JOINED_AT</p>
                          <p className="text-sm text-white font-mono">
                            {profileMeta.join_date
                              ? new Date(profileMeta.join_date).toLocaleDateString()
                              : "N/A"}
                          </p>
                        </div>
                      </div>

                      {/* Comment Section */}
                      {request.comment ? (
                        <div className="bg-gray-900/50 border border-gray-600 rounded-lg p-4">
                          <div className="flex items-center gap-2 mb-2">
                            <p className="text-xs text-gray-400 font-mono font-semibold">COMMENT:</p>
                          </div>
                          <p className="text-sm text-gray-300 font-mono break-words leading-relaxed whitespace-pre-wrap">
                            {request.comment}
                          </p>
                        </div>
                      ) : (
                        <div className="bg-gray-900/30 border border-gray-700 rounded-lg p-3">
                          <p className="text-xs text-gray-500 font-mono italic">NO_COMMENT_PROVIDED</p>
                        </div>
                      )}

                      {/* Action Buttons */}
                      <div className="flex gap-3 justify-end pt-2 border-t border-gray-700">
                        <button
                          onClick={() => handleReject(requestId)}
                          disabled={processingId === requestId}
                          className="px-6 py-2.5 rounded-lg bg-red-500/20 text-red-400 border border-red-500/50 font-mono text-sm hover:bg-red-500/30 hover:border-red-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
                        >
                          {processingId === requestId ? "PROCESSING..." : "REJECT"}
                        </button>
                        <button
                          onClick={() => handleApprove(requestId, request.user_id)}
                          disabled={processingId === requestId}
                          className="px-6 py-2.5 rounded-lg bg-green-500/20 text-green-400 border border-green-500/50 font-mono text-sm hover:bg-green-500/30 hover:border-green-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
                        >
                          {processingId === requestId ? "PROCESSING..." : "APPROVE"}
                        </button>
                      </div>
                    </div>
                  </div>
                  );
                })}
            </div>
          )}
        </div>
      </div>

      {/* Delete User Confirmation Modal */}
      {deleteConfirmUserId && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-gray-900 border-2 border-red-500/40 rounded-xl p-6 max-w-md w-full shadow-2xl">
            <div className="mb-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="relative w-12 h-12 rounded-full bg-gradient-to-br from-red-500/30 to-red-600/20 flex items-center justify-center border-2 border-red-500/40">
                  <AlertTriangle className="w-6 h-6 text-red-400" />
                  <div className="absolute inset-0 rounded-full bg-red-400/20 animate-ping"></div>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-red-400 font-mono">
                    DELETE_USER
                  </h3>
                  <p className="text-xs text-red-400/70 font-mono mt-0.5">
                    DESTRUCTIVE_ACTION
                  </p>
                </div>
              </div>
              
              {(() => {
                const userToDelete = users.find(u => u.user_id === deleteConfirmUserId);
                return userToDelete ? (
                  <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 mb-3">
                    <p className="text-sm text-red-200 font-mono leading-relaxed">
                      ⚠️ Are you sure you want to delete user <strong className="text-red-300">{userToDelete.username}</strong>?
                    </p>
                    <p className="text-xs text-red-200/70 font-mono mt-2">
                      This action cannot be undone. All user data will be permanently deleted.
                    </p>
                  </div>
                ) : null;
              })()}
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setDeleteConfirmUserId(null)}
                disabled={deletingUserId !== null}
                className="flex-1 bg-gray-700/80 hover:bg-gray-700 text-white py-3 rounded-lg font-mono text-sm font-semibold transition-all duration-200 border border-gray-600/50 hover:border-gray-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                CANCEL
              </button>
              <button
                onClick={() => handleDeleteUser(deleteConfirmUserId)}
                disabled={deletingUserId !== null}
                className="relative flex-1 group bg-gradient-to-r from-red-600 via-red-700 to-red-800 hover:from-red-700 hover:via-red-800 hover:to-red-900 text-white py-3 rounded-lg font-mono text-sm font-bold transition-all duration-300 shadow-lg hover:shadow-red-500/40 border-2 border-red-500/50 hover:border-red-400/70 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
                {deletingUserId === deleteConfirmUserId ? (
                  <>
                    <div className="relative w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span className="relative">DELETING...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="relative w-4 h-4 group-hover:scale-110 transition-transform" />
                    <span className="relative">DELETE_USER</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboardPage;

