import React, { useState } from "react";
import { Terminal, Cpu, Code, Users, Star, Shield, Menu, X, Bell, Activity, AlertTriangle } from "lucide-react";
import { navItems } from "../../data/navigationData";
import { useNotifications } from "../../hooks/useNotifications";

const Navbar = ({ setCurrentPage, onLogout, currentPage, currentUser, isAdmin, isSuperAdmin }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showPoints, setShowPoints] = useState(false);
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

  const getUserInitial = () => {
    return currentUser?.username?.charAt(0)?.toUpperCase() || 'O';
  };

  const getUserName = () => {
    return currentUser?.username || 'OPERATIVE';
  };

  const handleProfileNavigate = () => {
    setCurrentPage('profile');
    setIsMenuOpen(false);
  };

  const handleNavSelection = (page) => {
    setCurrentPage(page);
    setIsMenuOpen(false);
  };

  const navigationButtons = (
    <>
      {navItems.map((item) => {
        const IconComponent = getIcon(item.icon);
        return (
          <button
            key={item.page}
            onClick={() => handleNavSelection(item.page)}
            className={`flex items-center gap-1 lg:gap-1.5 px-1.5 lg:px-2 xl:px-3 py-1.5 lg:py-2 rounded-lg font-medium transition-all duration-200 border font-mono ${
              currentPage === item.page
                ? 'bg-gradient-to-r from-green-600 to-green-700 text-white shadow-lg border-green-500/30'
                : 'text-gray-400 hover:text-white hover:bg-gray-800/50 border-gray-600'
            }`}
          >
            <IconComponent className="w-3.5 h-3.5 lg:w-4 lg:h-4 flex-shrink-0" />
            <span className="text-[11px] lg:text-xs xl:text-sm whitespace-nowrap">{item.label}</span>
          </button>
        );
      })}
      {isAdmin && (
        <button
          onClick={() => handleNavSelection('admin')}
          className={`flex items-center gap-1 lg:gap-1.5 px-1.5 lg:px-2 xl:px-3 py-1.5 lg:py-2 rounded-lg font-medium transition-all duration-200 border font-mono ${
            currentPage === 'admin'
              ? 'bg-gradient-to-r from-purple-600 to-purple-700 text-white shadow-lg border-purple-500/30'
              : 'text-gray-400 hover:text-white hover:bg-gray-800/50 border-gray-600'
          }`}
        >
          <Shield className="w-3.5 h-3.5 lg:w-4 lg:h-4 flex-shrink-0" />
          <span className="text-[11px] lg:text-xs xl:text-sm whitespace-nowrap">ADMIN</span>
        </button>
      )}
      {isSuperAdmin && (
        <button
          onClick={() => handleNavSelection('audit-logs')}
          className={`flex items-center gap-1 lg:gap-1.5 px-1.5 lg:px-2 xl:px-2.5 py-1.5 lg:py-2 rounded-lg font-medium transition-all duration-200 border font-mono ${
            currentPage === 'audit-logs'
              ? 'bg-gradient-to-r from-cyan-600 to-cyan-700 text-white shadow-lg border-cyan-500/30'
              : 'text-gray-400 hover:text-white hover:bg-gray-800/50 border-gray-600'
          }`}
        >
          <Activity className="w-3.5 h-3.5 lg:w-4 lg:h-4 flex-shrink-0" />
          <span className="text-[11px] lg:text-xs xl:text-sm whitespace-nowrap">AUDIT</span>
        </button>
      )}
      {isSuperAdmin && (
        <button
          onClick={() => handleNavSelection('attempt-logs')}
          className={`flex items-center gap-1 lg:gap-1.5 px-1.5 lg:px-2 xl:px-2.5 py-1.5 lg:py-2 rounded-lg font-medium transition-all duration-200 border font-mono ${
            currentPage === 'attempt-logs'
              ? 'bg-gradient-to-r from-amber-600 to-amber-700 text-white shadow-lg border-amber-500/30'
              : 'text-gray-400 hover:text-white hover:bg-gray-800/50 border-gray-600'
          }`}
        >
          <AlertTriangle className="w-3.5 h-3.5 lg:w-4 lg:h-4 flex-shrink-0" />
          <span className="text-[11px] lg:text-xs xl:text-sm whitespace-nowrap">ATTEMPT</span>
        </button>
      )}
    </>
  );

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-gray-900/95 backdrop-blur-lg border-b border-gray-700">
      <div className="max-w-7xl mx-auto px-2 sm:px-3">
        <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center h-16 gap-2 lg:gap-3 xl:gap-4">
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

          {/* Navigation buttons - Desktop from 1024px */}
          <div className="hidden lg:flex min-w-0 pl-1 pr-2 overflow-hidden">
            <div className="flex items-center gap-1 lg:gap-1.5 xl:gap-2 min-w-max max-w-full mr-auto overflow-x-auto scrollbar-none whitespace-nowrap">
              {navigationButtons}
            </div>
          </div>

          {/* Right side controls */}
          <div className="flex items-center gap-1.5 lg:gap-2 flex-shrink-0">
            {/* Points toggle - same original position */}
            <div className="hidden lg:flex relative">
              <button
                onClick={() => setShowPoints((v) => !v)}
                className="flex items-center justify-center w-9 h-9 lg:w-10 lg:h-10 bg-gray-800/50 rounded-lg border border-gray-600 text-green-400 hover:text-green-300 hover:border-green-500/50 transition-all duration-200"
                title="Show points"
              >
                <Star className="w-4 h-4 lg:w-5 lg:h-5" />
              </button>
              {showPoints && (
                <div className="absolute top-11 right-0 px-2 py-1 rounded-md border border-green-500/40 bg-gray-900/95 text-white font-semibold font-mono text-xs whitespace-nowrap z-50">
                  {getUserPoints()}_PTS
                </div>
              )}
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
            
            {/* Profile button */}
            <button
              onClick={handleProfileNavigate}
              className="flex items-center gap-1.5 text-left focus:outline-none hover:opacity-80 transition"
            >
              <div className="w-7 h-7 lg:w-8 lg:h-8 bg-gradient-to-br from-green-600 to-green-700 rounded-lg flex items-center justify-center text-white text-sm lg:text-base font-bold border border-green-500/30">
                {getUserInitial()}
              </div>
              <span className="hidden 2xl:inline text-white font-medium font-mono text-sm">
                {getUserName()}
              </span>
            </button>
            
            {/* Logout button */}
            <button
              onClick={onLogout}
              className="px-2 lg:px-2.5 xl:px-3 py-1.5 lg:py-2 bg-red-600/20 text-red-400 rounded-lg hover:bg-red-600/30 border border-red-500/30 hover:border-red-500/50 transition-all duration-200 font-medium font-mono text-xs lg:text-sm whitespace-nowrap"
            >
              LOGOUT
            </button>
            
            {/* Mobile menu button - hidden on 1024px and up */}
            <button
              type="button"
              className="lg:hidden inline-flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 border border-gray-600 rounded-lg text-gray-300 hover:text-white hover:border-green-500/50 transition"
              onClick={() => setIsMenuOpen((prev) => !prev)}
            >
              {isMenuOpen ? <X className="w-4 h-4 sm:w-5 sm:h-5" /> : <Menu className="w-4 h-4 sm:w-5 sm:h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile/Tablet dropdown menu - hidden on 1024px and up */}
        {isMenuOpen && (
          <div className="lg:hidden mt-2 pb-4 border-t border-gray-800">
            <div className="flex flex-col gap-3 pt-4">
              {navigationButtons}
              {/* Points for mobile/tablet */}
              <div className="flex items-center justify-between px-2 py-2 rounded-lg bg-gray-800/60 border border-gray-700">
                <div className="flex items-center gap-2">
                  <Star className="w-4 h-4 text-green-400" />
                  <span className="text-gray-300 font-mono text-sm">{getUserPoints()}_PTS</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
