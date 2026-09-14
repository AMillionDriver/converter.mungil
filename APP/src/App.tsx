import { useState } from 'react';

type IconName = 'chevronDown' | 'menu' | 'message' | 'user' | 'x';

const iconPaths: Record<IconName, string[]> = {
  chevronDown: ['m6 9 6 6 6-6'],
  menu: ['M4 6h16', 'M4 12h16', 'M4 18h16'],
  message: [
    'M21 11.5a8.38 8.38 0 0 1-9 8.5 8.5 8.5 0 0 1-7.5-5.5 8.38 8.38 0 0 1-1-6.5 8.5 8.5 0 0 1 8.5-6.5 8.38 8.38 0 0 1 6.5 2.5A8.5 8.5 0 0 1 21 11.5Z',
    'M8 12h.01',
    'M12 12h.01',
    'M16 12h.01',
  ],
  user: [
    'M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2', 
    'M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z'
  ],
  x: ['M6 6l12 12', 'M18 6 6 18'],
};

interface IconProps {
  name: IconName;
  title?: string;
}

function Icon({ name, title }: IconProps) {
  return (
    <svg
      aria-hidden={title ? undefined : true}
      aria-label={title}
      className="size-5"
      fill="none"
      role={title ? 'img' : undefined}
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      viewBox="0 0 24 24"
    >
      {title ? <title>{title}</title> : null}
      {iconPaths[name].map((path) => (
        <path d={path} key={path} />
      ))}
    </svg>
  );
}

function App() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen((currentState) => !currentState);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/95 backdrop-blur">
        <nav
          aria-label="Navigasi utama"
          className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8"
        >
          <div className="flex h-16 items-center justify-between gap-4">
            <a
              aria-label="Mungil Converter beranda"
              className="flex shrink-0 items-center gap-3"
              href="#beranda"
            >
              <span className="grid size-9 place-items-center rounded-xl bg-indigo-600 shadow-sm">
                <svg
                  aria-hidden="true"
                  fill="none"
                  height="22"
                  stroke="white"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                  width="22"
                >
                  <path d="M7 7h10M7 12h7M7 17h4" strokeLinecap="round" />
                  <path
                    d="M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
              <span className="text-base font-bold tracking-tight text-slate-900">
                Mungil Converter
              </span>
            </a>

            <button
              className="hidden items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:ring-offset-2 md:flex"
              type="button"
            >
              <span className="max-w-36 truncate">mungil.my.id</span>
              <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-semibold text-indigo-700">
                Free
              </span>
              <Icon name="chevronDown" />
            </button>

            <div className="hidden items-center gap-1 md:flex">
              <a
                className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:ring-offset-2"
                href="#support"
              >
                <Icon name="message" />
                Support
              </a>
              <a
                aria-label="Buka profil"
                className="ml-1 inline-grid size-9 place-items-center rounded-full border border-slate-200 text-slate-600 transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:ring-offset-2"
                href="#profile"
              >
                <Icon name="user"/>
              </a>
            </div>

            <button
              aria-controls="mobile-navigation"
              aria-expanded={isMobileMenuOpen}
              aria-label={
                isMobileMenuOpen ? 'Tutup menu navigasi' : 'Buka menu navigasi'
              }
              className="inline-grid size-10 place-items-center rounded-lg text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:ring-offset-2 md:hidden"
              onClick={toggleMobileMenu}
              type="button"
            >
              <Icon name={isMobileMenuOpen ? 'x' : 'menu'} />
            </button>
          </div>

          {isMobileMenuOpen ? (
            <div
              className="border-t border-slate-200 py-3 md:hidden"
              id="mobile-navigation"
            >
              <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2.5">
                <span className="text-sm font-medium text-slate-600">
                  mungil.my.id
                </span>
                <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-semibold text-indigo-700">
                  Free
                </span>
              </div>
              <div className="mt-2 grid gap-1">
                <a
                  className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-100 hover:text-slate-900"
                  href="#support"
                  onClick={toggleMobileMenu}
                >
                  <Icon name="message" />
                  Support
                </a>
                <a
                  className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-100 hover:text-slate-900"
                  href="#profile"
                  onClick={toggleMobileMenu}
                >
                  <Icon name="user" />
                  Profil
                </a>
              </div>
            </div>
          ) : null}
        </nav>
      </header>

      <main
        className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-7xl items-center px-4 py-16 sm:px-6 lg:px-8"
        id="beranda"
      >
        <section aria-labelledby="header-preview-title" className="max-w-xl">
          <p className="text-sm font-semibold text-indigo-600">Phase 1</p>
          <h1
            className="mt-2 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl"
            id="header-preview-title"
          >
            Header Mungil Converter siap digunakan.
          </h1>
          <p className="mt-4 text-base leading-7 text-slate-600">
            Area konverter akan dibangun pada tahap berikutnya.
          </p>
        </section>
      </main>
    </div>
  );
}

export default App;
