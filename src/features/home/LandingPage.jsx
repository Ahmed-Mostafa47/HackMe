import React, { useEffect, useRef, useState } from 'react';
import { Terminal, Shield, Code, Users, ArrowRight, Zap, Target, TrendingUp, Clock, Trophy, BookOpen, Mail } from 'lucide-react';
import BinaryRain from '@/features/shared/ui/BinaryRain';
import ContactUsModal from '@/features/shared/ui/ContactUsModal';
import '@/styles/animations.css';

const API_BASE = import.meta.env.DEV ? '/api' : 'http://localhost/HackMe/server/api';

const LandingPage = ({ onNavigateToLogin, onNavigateToRegister }) => {
  const [visibleElements, setVisibleElements] = useState(new Set());
  const observerRef = useRef(null);
  const [champions, setChampions] = useState([]);
  const [championsLoading, setChampionsLoading] = useState(true);
  const [championsError, setChampionsError] = useState(null);

  const [contactOpen, setContactOpen] = useState(false);

  useEffect(() => {
    // On initial load, if page is at top, show all elements immediately (looks like one page)
    const checkInitialState = () => {
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      if (scrollTop < 100) {
        // Page just loaded and at top - show all elements immediately
        const allElements = document.querySelectorAll('.scroll-animate');
        const elementIds = Array.from(allElements).map(el => el.id).filter(Boolean);
        if (elementIds.length > 0) {
          setVisibleElements(new Set(elementIds));
        }
      }
    };

    // Small delay to ensure DOM is ready
    const timeoutId = setTimeout(checkInitialState, 100);

    // Create Intersection Observer - works for both scroll up and scroll down
    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setVisibleElements((prev) => new Set(prev).add(entry.target.id));
          } else {
            // When element leaves viewport, remove it so it can animate again when scrolled to
            setVisibleElements((prev) => {
              const newSet = new Set(prev);
              newSet.delete(entry.target.id);
              return newSet;
            });
          }
        });
      },
      {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px',
      }
    );

    // Observe all scroll-animate elements
    const elements = document.querySelectorAll('.scroll-animate');
    elements.forEach((el) => observerRef.current.observe(el));

    return () => {
      clearTimeout(timeoutId);
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setChampionsLoading(true);
      setChampionsError(null);
      try {
        const res = await fetch(`${API_BASE}/get_leaderboard.php?limit=15`);
        const data = await res.json();
        if (cancelled) return;
        if (data.success && Array.isArray(data.leaderboard)) {
          setChampions(
            data.leaderboard.map((p, i) => ({
              rank: p.rank ?? i + 1,
              name: p.name || p.username,
              points: p.points,
              avatar: ['👻', '👁️', '⚡', '🎯', '💀', '🔥', '⭐'][i % 7],
            }))
          );
        } else {
          setChampionsError(data.message || 'Could not load ranking');
        }
      } catch (e) {
        if (!cancelled) setChampionsError('Cannot reach server');
      } finally {
        if (!cancelled) setChampionsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const features = [
    {
      icon: Code,
      title: 'TRAINING_MODULES',
      description: 'Advanced penetration testing laboratories and hands-on challenges',
      color: 'from-green-600 to-green-700',
    },
    {
      icon: Shield,
      title: 'SECURE_ENVIRONMENT',
      description: 'Practice real-world security scenarios in isolated sandbox environments',
      color: 'from-blue-600 to-blue-700',
    },
    {
      icon: Users,
      title: 'OPERATIVE_NETWORK',
      description: 'Connect with security professionals and share intelligence',
      color: 'from-purple-600 to-purple-700',
    },
    {
      icon: TrendingUp,
      title: 'PROGRESS_TRACKING',
      description: 'Monitor your skills growth with detailed analytics and leaderboards',
      color: 'from-yellow-600 to-orange-600',
    },
    {
      icon: Target,
      title: 'REAL_WORLD_CHALLENGES',
      description: 'Test your skills against realistic vulnerability scenarios',
      color: 'from-red-600 to-pink-600',
    },
    {
      icon: Clock,
      title: '24/7_ACCESS',
      description: 'Learn at your own pace, anytime, anywhere',
      color: 'from-cyan-600 to-teal-600',
    },
  ];

  const stats = [
    { value: '500+', label: 'ACTIVE_OPERATIVES' },
    { value: '12+', label: 'TRAINING_MODULES' },
    { value: '50+', label: 'EXPLOIT_VECTORS' },
    { value: '24/7', label: 'MISSION_ACCESS' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black relative overflow-hidden">
      {/* Background Effects */}
      <BinaryRain />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-green-500/10 via-transparent to-black"></div>
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-green-400 via-green-500 to-green-400 animate-pulse"></div>

      {/* Hero Section - No animation, visible immediately */}
      <section className="relative pt-20 pb-16 sm:pt-24 sm:pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12 sm:mb-16">
            {/* Logo */}
            <div className="inline-flex items-center justify-center w-20 h-20 sm:w-24 sm:h-24 lg:w-28 lg:h-28 bg-gradient-to-br from-green-600 to-green-700 rounded-xl lg:rounded-2xl mb-6 sm:mb-8 border border-green-500/30 shadow-2xl shadow-green-500/20 hover:scale-110 transition-transform duration-300 animate-float">
              <Terminal className="w-10 h-10 sm:w-12 sm:h-12 lg:w-14 lg:h-14 text-white" />
            </div>

            {/* Main Heading */}
            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-green-400 mb-4 sm:mb-6 font-mono tracking-tight leading-tight">
              HACK_ME_PLATFORM
            </h1>
            <p className="text-lg sm:text-xl md:text-2xl text-gray-400 mb-6 sm:mb-8 font-mono max-w-3xl mx-auto">
              // ACCESS_GRANTED: PENETRATION_TESTING_MISSION_CONTROL
            </p>
            <p className="text-base sm:text-lg text-gray-500 mb-8 sm:mb-10 font-mono max-w-2xl mx-auto">
              Master the art of cybersecurity through hands-on training, real-world challenges, and expert-guided learning paths.
            </p>
            <div className="max-w-3xl mx-auto mt-8 rounded-2xl border border-green-500/20 bg-gray-900/40 backdrop-blur-sm p-6 sm:p-8 text-left space-y-4">
              <h2 className="text-lg sm:text-xl font-bold text-green-400 font-mono text-center mb-4">
                // WHAT_IS_THIS_PLATFORM
              </h2>
              <p className="text-sm sm:text-base text-gray-300 font-mono leading-relaxed">
                <strong className="text-green-300">HackMe</strong> is a hands-on penetration-testing academy built for serious skill growth. Train inside isolated white-box and black-box labs, exploit real-world vulnerabilities safely, and build practical offensive security experience through guided, mission-style practice.
              </p>
              <ul className="space-y-3 text-sm sm:text-base text-gray-400 font-mono">
                <li className="flex gap-3">
                  <BookOpen className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
                  <span><span className="text-gray-200">Training labs:</span> SQL injection, XSS, blind testing, access control, IDOR, and security games, organized by category and difficulty so you can progress with a clear path.</span>
                </li>
                <li className="flex gap-3">
                  <Target className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                  <span><span className="text-gray-200">Progress & scoring:</span> Submit lab answers securely, earn points, and track completed labs with a clear mission history in your account.</span>
                </li>
                <li className="flex gap-3">
                  <Trophy className="w-5 h-5 text-yellow-400 shrink-0 mt-0.5" />
                  <span><span className="text-gray-200">Leaderboard & rank:</span> Compete with other operatives, climb the ranking, and measure your growth against an active community of learners.</span>
                </li>
              </ul>
              <p className="text-xs sm:text-sm text-gray-500 font-mono pt-2 border-t border-gray-700/80">
                Create an account to access the full mission dashboard, or sign in if you already have credentials.
              </p>
            </div>

            {/* CTA Buttons */}
            <div className="mt-10 sm:mt-12 flex flex-col sm:flex-row flex-wrap items-center justify-center gap-4 sm:gap-6">
              <button
                onClick={onNavigateToLogin}
                className="group w-full sm:w-auto px-8 sm:px-10 py-3 sm:py-4 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg font-bold text-base sm:text-lg shadow-lg hover:shadow-green-500/30 transform hover:scale-105 transition-all duration-300 border border-green-500/30 font-mono flex items-center justify-center gap-2 hover:animate-glow"
              >
                INITIATE_SESSION
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
              <button
                onClick={onNavigateToRegister}
                className="w-full sm:w-auto px-8 sm:px-10 py-3 sm:py-4 bg-gray-800/80 backdrop-blur-lg text-green-400 rounded-lg font-bold text-base sm:text-lg border-2 border-green-500/50 hover:border-green-500 hover:bg-gray-800 transform hover:scale-105 transition-all duration-300 font-mono"
              >
                CREATE_ACCOUNT
              </button>
              <button
                type="button"
                onClick={() => setContactOpen(true)}
                className="w-full sm:w-auto px-8 sm:px-10 py-3 sm:py-4 rounded-lg font-bold text-base sm:text-lg border-2 border-gray-600 bg-gray-900/70 text-gray-200 hover:border-green-500/40 hover:bg-gray-800/90 hover:text-green-400 transform hover:scale-105 transition-all duration-300 font-mono flex items-center justify-center gap-2"
              >
                <Mail className="w-5 h-5" />
                CONTACT_US
              </button>
            </div>
          </div>

          {/* Stats Grid - Scroll animation */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 max-w-4xl mx-auto mb-16 sm:mb-20">
            {stats.map((stat, index) => {
              const isVisible = visibleElements.has(`stat-${index}`);
              return (
              <div
                key={index}
                id={`stat-${index}`}
                className={`scroll-animate scroll-animate-delay-${index + 1} bg-gray-800/60 backdrop-blur-lg rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-gray-700 hover:border-green-500/50 hover:scale-105 transition-all duration-300 text-center ${isVisible ? 'visible' : ''}`}
              >
                <div className="text-2xl sm:text-3xl md:text-4xl font-bold text-green-400 mb-1 sm:mb-2 font-mono">
                  {stat.value}
                </div>
                <div className="text-xs sm:text-sm text-gray-400 font-mono tracking-wide">
                  {stat.label}
                </div>
              </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Features Section - Scroll animation */}
      <section className="relative py-12 sm:py-16 lg:py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12 sm:mb-16">
            <h2
              id="features-title"
              className={`scroll-animate text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-4 font-mono ${visibleElements.has('features-title') ? 'visible' : ''}`}
            >
              MISSION_CAPABILITIES
            </h2>
            <p
              id="features-subtitle"
              className={`scroll-animate scroll-animate-delay-1 text-gray-400 font-mono text-base sm:text-lg max-w-2xl mx-auto ${visibleElements.has('features-subtitle') ? 'visible' : ''}`}
            >
              // Advanced tools and training modules for cybersecurity professionals
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            {features.map((feature, index) => {
              const IconComponent = feature.icon;
              const delayClass = index % 3 === 0 ? '' : index % 3 === 1 ? 'scroll-animate-delay-1' : 'scroll-animate-delay-2';
              return (
                <div
                  key={index}
                  id={`feature-${index}`}
                  className={`scroll-animate ${delayClass} group bg-gray-800/80 backdrop-blur-lg rounded-xl sm:rounded-2xl p-6 sm:p-8 border border-gray-700 hover:border-green-500/50 transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl hover:shadow-green-500/10 ${visibleElements.has(`feature-${index}`) ? 'visible' : ''}`}
                >
                  <div className={`inline-flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 bg-gradient-to-br ${feature.color} rounded-xl mb-4 sm:mb-6 shadow-lg group-hover:scale-110 group-hover:rotate-6 transition-all duration-300 border border-gray-600`}>
                    <IconComponent className="w-7 h-7 sm:w-8 sm:h-8 text-white" />
                  </div>
                  <h3 className="text-xl sm:text-2xl font-bold text-white mb-3 group-hover:text-green-400 transition-colors font-mono">
                    {feature.title}
                  </h3>
                  <p className="text-gray-400 leading-relaxed font-mono text-sm sm:text-base">
                    {feature.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Our Champions — public leaderboard (same data as OPERATIVE_RANKING) */}
      <section className="relative py-12 sm:py-16 lg:py-20 px-4 sm:px-6 lg:px-8 border-t border-gray-800/80">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-10 sm:mb-12">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-amber-400 mb-3 font-mono tracking-tight">
              OUR CHAMPIONS
            </h2>
            <p className="text-gray-500 font-mono text-sm sm:text-base">
              // TOP_OPERATIVES_BY_TOTAL_POINTS
            </p>
          </div>
          <div className="bg-gray-800/80 backdrop-blur-lg rounded-2xl p-5 sm:p-6 border border-amber-500/20 shadow-xl shadow-amber-900/10">
            <div className="flex flex-wrap items-center gap-3 mb-6">
              <div className="p-2 bg-gradient-to-br from-green-600 to-green-700 rounded-lg border border-green-500/30">
                <Trophy className="w-6 h-6 text-green-400" />
              </div>
              <h3 className="text-xl sm:text-2xl font-bold text-white font-mono">
                OPERATIVE_RANKING
              </h3>
            </div>
            <div className="space-y-3">
              {championsLoading ? (
                <div className="text-center py-10 text-gray-400 font-mono text-sm">Loading champions...</div>
              ) : championsError ? (
                <div className="text-center py-10 text-amber-200/80 font-mono text-sm">
                  {championsError}
                  <span className="block text-gray-500 mt-2 text-xs">Start the backend (XAMPP) and ensure the leaderboard API is reachable.</span>
                </div>
              ) : champions.length === 0 ? (
                <div className="text-center py-10 text-gray-400 font-mono text-sm">No rankings yet — be the first operative on the board.</div>
              ) : (
                champions.map((player) => (
                  <div
                    key={`${player.rank}-${player.name}`}
                    className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 p-4 rounded-xl bg-gray-700/50 hover:bg-gray-700/80 border border-gray-600 transition-all duration-300"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-amber-400/90 font-mono font-bold w-8 shrink-0">#{player.rank}</span>
                      <span className="text-2xl shrink-0">{player.avatar}</span>
                      <span className="font-bold text-gray-200 font-mono truncate">{player.name}</span>
                    </div>
                    <div className="text-left sm:text-right sm:pl-4">
                      <div className="font-bold text-green-400 text-lg font-mono">{player.points}</div>
                      <div className="text-gray-400 text-xs font-mono tracking-wide">POINTS</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section - Scroll animation */}
      <section className="relative py-12 sm:py-16 lg:py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <div
            id="cta-section"
            className={`scroll-animate bg-gradient-to-r from-gray-800/90 via-gray-800/80 to-gray-800/90 backdrop-blur-lg rounded-2xl sm:rounded-3xl p-8 sm:p-12 border border-green-500/30 text-center ${visibleElements.has('cta-section') ? 'visible' : ''}`}
          >
            <Zap className="w-12 h-12 sm:w-16 sm:h-16 text-green-400 mx-auto mb-4 sm:mb-6 animate-pulse" />
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-4 sm:mb-6 font-mono">
              READY_TO_BEGIN_MISSION?
            </h2>
            <p className="text-gray-400 mb-8 sm:mb-10 font-mono text-base sm:text-lg max-w-2xl mx-auto">
              Join hundreds of security professionals and start your penetration testing journey today.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-6">
              <button
                onClick={onNavigateToRegister}
                className="group w-full sm:w-auto px-8 sm:px-10 py-3 sm:py-4 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg font-bold text-base sm:text-lg shadow-lg hover:shadow-green-500/30 transform hover:scale-105 transition-all duration-300 border border-green-500/30 font-mono flex items-center justify-center gap-2"
              >
                ENLIST_NOW
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
              <button
                onClick={onNavigateToLogin}
                className="w-full sm:w-auto px-8 sm:px-10 py-3 sm:py-4 bg-transparent text-green-400 rounded-lg font-bold text-base sm:text-lg border-2 border-green-500/50 hover:border-green-500 hover:bg-green-500/10 transform hover:scale-105 transition-all duration-300 font-mono"
              >
                ACCESS_EXISTING
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative py-8 sm:py-10 px-4 sm:px-6 lg:px-8 border-t border-gray-800">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Terminal className="w-5 h-5 sm:w-6 sm:h-6 text-green-400" />
              <span className="text-green-400 font-bold font-mono text-sm sm:text-base">HACK_ME</span>
            </div>
            <p className="text-gray-500 font-mono text-xs sm:text-sm text-center sm:text-right">
              // PENETRATION_TESTING_PLATFORM • SECURE • MODERN • POWERFUL
            </p>
          </div>
        </div>
      </footer>

      <ContactUsModal open={contactOpen} onClose={() => setContactOpen(false)} />
    </div>
  );
};

export default LandingPage;
