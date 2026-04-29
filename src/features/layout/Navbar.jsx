import React, { useState, useRef, useEffect } from "react";
import { Terminal, Cpu, Code, Users, Star, Shield, Menu, X, Bell, Activity, AlertTriangle, LayoutDashboard, LogOut, User, Mail } from "lucide-react";
import { navItems } from "../../data/navigationData";
import { useNotifications } from "../../hooks/useNotifications";
import ContactUsModal from "@/features/shared/ui/ContactUsModal";

const Navbar = ({ setCurrentPage, onLogout, currentPage, currentUser, isAdmin, isSuperAdmin }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [contactModalOpen, setContactModalOpen] = useState(false);
  const accountMenuRef = useRef(null);
  const accountDropdownRef = useRef(null);

  useEffect(() => {
    if (!accountMenuOpen) return;
    const close = (e) => {
      if (accountMenuRef.current && !accountMenuRef.current.contains(e.target)) {
        setAccountMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [accountMenuOpen]);

  useEffect(() => {
    if (!accountMenuOpen) return;
    const id = requestAnimationFrame(() => {
      accountDropdownRef.current?.focus({ preventScroll: true });
    });
    return () => cancelAnimationFrame(id);
  }, [accountMenuOpen]);

  useEffect(() => {
    if (!accountMenuOpen) return undefined;
    const onKey = (e) => {
      if (e.key === "Escape") setAccountMenuOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [accountMenuOpen]);
  const userId = currentUser?.user_id || currentUser?.id;
  // Only load unread count for the badge, not full notifications
  const { unreadCount } = useNotifications(userId, { autoLoad: true, loadUnreadCountOnly: true });

  const getIcon = (iconName) => {
    const icons = {
      Terminal: Terminal,
      Cpu: Cpu,
      Code: Code,
      Users: Users
    };
    return icons[iconName] || Terminal;
  };

  const getUserPoints = () => {
    return currentUser?.total_points || 0;
  };

  const getUserName = () => {
    return currentUser?.username || 'OPERATIVE';
  };

  const handleProfileNavigate = () => {
    setCurrentPage('profile');
    setIsMenuOpen(false);
    setAccountMenuOpen(false);
  };

  const handleNavSelection = (page) => {
    setCurrentPage(page);
    setIsMenuOpen(false);
    setAccountMenuOpen(false);
  };

  const toggleAccountMenu = () => {
    setAccountMenuOpen((o) => !o);
    setIsMenuOpen(false);
  };

  const accountMenuBtn =
    'w-full flex items-center gap-2 px-3 py-2.5 text-left font-mono text-sm rounded-lg border border-transparent hover:bg-gray-800/70 hover:border-gray-600 transition-colors';

  const navItemButtonClass = (page, variant) => {
    const active =
      currentPage === page
        ? 'bg-gradient-to-r from-green-600 to-green-700 text-white shadow-lg border-green-500/30'
        : 'text-gray-400 hover:text-white hover:bg-gray-800/50 border-gray-600';
    if (variant === 'stack') {
      return `flex w-full items-center gap-2 px-3 py-2.5 rounded-lg border font-medium font-mono transition-all duration-200 ${active}`;
    }
    /* centered desktop: compact intrinsic width like before */
    return `flex shrink-0 items-center gap-1 rounded-lg border px-1 py-1.5 font-medium font-mono transition-all duration-200 md:gap-1.5 lg:gap-1.5 lg:px-1.5 lg:py-2 xl:px-2.5 xl:py-2 ${active}`;
  };

  const renderNavItems = (variant) =>
    navItems.map((item) => {
      const IconComponent = getIcon(item.icon);
      const isStack = variant === 'stack';
      return (
        <button
          key={item.page}
          type="button"
          title={item.label}
          onClick={() => handleNavSelection(item.page)}
          className={navItemButtonClass(item.page, variant)}
        >
          <IconComponent
            className={`flex-shrink-0 ${isStack ? 'h-4 w-4' : 'h-3.5 w-3.5 lg:h-4 lg:w-4'}`}
          />
          <span
            className={`font-mono ${
              isStack
                ? 'whitespace-nowrap text-sm'
                : 'whitespace-nowrap text-[10px] md:text-[11px] lg:text-xs xl:text-sm'
            }`}
          >
            {item.label}
          </span>
        </button>
      );
    });

  return (
    <>
    {/* Dims page behind navbar so account menu reads clearly */}
    {accountMenuOpen && (
      <button
        type="button"
        aria-label="Dismiss menu overlay"
        className="fixed inset-0 z-40 bg-black/50 backdrop-blur-[3px]"
        tabIndex={-1}
        onClick={() => setAccountMenuOpen(false)}
      />
    )}
    <nav className="fixed top-0 left-0 right-0 z-50 bg-gray-900/95 backdrop-blur-lg border-b border-gray-700">
      <div className="max-w-7xl mx-auto px-2 sm:px-3">
        <div className="flex items-center h-16 gap-2 lg:gap-3 xl:gap-4 min-w-0">
          {/* Logo */}
          <button
            onClick={() => setCurrentPage('home')}
            className="flex items-center gap-1.5 lg:gap-2 text-white hover:text-green-400 transition-colors duration-200 group flex-shrink-0 mr-1 lg:mr-2"
          >
            <div className="p-1.5 lg:p-2 bg-gradient-to-br from-green-600 to-green-700 rounded-lg group-hover:scale-110 transition-transform duration-200 border border-green-500/30">
              <Terminal className="w-4 h-4 lg:w-5 lg:h-5 text-white" />
            </div>
            <span className="text-base lg:text-lg xl:text-xl font-bold text-green-400 font-mono tracking-tight hidden sm:inline">
              HACK_ME
            </span>
          </button>

          {/* Navigation — desktop: compact group centered in remaining bar space */}
          <div className="hidden min-w-0 flex-1 lg:flex lg:items-center lg:justify-center overflow-hidden px-1">
            <div className="flex max-w-full shrink-0 items-center gap-1 md:gap-1.5 xl:gap-2 overflow-x-auto scrollbar-none">
              {renderNavItems('centered')}
            </div>
          </div>

          {/* Right side controls */}
          <div className="flex flex-shrink-0 items-center gap-1.5 lg:gap-2">
            {/* Points always visible next to star */}
            <div
              className="flex h-9 max-w-[5.5rem] sm:max-w-none items-center gap-1 rounded-lg border border-gray-600 bg-gray-800/50 px-1.5 sm:px-2 text-green-400 lg:h-10"
              title="Your points"
            >
              <Star className="h-4 w-4 flex-shrink-0 lg:h-5 lg:w-5" />
              <span className="truncate font-mono text-[10px] font-semibold tabular-nums text-green-300 sm:text-xs">
                {getUserPoints()}_PTS
              </span>
            </div>

            {/* Notifications button */}
            <button
              onClick={() => setCurrentPage('notifications')}
              className="relative flex items-center justify-center w-9 h-9 lg:w-10 lg:h-10 border border-gray-600 rounded-lg text-gray-300 hover:text-white hover:border-green-500/50 transition-all duration-200"
            >
              <Bell className="w-4 h-4 lg:w-5 lg:h-5" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center border-2 border-gray-900">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            {/* Account: 3-line menu → profile / admin / logout */}
            <div className="relative" ref={accountMenuRef}>
              <button
                type="button"
                onClick={toggleAccountMenu}
                aria-expanded={accountMenuOpen}
                aria-haspopup="menu"
                title={accountMenuOpen ? "Close menu" : "Account menu"}
                className="inline-flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 border border-gray-600 rounded-lg text-gray-300 hover:text-white hover:border-green-500/50 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500/50"
              >
                {accountMenuOpen ? (
                  <X className="w-4 h-4 sm:w-5 sm:h-5" />
                ) : (
                  <Menu className="w-4 h-4 sm:w-5 sm:h-5" />
                )}
              </button>

              {accountMenuOpen && (
                <div
                  ref={accountDropdownRef}
                  role="menu"
                  tabIndex={-1}
                  className="absolute right-0 top-full mt-1.5 w-[min(calc(100vw-1rem),17rem)] rounded-xl border border-green-500/25 bg-gray-950/98 py-2 shadow-[0_12px_40px_rgba(0,0,0,0.75)] backdrop-blur-lg z-[60] outline-none ring-2 ring-green-500/35 ring-offset-2 ring-offset-gray-950 focus-visible:ring-green-400/55"
                >
                  <div className="px-3 pb-2 border-b border-gray-800">
                    <p className="font-mono text-[10px] uppercase tracking-wider text-gray-500">Signed in</p>
                    <p className="truncate font-mono text-sm text-white">{getUserName()}</p>
                  </div>
                  <div className="px-1.5 pt-2 pb-1">
                    <button type="button" role="menuitem" onClick={handleProfileNavigate} className={`${accountMenuBtn} text-gray-200`}>
                      <User className="w-4 h-4 shrink-0 text-green-400" />
                      <span className="truncate">PROFILE</span>
                    </button>

                    {/* Contact: regular operatives only (not admin/superadmin) */}
                    {!isAdmin && !isSuperAdmin && (
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => {
                          setAccountMenuOpen(false);
                          setContactModalOpen(true);
                        }}
                        className={`${accountMenuBtn} text-gray-300 hover:text-green-400`}
                      >
                        <Mail className="w-4 h-4 shrink-0 text-cyan-400" />
                        <span className="truncate">CONTACT_US</span>
                      </button>
                    )}

                    {isAdmin && (
                      <>
                        <div className="my-2 mx-2 border-t border-gray-700" />
                        <button
                          type="button"
                          role="menuitem"
                          onClick={() => handleNavSelection("admin")}
                          className={`${accountMenuBtn} ${
                            currentPage === "admin"
                              ? "bg-purple-600/25 text-purple-200 border-purple-500/40"
                              : "text-gray-300"
                          }`}
                        >
                          <Shield className="w-4 h-4 shrink-0 text-purple-400" />
                          <span>ADMIN</span>
                        </button>
                        {isSuperAdmin && (
                          <>
                            <button
                              type="button"
                              role="menuitem"
                              onClick={() => handleNavSelection("audit-logs")}
                              className={`${accountMenuBtn} ${
                                currentPage === "audit-logs"
                                  ? "bg-cyan-600/25 text-cyan-200 border-cyan-500/40"
                                  : "text-gray-300"
                              }`}
                            >
                              <Activity className="w-4 h-4 shrink-0 text-cyan-400" />
                              <span>AUDIT</span>
                            </button>
                            <button
                              type="button"
                              role="menuitem"
                              onClick={() => handleNavSelection("attempt-logs")}
                              className={`${accountMenuBtn} ${
                                currentPage === "attempt-logs"
                                  ? "bg-amber-600/25 text-amber-200 border-amber-500/40"
                                  : "text-gray-300"
                              }`}
                            >
                              <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400" />
                              <span>ATTEMPT</span>
                            </button>
                            <button
                              type="button"
                              role="menuitem"
                              title="Security dashboard"
                              onClick={() => handleNavSelection("security-dashboard")}
                              className={`${accountMenuBtn} ${
                                currentPage === "security-dashboard"
                                  ? "bg-violet-600/25 text-violet-200 border-violet-500/40"
                                  : "text-gray-300"
                              }`}
                            >
                              <LayoutDashboard className="w-4 h-4 shrink-0 text-violet-400" />
                              <span className="leading-tight">SECURITY</span>
                            </button>
                          </>
                        )}
                      </>
                    )}

                    <div className="my-2 mx-2 border-t border-gray-700" />

                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setAccountMenuOpen(false);
                        onLogout();
                      }}
                      className={`${accountMenuBtn} text-red-400 hover:bg-red-600/15 hover:border-red-500/30`}
                    >
                      <LogOut className="w-4 h-4 shrink-0" />
                      <span>LOGOUT</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Mobile nav menu — separate from account menu */}
            <button
              type="button"
              className="lg:hidden inline-flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 border border-gray-600 rounded-lg text-gray-300 hover:text-white hover:border-green-500/50 transition"
              onClick={() => {
                setIsMenuOpen((prev) => !prev);
                setAccountMenuOpen(false);
              }}
            >
              {isMenuOpen ? <X className="w-4 h-4 sm:w-5 sm:h-5" /> : <Menu className="w-4 h-4 sm:w-5 sm:h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile/Tablet dropdown menu - hidden on 1024px and up */}
        {isMenuOpen && (
          <div className="lg:hidden mt-2 pb-4 border-t border-gray-800">
            <div className="flex flex-col gap-3 pt-4">
              {renderNavItems("stack")}
            </div>
          </div>
        )}
      </div>
    </nav>
    <ContactUsModal open={contactModalOpen} onClose={() => setContactModalOpen(false)} />
    </>
  );
};

export default Navbar;
