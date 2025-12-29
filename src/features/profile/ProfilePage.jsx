import React, { useState } from "react";
import { ShieldCheck, KeyRound, Award, Users, Trash2, Eye, EyeOff, AlertTriangle } from "lucide-react";

const ProfilePage = ({
  currentUser,
  onRequestRole,
  onChangePassword,
  onDeleteAccount,
  roleRequestStatus,
  roleRequestMessage,
  roleRequestLoading = false,
  isAdmin,
  isInstructor,
  roleRequestAlert,
}) => {
  const profile = currentUser?.profile_meta || {};
  const userRoles = currentUser?.roles || [];
  const isSuperAdmin = userRoles.includes('superadmin');
  const canRequestRole = !isAdmin && !isInstructor && !isSuperAdmin;
  const [desiredRole, setDesiredRole] = useState("admin");
  const [comment, setComment] = useState("");
  const [showCommentModal, setShowCommentModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [showDeletePassword, setShowDeletePassword] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const getStatusBadge = (status) => {
    if (!status) return null;
    const colors = {
      pending: "text-yellow-400 bg-yellow-400/10 border-yellow-400/30",
      approved: "text-green-400 bg-green-400/10 border-green-400/30",
      rejected: "text-red-400 bg-red-400/10 border-red-400/30",
    };
    return (
      <span
        className={`inline-flex px-3 py-1 rounded-full text-xs font-mono border ${
          colors[status] || "text-blue-400 bg-blue-400/10 border-blue-400/30"
        }`}
      >
        ROLE_REQUEST_{status.toUpperCase()}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black pt-24 pb-12 px-4">
      {roleRequestMessage && (
        <div
          className={`fixed top-24 left-1/2 -translate-x-1/2 md:left-auto md:right-6 md:translate-x-0 z-50 px-5 py-3 rounded-xl border shadow-lg font-mono text-sm transition-all duration-300 ${
            roleRequestAlert === "error"
              ? "bg-red-500/15 border-red-500/40 text-red-200"
              : "bg-emerald-500/15 border-emerald-500/40 text-emerald-100"
          }`}
        >
          {roleRequestMessage}
        </div>
      )}
      <div className="max-w-5xl mx-auto px-4 sm:px-6">
        <div className="bg-gray-900/70 border border-green-500/20 rounded-2xl p-6 sm:p-8 shadow-2xl backdrop-blur">
          <div className="flex flex-col lg:flex-row gap-8 items-center">
            <div className="flex-shrink-0">
              <div className="w-32 h-32 rounded-2xl bg-gradient-to-br from-green-600 to-green-700 flex items-center justify-center text-5xl border border-green-500/30 font-mono">
                {currentUser?.username?.charAt(0)?.toUpperCase() || "O"}
              </div>
            </div>
            <div className="flex-1 space-y-2 text-center lg:text-left">
              <p className="text-sm text-gray-500 font-mono">
                OPERATIVE_IDENTIFIER
              </p>
              <h1 className="text-4xl font-bold text-white font-mono">
                {currentUser?.full_name || currentUser?.username || "Operative"}
              </h1>
              <div className="flex flex-wrap gap-3 justify-center lg:justify-start">
                {isSuperAdmin ? (
                  <span className="px-4 py-1 rounded-full bg-yellow-500/20 text-yellow-300 border-2 border-yellow-500/50 font-mono text-sm font-bold">
                    SUPERADMIN
                  </span>
                ) : (
                  <span className="px-4 py-1 rounded-full bg-green-500/10 text-green-400 border border-green-500/30 font-mono text-sm">
                    RANK_{profile.rank || "OPERATIVE"}
                  </span>
                )}
                <span className="px-4 py-1 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/30 font-mono text-sm">
                  SPECIALIZATION_{profile.specialization || "GENERAL"}
                </span>
                {getStatusBadge(roleRequestStatus)}
              </div>
            </div>
            <div className="text-center">
              <p className="text-xs text-gray-500 font-mono">TOTAL_POINTS</p>
              <p className="text-3xl font-bold text-green-400 font-mono">
                {currentUser?.total_points || 0}
              </p>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6 mt-10">
            <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <ShieldCheck className="w-5 h-5 text-green-400" />
                <h2 className="text-lg font-semibold text-white font-mono">
                  SECURITY_STATUS
                </h2>
              </div>
              <div className="space-y-3 text-gray-300 font-mono text-sm">
                <div className="flex justify-between">
                  <span>USERNAME</span>
                  <span className="text-white">{currentUser?.username}</span>
                </div>
                <div className="flex justify-between">
                  <span>EMAIL</span>
                  <span className="text-white">{currentUser?.email}</span>
                </div>
                <div className="flex justify-between">
                  <span>JOIN_DATE</span>
                  <span className="text-white">
                    {profile.join_date
                      ? new Date(profile.join_date).toLocaleDateString()
                      : "N/A"}
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <Award className="w-5 h-5 text-blue-400" />
                <h2 className="text-lg font-semibold text-white font-mono">
                  ACCESS_CONTROLS
                </h2>
              </div>
              <div className="space-y-4">
                {canRequestRole && (
                  <>
                    <button
                      onClick={() => setShowCommentModal(true)}
                      disabled={roleRequestLoading || roleRequestStatus === "pending"}
                      className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 rounded-lg font-semibold border border-blue-500/40 hover:shadow-blue-500/20 transition-all duration-300 font-mono disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Users className="w-4 h-4" />
                      {roleRequestLoading ? "PROCESSING..." : `REQUEST_${desiredRole.toUpperCase()}_ROLE`}
                    </button>
                    {showCommentModal && (
                      <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
                        <div className="bg-gray-900 border border-blue-500/30 rounded-xl p-6 max-w-md w-full shadow-2xl">
                          <div className="mb-4">
                            <h3 className="text-xl font-bold text-blue-400 mb-2 font-mono">
                              REQUEST_{desiredRole.toUpperCase()}_ROLE
                            </h3>
                            <p className="text-sm text-gray-400 font-mono">
                              Add a comment explaining why you need this role (optional)
                            </p>
                          </div>
                          <textarea
                            value={comment}
                            onChange={(e) => setComment(e.target.value)}
                            placeholder="Add a comment or explain why you need this role..."
                            className="w-full bg-gray-800 border border-gray-600 rounded-lg px-4 py-3 text-white text-sm placeholder-gray-500 focus:border-blue-500 focus:outline-none resize-none font-mono"
                            rows="5"
                          />
                          <div className="flex gap-3 mt-4">
                            <button
                              onClick={() => {
                                setComment("");
                                setShowCommentModal(false);
                              }}
                              className="flex-1 bg-gray-700 hover:bg-gray-800 text-white py-2.5 rounded-lg font-mono text-sm transition-all"
                            >
                              CANCEL
                            </button>
                            <button
                              onClick={() => {
                                onRequestRole(desiredRole, comment);
                                setComment("");
                                setShowCommentModal(false);
                              }}
                              className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white py-2.5 rounded-lg font-mono text-sm font-semibold transition-all shadow-lg"
                            >
                              SUBMIT_REQUEST
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                )}
                {canRequestRole && (
                  <div className="flex gap-3 text-xs font-mono text-gray-400 justify-center">
                    {["admin", "instructor"].map((role) => (
                      <button
                        key={role}
                        type="button"
                        onClick={() => setDesiredRole(role)}
                        className={`px-3 py-1 rounded border ${
                          desiredRole === role
                            ? "border-blue-500/60 text-blue-300 bg-blue-500/10"
                            : "border-gray-600 text-gray-400 hover:text-white"
                        }`}
                      >
                        {role.toUpperCase()}
                      </button>
                    ))}
                  </div>
                )}
                {roleRequestMessage && (
                  <div
                    className={`text-xs font-mono text-center px-3 py-2 rounded-lg border ${
                      roleRequestAlert === "error"
                        ? "text-red-200 bg-red-500/10 border-red-500/30"
                        : "text-green-200 bg-green-500/10 border-green-500/30"
                    }`}
                  >
                    {roleRequestMessage}
                  </div>
                )}
                <button
                  onClick={onChangePassword}
                  className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-gray-700 to-gray-800 text-white py-3 rounded-lg font-semibold border border-gray-600 hover:shadow-lg transition-all duration-300 font-mono"
                >
                  <KeyRound className="w-4 h-4" />
                  CHANGE_PASSWORD
                </button>
                
                {/* Delete Account Button - Only show if not protected user (ID 9) */}
                {currentUser?.user_id !== 9 && (
                  <div className="relative mt-2">
                    <div className="absolute inset-0 bg-red-500/20 blur-xl rounded-lg opacity-50 group-hover:opacity-75 transition-opacity duration-300"></div>
                    <button
                      onClick={() => setShowDeleteModal(true)}
                      className="relative w-full group flex items-center justify-center gap-2 bg-gradient-to-r from-red-600 via-red-700 to-red-800 text-white py-3 rounded-lg font-semibold border-2 border-red-500/50 hover:border-red-400/70 shadow-lg hover:shadow-red-500/40 hover:shadow-2xl transform hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 font-mono overflow-hidden"
                    >
                      {/* Animated background effect */}
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
                      
                      {/* Icon with animation */}
                      <Trash2 className="relative w-4 h-4 group-hover:rotate-12 group-hover:scale-110 transition-transform duration-300" />
                      
                      {/* Text */}
                      <span className="relative text-sm">DELETE_ACCOUNT</span>
                      
                      {/* Warning pulse effect */}
                      <div className="absolute top-1 right-1 w-2 h-2 bg-red-300 rounded-full animate-pulse"></div>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Account Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-gray-900/95 backdrop-blur-xl border-2 border-red-500/40 rounded-xl p-6 max-w-md w-full shadow-2xl shadow-red-500/20 animate-in zoom-in-95 duration-200">
            {/* Glow effect behind modal */}
            <div className="absolute inset-0 bg-red-500/5 blur-2xl rounded-xl -z-10"></div>
            
            <div className="mb-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="relative w-12 h-12 rounded-full bg-gradient-to-br from-red-500/30 to-red-600/20 flex items-center justify-center border-2 border-red-500/40">
                  <AlertTriangle className="w-6 h-6 text-red-400 animate-pulse" />
                  <div className="absolute inset-0 rounded-full bg-red-400/20 animate-ping"></div>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-red-400 font-mono">
                    DELETE_ACCOUNT
                  </h3>
                  <p className="text-xs text-red-400/70 font-mono mt-0.5">
                    DESTRUCTIVE_ACTION
                  </p>
                </div>
              </div>
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 mb-3">
                <p className="text-sm text-red-200 font-mono leading-relaxed">
                  ⚠️ This action cannot be undone. All your data will be permanently deleted from the system.
                </p>
              </div>
              <p className="text-xs text-gray-400 font-mono">
                Enter your password below to confirm account deletion.
              </p>
            </div>
            
            <div className="space-y-4">
              <div className="relative">
                <label className="block text-xs font-semibold text-gray-400 mb-2 font-mono">
                  [PASSWORD_CONFIRMATION]
                </label>
                <div className="relative group">
                  <input
                    type={showDeletePassword ? "text" : "password"}
                    value={deletePassword}
                    onChange={(e) => setDeletePassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-gray-800/50 border-2 border-gray-600/50 rounded-lg px-4 py-3 pr-10 text-white text-sm placeholder-gray-500 focus:border-red-500 focus:bg-gray-800 focus:ring-2 focus:ring-red-500/20 focus:outline-none transition-all font-mono disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={isDeleting}
                  />
                  <button
                    type="button"
                    onClick={() => setShowDeletePassword(!showDeletePassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-red-400 transition-colors"
                    disabled={isDeleting}
                  >
                    {showDeletePassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeletePassword("");
                  setShowDeletePassword(false);
                }}
                disabled={isDeleting}
                className="flex-1 bg-gray-700/80 hover:bg-gray-700 text-white py-3 rounded-lg font-mono text-sm font-semibold transition-all duration-200 border border-gray-600/50 hover:border-gray-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                CANCEL
              </button>
              <button
                onClick={async () => {
                  if (!deletePassword) {
                    alert("⚠️ Please enter your password");
                    return;
                  }

                  setIsDeleting(true);
                  const success = await onDeleteAccount(deletePassword);
                  if (success) {
                    setShowDeleteModal(false);
                    setDeletePassword("");
                  } else {
                    setIsDeleting(false);
                  }
                }}
                disabled={isDeleting || !deletePassword}
                className="relative flex-1 group bg-gradient-to-r from-red-600 via-red-700 to-red-800 hover:from-red-700 hover:via-red-800 hover:to-red-900 text-white py-3 rounded-lg font-mono text-sm font-bold transition-all duration-300 shadow-lg hover:shadow-red-500/40 border-2 border-red-500/50 hover:border-red-400/70 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 overflow-hidden"
              >
                {/* Shimmer effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
                
                {isDeleting ? (
                  <>
                    <div className="relative w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span className="relative">DELETING...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="relative w-4 h-4 group-hover:scale-110 transition-transform" />
                    <span className="relative">DELETE_ACCOUNT</span>
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

export default ProfilePage;

