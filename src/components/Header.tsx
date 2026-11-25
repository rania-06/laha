import { useState } from 'react';
import { Globe, Menu, X } from 'lucide-react';
import { UI_COPY, type Language } from '../i18n/translations';
import { LahaLogo } from './LahaLogo';

interface HeaderProps {
  lang: Language;
  onToggleLanguage: () => void;
  onFocusSearch: () => void;
}

export function Header({
  lang,
  onToggleLanguage,
  onFocusSearch,
}: HeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const t = UI_COPY[lang];

  const navItems = [
    { href: '#directory', label: t.nav.directory },
    { href: '#compare', label: t.nav.compare },
    { href: '#how-it-works', label: t.nav.howItWorks },
    { href: '#workspace', label: t.nav.workspace },
  ];

  const handlePrimaryClick = () => {
    setMobileMenuOpen(false);
    onFocusSearch();
  };

  return (
    <header className="sticky top-0 z-40 border-b border-[#d2d2d7]/80 bg-white/85 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-6 px-4 sm:px-6 lg:px-8">
        {/* Zone 1: Precision Logo + Single-Line Brand Wordmark */}
        <a
          href="#top"
          className="inline-flex items-center gap-2.5 text-lg font-bold tracking-tight text-[#1d1d1f] whitespace-nowrap shrink-0"
        >
          <LahaLogo className="h-7 w-7 shrink-0" />
          <span>{t.brandName}</span>
        </a>

        {/* Zone 2: Clean Apple-style Single-Line Navigation Links */}
        <nav
          aria-label={lang === 'ar' ? 'التنقل الرئيسي' : 'Primary navigation'}
          className="hidden md:flex items-center gap-7 text-xs font-medium text-[#1d1d1f]/80"
        >
          {navItems.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="py-1 transition-colors duration-150 hover:text-[#0071e3] whitespace-nowrap shrink-0"
            >
              {item.label}
            </a>
          ))}
        </nav>

        {/* Zone 3: Language Switch + Primary Action */}
        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={onToggleLanguage}
            aria-label={t.nav.switchLangAria}
            className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-[#d2d2d7] bg-[#f5f5f7] px-3 py-1.5 text-xs font-semibold text-[#1d1d1f] transition-colors duration-150 hover:border-[#1d1d1f] hover:bg-white whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Globe className="h-3.5 w-3.5 text-[#0071e3]" aria-hidden="true" />
            <span>{t.nav.switchLangLabel}</span>
          </button>

          <button
            type="button"
            onClick={handlePrimaryClick}
            className="min-h-9 rounded-full bg-[#0071e3] px-4 py-1.5 text-xs font-semibold text-white transition-colors duration-150 hover:bg-[#0062c4] whitespace-nowrap shrink-0 cursor-pointer"
          >
            {t.nav.searchCta}
          </button>

          <button
            type="button"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            aria-expanded={mobileMenuOpen}
            aria-label={mobileMenuOpen ? t.nav.closeMenu : t.nav.openMenu}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-[#d2d2d7] text-[#1d1d1f] transition-colors hover:bg-[#f5f5f7] md:hidden cursor-pointer"
          >
            {mobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {mobileMenuOpen && (
        <nav
          aria-label={lang === 'ar' ? 'قائمة الجوال' : 'Mobile navigation'}
          className="border-t border-[#d2d2d7]/80 bg-white px-4 py-3 md:hidden"
        >
          <div className="flex flex-col gap-1">
            {navItems.map((item) => (
              <a
                key={item.href}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className="flex min-h-11 items-center rounded-xl px-3 text-sm font-medium text-[#1d1d1f] transition-colors hover:bg-[#f5f5f7]"
              >
                {item.label}
              </a>
            ))}
          </div>
        </nav>
      )}
    </header>
  );
}
