import { useRef, useState, type DragEvent } from 'react';

type IconName =
  | 'chevronDown'
  | 'creditCard'
  | 'facebook'
  | 'github'
  | 'instagram'
  | 'menu'
  | 'message'
  | 'upload'
  | 'user'
  | 'x'
  | 'youtube';

const iconPaths: Record<IconName, string[]> = {
  chevronDown: ['m6 9 6 6 6-6'],
  creditCard: ['M21 6H3v12h18z', 'M8 12h8', 'M8 16h4'],
  github: [
    'M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.4 5.4 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4',
    'M9 18c-4.51 2-5-2-7-2',
  ],
  instagram: [
    'M16 3H8a5 5 0 0 0-5 5v8a5 5 0 0 0 5 5h8a5 5 0 0 0 5-5V8a5 5 0 0 0-5-5Z',
    'M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z',
    'm17.5 6.51.01-.01',
  ],
  menu: ['M4 6h16', 'M4 12h16', 'M4 18h16'],
  message: [
    'M21 11.5a8.38 8.38 0 0 1-9 8.5 8.5 8.5 0 0 1-7.5-5.5 8.38 8.38 0 0 1-1-6.5 8.5 8.5 0 0 1 8.5-6.5 8.38 8.38 0 0 1 6.5 2.5A8.5 8.5 0 0 1 21 11.5Z',
    'M8 12h.01',
    'M12 12h.01',
    'M16 12h.01',
  ],
  upload: [
    'M4 14v4m-2-4h4m-4 0l2-2 2 2m-2-2v8a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2v-8',
    'M12 3v11',
  ],
  user: [
    'M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2',
    'M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z',
  ],
  x: ['M6 6l12 12', 'M18 6 6 18'],
  youtube: [
    'M21.6 7.2a2.8 2.8 0 0 0-2-2C17.9 4.8 12 4.8 12 4.8s-5.9 0-7.6.4a2.8 2.8 0 0 0-2 2A29 29 0 0 0 2 12a29 29 0 0 0 .4 4.8 2.8 2.8 0 0 0 2 2c1.7.4 7.6.4 7.6.4s5.9 0 7.6-.4a2.8 2.8 0 0 0 2-2A29 29 0 0 0 22 12a29 29 0 0 0-.4-4.8Z',
    'm10 15 5-3-5-3z',
  ],
  facebook: [
    'M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z',
  ],
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

function Dropzone() {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    console.log('Dropped files:', files);
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`
        group relative cursor-pointer rounded-2xl border-2 border-dashed p-8
        transition-all duration-200 ease-in-out
        ${
          isDragging
            ? 'border-indigo-600 bg-indigo-50 ring-4 ring-indigo-50'
            : 'border-slate-300 bg-white hover:border-slate-400'
        }
      `}
    >
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        onChange={(e) => console.log('Selected files:', e.target.files)}
      />
      <div className="flex flex-col items-center text-center">
        <div
          className={`
          mb-4 rounded-full p-4 transition-colors duration-200
          ${isDragging ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-500 group-hover:bg-slate-200'}
        `}
        >
          <Icon name="upload" title="Upload file" />
        </div>
        <div className="mb-6">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="rounded-lg bg-indigo-600 px-6 py-2.5 text-sm font-semibold text-white transition-all duration-200 hover:bg-indigo-700 hover:shadow-md active:scale-95"
          >
            Pilih File
          </button>
          <p className="mt-3 text-sm text-slate-500">
            atau seret dan lepas file di sini
          </p>
        </div>
      </div>
    </div>
  );
}

function Footer() {
  const footerLinks = {
    'Alat Konversi': [
      { name: 'PDF ke Word', href: '#pdf-to-word' },
      { name: 'Word ke PDF', href: '#word-to-pdf' },
      { name: 'JPG ke PNG', href: '#jpg-to-png' },
      { name: 'PNG ke JPG', href: '#png-to-jpg' },
    ],
    Perusahaan: [
      { name: 'Tentang Kami', href: '#about' },
      { name: 'Karir', href: '#careers' },
      { name: 'Kontak', href: '#contact' },
      { name: 'Blog', href: '#blog' },
    ],
    'Informasi Hukum': [
      { name: 'Kebijakan Privasi', href: '#privacy' },
      { name: 'Syarat & Ketentuan', href: '#tos' },
      { name: 'Cookie Policy', href: '#cookies' },
      { name: 'DMCA', href: '#dmca' },
    ],
    Bantuan: [
      { name: 'Pusat Bantuan', href: '#help' },
      { name: 'Panduan Pengguna', href: '#guide' },
      { name: 'FAQ', href: '#faq' },
      { name: 'Hubungi Kami', href: '#contact' },
    ],
  };

  return (
    <footer className="bg-slate-100 border-t border-slate-200">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid gap-12 md:grid-cols-2 lg:grid-cols-4">
          {Object.entries(footerLinks).map(([category, links]) => (
            <div key={category}>
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900 mb-6">
                {category}
              </h3>
              <ul className="space-y-4">
                {links.map((link) => (
                  <li key={link.name}>
                    <a
                      href={link.href}
                      className="text-sm text-slate-600 transition hover:text-indigo-600"
                    >
                      {link.name}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-16 border-t border-slate-200 pt-8">
          <div className="flex flex-col items-center justify-between gap-8 md:flex-row">
            <div className="flex items-center gap-3">
              <img
                alt="Mungil Converter Logo"
                className="size-8 rounded-lg object-cover"
                src="/asset/icon_mungil.svg"
              />
              <span className="text-base font-bold text-slate-900">
                Mungil Converter
              </span>
            </div>

            <div className="flex flex-wrap justify-center gap-6">
              <a
                aria-label="Facebook"
                className="text-slate-400 transition hover:text-indigo-600"
                href="#facebook"
              >
                <Icon name="facebook" />
              </a>
              <a
                aria-label="Instagram"
                className="text-slate-400 transition hover:text-indigo-600"
                href="#instagram"
              >
                <Icon name="instagram" />
              </a>
              <a
                aria-label="Twitter"
                className="text-slate-400 transition hover:text-indigo-600"
                href="#twitter"
              >
                <Icon name="x" />
              </a>
              <a
                aria-label="YouTube"
                className="text-slate-400 transition hover:text-indigo-600"
                href="#youtube"
              >
                <Icon name="youtube" />
              </a>
              <a
                aria-label="GitHub"
                className="text-slate-400 transition hover:text-indigo-600"
                href="#github"
              >
                <Icon name="github" />
              </a>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5">
                <Icon name="creditCard" />
                <span className="text-xs font-medium text-slate-500">
                  Secure Payments
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 text-center">
          <p className="text-xs text-slate-400">
            &copy; {new Date().getFullYear()} Mungil Converter. All rights
            reserved.
          </p>
        </div>
      </div>
    </footer>
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
              <img
                alt=""
                className="size-10 rounded-xl object-cover"
                src="/asset/icon_mungil.svg"
              />
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
                <Icon name="user" />
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
        className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-7xl px-4 py-16 sm:px-6 lg:px-8"
        id="beranda"
      >
        <div className="w-full">
          {/* Grid 3 kolom desktop, 1 kolom mobile */}
          <div className="grid gap-8 lg:grid-cols-[280px_1fr_280px]">
            {/* Kolom Kiri - Ad Banner */}
            <aside
              aria-label="Iklan kiri"
              className="hidden lg:block w-full max-w-[280px] self-start"
            >
              <div className="h-96 rounded-2xl border border-slate-200 bg-white flex items-center justify-center">
                <span className="text-sm text-slate-400">Advertisement</span>
              </div>
            </aside>

            {/* Kolom Tengah - Core Tool */}
            <section
              aria-labelledby="tool-title"
              className="w-full lg:max-w-3xl"
            >
              <h1
                className="mb-6 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl"
                id="tool-title"
              >
                Konversikan file dengan mudah
              </h1>

              {/* Dropzone */}
              <div className="relative" id="converter-dropzone">
                <Dropzone />
              </div>

              {/* Support text + Turnstile */}
              <div className="mt-6 space-y-3">
                <p className="text-sm text-slate-500">
                  Ukuran file maksimum 1GB.{' '}
                  <a
                    className="font-medium text-indigo-600 hover:text-indigo-700 underline"
                    href="#registrasi"
                  >
                    Daftar gratis untuk file lebih besar
                  </a>
                </p>
                <p className="text-xs text-slate-400">
                  Dengan mengunggah file, Anda menyetujui{' '}
                  <a className="underline hover:text-slate-500" href="#tos">
                    Syarat & Ketentuan
                  </a>{' '}
                  dan{' '}
                  <a className="underline hover:text-slate-500" href="#privacy">
                    Kebijakan Privasi
                  </a>
                  .
                </p>
                {/* Cloudflare Turnstile placeholder */}
                <div
                  aria-hidden="true"
                  className="rounded-xl border border-slate-200 bg-white p-4 min-h-[100px]"
                  id="turnstile-placeholder"
                >
                  <p className="text-center text-sm text-slate-400">
                    Cloudflare Turnstile widget akan dimuat di sini (Phase 2)
                  </p>
                </div>
              </div>
            </section>

            {/* Kolom Kanan - Ad Banner */}
            <aside
              aria-label="Iklan kanan"
              className="hidden lg:block w-full max-w-[280px] self-start"
            >
              <div className="h-96 rounded-2xl border border-slate-200 bg-white flex items-center justify-center">
                <span className="text-sm text-slate-400">Advertisement</span>
              </div>
            </aside>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

export default App;
