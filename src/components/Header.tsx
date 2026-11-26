import { useEffect, useState } from 'react';
import {
  Compass,
  Globe,
  LayoutDashboard,
  LogIn,
  Menu,
  Moon,
  Sun,
  X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { UI_COPY, type Language } from '../i18n/translations';
import { LahaLogo } from './LahaLogo';

interface HeaderProps {
  lang: Language;
  activeView: 'marketplace' | 'dashboard';
  onNavigateView: (view: 'marketplace' | 'dashboard') => void;
  onToggleLanguage: () => void;
  onFocusSearch: () => void;
  onOpenAuth: (
    reason?: 'startup' | 'client' | 'dashboard' | 'message' | 'general'
  ) => void;
  onOpenAdvisor: () => void;
}

export function Header({
  lang,
  activeView,
  onNavigateView,
  onToggleLanguage,
  onFocusSearch,
  onOpenAuth,
  onOpenAdvisor,
}: HeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user, profile, authLoading } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const t = UI_COPY[lang];
  const isAr = lang === 'ar';

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [activeView]);

  useEffect(() => {
    if (!mobileMenuOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileMenuOpen(false);
    };
    const onResize = () => {
      if (window.innerWidth >= 1024) setMobileMenuOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('resize', onResize);
    };
  }, [mobileMenuOpen]);

  const navItems = [
    { href: '#directory', label: t.nav.directory },
    { href: '#compare', label: t.nav.compare },
    { href: '#how-it-works', label: t.nav.howItWorks },
    { href: '#workspace', label: t.nav.workspace },
  ];

  const handleNavLinkClick = (href: string) => {
    setMobileMenuOpen(false);
    if (activeView !== 'marketplace') {
      onNavigateView('marketplace');
      window.setTimeout(() => {
        const el = document.querySelector(href);
        el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 60);
    }
  };

  const handleBrandClick = () => {
    setMobileMenuOpen(false);
    if (activeView !== 'marketplace') {
      onNavigateView('marketplace');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      onFocusSearch();
    }
  };

  const handleAccountAction = () => {
    setMobileMenuOpen(false);
    if (!user) {
      onOpenAuth('dashboard');
    } else if (activeView === 'dashboard') {
      onNavigateView('marketplace');
    } else {
      onNavigateView('dashboard');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const accountLabel = user
    ? activeView === 'dashboard'
      ? isAr
        ? 'السوق'
        : 'Marketplace'
      : isAr
        ? 'لوحتي'
        : 'Dashboard'
    : isAr
      ? 'تسجيل الدخول'
      : 'Sign In';

  return (
    <header className="sticky top-0 z-40 border-b border-[#d2d2d7]/75 bg-white/85 backdrop-blur-xl transition-colors duration-200 dark:border-white/12 dark:bg-black/85">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-2 px-3.5 sm:gap-4 sm:px-6 lg:gap-6 lg:px-8">
        {/* Zone 1: Single-line Apple-Minimal Brand Wordmark */}
        <a
          href="#top"
          onClick={(e) => {
            if (activeView !== 'marketplace') {
              e.preventDefault();
              handleBrandClick();
            }
          }}
          className="inline-flex items-center gap-2 text-base font-bold tracking-tight text-[#1d1d1f] whitespace-nowrap shrink-0 dark:text-[#f5f5f7] sm:gap-2.5 sm:text-lg"
        >
          <LahaLogo className="h-7 w-7 shrink-0" />
          <span>{t.brandName}</span>
        </a>

        {/* Zone 2: Crisp Single-Line Navigation Links (Laptop / Desktop >= 1024px) */}
        <nav
          aria-label={isAr ? 'التنقل الرئيسي' : 'Primary navigation'}
          className="hidden lg:flex items-center gap-5 xl:gap-7 text-xs font-medium text-[#1d1d1f]/80 dark:text-[#f5f5f7]/80"
        >
          {navItems.map((item) => (
            <a
              key={item.href}
              href={item.href}
              onClick={() => handleNavLinkClick(item.href)}
              className="py-1.5 transition-colors duration-150 hover:text-[#0071e3] dark:hover:text-[#2997ff] whitespace-nowrap shrink-0"
            >
              {item.label}
            </a>
          ))}
          <button
            type="button"
            onClick={onOpenAdvisor}
            className="inline-flex items-center gap-1.5 py-1.5 font-semibold text-[#0066cc] transition-colors duration-150 hover:text-[#004c99] dark:text-[#2997ff] dark:hover:text-[#64b5ff] whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Compass className="h-3.5 w-3.5" aria-hidden="true" />
            <span>{isAr ? 'مستشارك الذكي' : 'Smart Advisor'}</span>
          </button>
        </nav>

        {/* Zone 3: Theme Toggle + Language Switch + Primary Account CTA + Mobile/Tablet Menu */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <button
            type="button"
            onClick={toggleTheme}
            aria-label={
              isDark
                ? isAr
                  ? 'التبديل إلى الوضع الفاتح'
                  : 'Switch to light mode'
                : isAr
                  ? 'التبديل إلى الوضع الداكن'
                  : 'Switch to dark mode'
            }
            title={
              isDark
                ? isAr
                  ? 'الوضع الفاتح'
                  : 'Light mode'
                : isAr
                  ? 'الوضع الداكن'
                  : 'Dark mode'
            }
            className="flex h-10 w-10 sm:h-9 sm:w-9 items-center justify-center rounded-full border border-[#d2d2d7] bg-[#f5f5f7] text-[#1d1d1f] transition-colors duration-150 hover:border-[#1d1d1f] hover:bg-white dark:border-[#38383a] dark:bg-[#1c1c1e] dark:text-[#f5f5f7] dark:hover:border-[#a1a1a6] dark:hover:bg-[#2c2c2e] cursor-pointer"
          >
            {isDark ? (
              <Sun className="h-4 w-4 text-amber-400" aria-hidden="true" />
            ) : (
              <Moon className="h-4 w-4 text-[#1d1d1f]" aria-hidden="true" />
            )}
          </button>

          <button
            type="button"
            onClick={onToggleLanguage}
            aria-label={t.nav.switchLangAria}
            className="inline-flex min-h-10 sm:min-h-9 items-center gap-1.5 rounded-full border border-[#d2d2d7] bg-[#f5f5f7] px-2.5 sm:px-3 py-1.5 text-xs font-semibold text-[#1d1d1f] transition-colors duration-150 hover:border-[#1d1d1f] hover:bg-white dark:border-[#38383a] dark:bg-[#1c1c1e] dark:text-[#f5f5f7] dark:hover:border-[#a1a1a6] dark:hover:bg-[#2c2c2e] whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Globe
              className="h-3.5 w-3.5 text-[#0071e3] dark:text-[#2997ff]"
              aria-hidden="true"
            />
            <span>{t.nav.switchLangLabel}</span>
          </button>

          <button
            type="button"
            disabled={authLoading}
            onClick={handleAccountAction}
            className={`inline-flex min-h-10 sm:min-h-9 items-center gap-1.5 rounded-full px-3 sm:px-4 py-1.5 text-xs font-semibold transition-colors duration-150 whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-60 ${
              user && activeView === 'dashboard'
                ? 'border border-[#1d1d1f] bg-[#1d1d1f] text-white hover:bg-[#323236] dark:border-[#f5f5f7] dark:bg-[#f5f5f7] dark:text-black dark:hover:bg-white'
                : 'bg-[#0071e3] text-white hover:bg-[#0062c4]'
            }`}
          >
            {user ? (
              <LayoutDashboard className="h-3.5 w-3.5" aria-hidden="true" />
            ) : (
              <LogIn className="h-3.5 w-3.5" aria-hidden="true" />
            )}
            <span className="max-w-24 sm:max-w-28 truncate">{accountLabel}</span>
          </button>

          <button
            type="button"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            aria-expanded={mobileMenuOpen}
            aria-label={mobileMenuOpen ? t.nav.closeMenu : t.nav.openMenu}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-[#d2d2d7] text-[#1d1d1f] transition-colors hover:bg-[#f5f5f7] dark:border-[#38383a] dark:text-[#f5f5f7] dark:hover:bg-[#1c1c1e] lg:hidden cursor-pointer"
          >
            {mobileMenuOpen ? (
              <X className="h-4 w-4" />
            ) : (
              <Menu className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile & Tablet Navigation Drawer (< 1024px) */}
      {mobileMenuOpen && (
        <nav
          aria-label={isAr ? 'قائمة التنقل' : 'Navigation menu'}
          className="border-t border-[#d2d2d7]/80 bg-white/95 px-4 py-3 backdrop-blur-xl dark:border-[#2c2c2e] dark:bg-[#111113]/95 lg:hidden"
        >
          <div className="mx-auto flex max-w-6xl flex-col gap-1 sm:px-2">
            {user && (
              <div className="mb-1 border-b border-[#f5f5f7] px-3 pb-2.5 text-xs font-medium text-[#515154] dark:border-[#2c2c2e] dark:text-[#a1a1a6]">
                {profile?.displayName || user.displayName || user.email}
              </div>
            )}
            <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
              {navItems.map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  onClick={() => handleNavLinkClick(item.href)}
                  className="flex min-h-11 items-center rounded-xl px-3 text-sm font-medium text-[#1d1d1f] transition-colors hover:bg-[#f5f5f7] dark:text-[#f5f5f7] dark:hover:bg-[#1c1c1e]"
                >
                  {item.label}
                </a>
              ))}
            </div>
            <div className="mt-1 grid grid-cols-1 gap-1.5 border-t border-[#f5f5f7] pt-2 dark:border-[#2c2c2e] sm:grid-cols-2">
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  onOpenAdvisor();
                }}
                className="flex min-h-11 items-center gap-2 rounded-xl px-3 text-start text-sm font-semibold text-[#0066cc] transition-colors hover:bg-[#f5f5f7] dark:text-[#2997ff] dark:hover:bg-[#1c1c1e] cursor-pointer"
              >
                <Compass className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span>{isAr ? 'مستشارك الذكي' : 'Smart Advisor'}</span>
              </button>
              <button
                type="button"
                onClick={handleAccountAction}
                className="flex min-h-11 items-center gap-2 rounded-xl bg-[#f5f5f7] px-3 text-start text-sm font-semibold text-[#1d1d1f] transition-colors hover:bg-[#e8e8ed] dark:bg-[#1c1c1e] dark:text-[#f5f5f7] dark:hover:bg-[#2c2c2e] cursor-pointer"
              >
                {user ? (
                  <LayoutDashboard className="h-4 w-4 shrink-0 text-[#0071e3] dark:text-[#2997ff]" aria-hidden="true" />
                ) : (
                  <LogIn className="h-4 w-4 shrink-0 text-[#0071e3] dark:text-[#2997ff]" aria-hidden="true" />
                )}
                <span>{accountLabel}</span>
              </button>
            </div>
          </div>
        </nav>
      )}
    </header>
  );
}
