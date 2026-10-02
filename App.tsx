import { useEffect, useRef, useState, useCallback } from 'react';
import type { CSSProperties, ReactNode } from 'react';

/* ---------- IMAGES ---------- */
const HERO_IMAGE = 'https://images.higgs.ai/?default=1&output=webp&url=https%3A%2F%2Fd8j0ntlcm91z4.cloudfront.net%2Fuser_38xzZboKViGWJOttwIXH07lWA1P%2Fhf_20260624_113640_ccf3cf97-d447-425b-a134-d7b09fc743fc.png&w=1280&q=85';
const SECTION2_IMAGE = 'https://images.higgs.ai/?default=1&output=webp&url=https%3A%2F%2Fd8j0ntlcm91z4.cloudfront.net%2Fuser_38xzZboKViGWJOttwIXH07lWA1P%2Fhf_20260624_114219_414dfe80-f15c-4e25-bf52-b13721f4bd88.png&w=1280&q=85';
const SECTION3_IMG1 = 'https://images.higgs.ai/?default=1&output=webp&url=https%3A%2F%2Fd8j0ntlcm91z4.cloudfront.net%2Fuser_38xzZboKViGWJOttwIXH07lWA1P%2Fhf_20260624_115253_c19ab167-8dd5-48b4-967d-b9f0d9d6e8fb.png&w=1280&q=85';
const SECTION3_IMG2 = 'https://images.higgs.ai/?default=1&output=webp&url=https%3A%2F%2Fd8j0ntlcm91z4.cloudfront.net%2Fuser_38xzZboKViGWJOttwIXH07lWA1P%2Fhf_20260624_115237_fc519057-6e87-4abf-999a-9610b8b085b4.png&w=1280&q=85';
const SECTION3_BG = 'https://images.higgs.ai/?default=1&output=webp&url=https%3A%2F%2Fd8j0ntlcm91z4.cloudfront.net%2Fuser_38xzZboKViGWJOttwIXH07lWA1P%2Fhf_20260624_114355_752ba9e6-0942-4abb-9047-5d9bb16632e9.png&w=1280&q=85';

/* ---------- DATA ---------- */
const featureBars = ['Advanced Dentistry', 'High Quality Equipment', 'Friendly Staff'];

const services = [
  { name: 'Dental\nVeneers', num: '01', active: true },
  { name: 'Dental\nCrowns', num: '02', active: false },
  { name: 'Teeth\nWhitening', num: '03', active: false },
  { name: 'Dental\nImplants', num: null as string | null, active: false },
];

const navLinks = ['Home', 'Services', 'About', 'Gallery', 'Contact'];

/* ---------- HOOKS ---------- */
type MaskPos = { x: number; y: number; sw: number; sh: number };

function useIsMobile() {
  const [mobile, setMobile] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(max-width: 767px)').matches
  );
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)');
    const handler = (e: MediaQueryListEvent) => setMobile(e.matches);
    setMobile(mq.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);
  return mobile;
}

function useMaskPositions(
  sectionRef: React.RefObject<HTMLElement>,
  cardRefs: React.MutableRefObject<(HTMLDivElement | null)[]>
) {
  const [positions, setPositions] = useState<MaskPos[]>([]);
  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;
    const compute = () => {
      const sw = section.offsetWidth;
      const sh = section.offsetHeight;
      const next = cardRefs.current.map((card) => {
        let x = 0, y = 0;
        let el: HTMLElement | null = card;
        // offset* ignores CSS transforms, so the entrance animation doesn't skew the mask
        while (el && el !== section) {
          x += el.offsetLeft;
          y += el.offsetTop;
          el = el.offsetParent as HTMLElement | null;
        }
        return { x, y, sw, sh };
      });
      setPositions(next);
    };
    compute();
    const ro = new ResizeObserver(compute);
    ro.observe(section);
    return () => ro.disconnect();
  }, [sectionRef, cardRefs]);
  return positions;
}

function useImageWidth(src: string, sectionRef: React.RefObject<HTMLElement>) {
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;
    let cancelled = false;
    const img = new Image();
    const calc = () => {
      if (cancelled || !img.naturalHeight) return;
      setWidth(img.naturalWidth * (section.offsetHeight / img.naturalHeight));
    };
    img.onload = calc;
    img.src = src;
    const ro = new ResizeObserver(calc);
    ro.observe(section);
    return () => { cancelled = true; ro.disconnect(); };
  }, [src, sectionRef]);
  return width;
}

function useStaggeredReveal(count: number, threshold = 0.15) {
  const containerRef = useRef<HTMLElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          io.disconnect();
        }
      },
      { threshold }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [threshold]);
  const getAnimStyle = useCallback(
    (index: number): CSSProperties => {
      const d = Math.min(index, count - 1) * 120;
      return {
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(24px)',
        transition: `opacity 0.6s cubic-bezier(0.16,1,0.3,1) ${d}ms, transform 0.6s cubic-bezier(0.16,1,0.3,1) ${d}ms`,
      };
    },
    [visible, count]
  );
  return { containerRef, getAnimStyle };
}

/* ---------- MASKED CARD ---------- */
function MaskedCard({
  bgImage, position, imageWidth, focalX, className = '', children, cardRef, style,
}: {
  bgImage: string;
  position?: MaskPos;
  imageWidth: number;
  focalX: number;
  className?: string;
  children?: ReactNode;
  cardRef?: (el: HTMLDivElement | null) => void;
  style?: CSSProperties;
}) {
  const pos = position ?? { x: 0, y: 0, sw: 0, sh: 0 };
  const overflow = imageWidth > pos.sw ? imageWidth - pos.sw : 0;
  const focalOffset = overflow * focalX;
  return (
    <div
      ref={cardRef}
      className={className}
      style={{
        backgroundImage: `url(${bgImage})`,
        backgroundSize: `auto ${pos.sh}px`,
        backgroundPosition: `-${pos.x + focalOffset}px -${pos.y}px`,
        backgroundRepeat: 'no-repeat',
        ...style,
      }}
    >
      {children}
    </div>
  );
}

/* ---------- SPLASH ---------- */
function SplashScreen({ onComplete }: { onComplete: () => void }) {
  const [count, setCount] = useState(0);
  const [exiting, setExiting] = useState(false);
  useEffect(() => {
    const timers: number[] = [];
    let n = 0;
    const id = window.setInterval(() => {
      n += 1;
      setCount(n);
      if (n >= 100) {
        window.clearInterval(id);
        timers.push(window.setTimeout(() => setExiting(true), 200));
        timers.push(window.setTimeout(onComplete, 900));
      }
    }, 20);
    return () => {
      window.clearInterval(id);
      timers.forEach(window.clearTimeout);
    };
  }, [onComplete]);
  return (
    <div
      className={`fixed inset-0 z-[100] bg-white flex items-end justify-start transition-opacity duration-700 ${
        exiting ? 'opacity-0' : 'opacity-100'
      }`}
    >
      <span className="text-7xl md:text-9xl font-bold tabular-nums p-6 md:p-10 leading-none text-black">
        {count}
      </span>
    </div>
  );
}

/* ---------- NAVBAR ---------- */
function Navbar() {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  const ease = 'ease-[cubic-bezier(0.76,0,0.24,1)]';
  return (
    <>
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 md:px-6 py-2 md:py-3 bg-white/80 backdrop-blur-md">
        <div className="flex flex-col">
          <span className="text-xl md:text-2xl font-extrabold uppercase tracking-tight leading-none">Dental</span>
          <span className="text-xl md:text-2xl font-extrabold uppercase tracking-tight leading-none -mt-1.5 md:-mt-2">Health</span>
          <span className="text-[8px] md:text-[9px] font-medium leading-none mt-1.5 md:mt-2">quality healthcare</span>
        </div>

        <div className="hidden md:flex items-center gap-6">
          <button className="px-6 py-3 bg-white rounded-full border border-black text-sm font-semibold hover:bg-black hover:text-white transition-colors duration-200">
            Menu
          </button>
          <span className="text-sm font-semibold text-black">Dental Emergency</span>
        </div>

        <button
          className="md:hidden w-10 h-10 flex items-center justify-center relative"
          onClick={() => setOpen((o) => !o)}
          aria-label={open ? 'Close menu' : 'Open menu'}
          aria-expanded={open}
        >
          <span className={`absolute h-0.5 w-6 bg-black rounded-full transition-all duration-300 ${ease} ${open ? 'rotate-45 translate-y-0' : '-translate-y-2'}`} />
          <span className={`absolute h-0.5 w-6 bg-black rounded-full transition-all duration-300 ${ease} ${open ? 'opacity-0 scale-x-0' : 'opacity-100 scale-x-100'}`} />
          <span className={`absolute h-0.5 w-6 bg-black rounded-full transition-all duration-300 ${ease} ${open ? '-rotate-45 translate-y-0' : 'translate-y-2'}`} />
        </button>
      </nav>

      <div className={`md:hidden fixed inset-0 z-40 ${open ? 'pointer-events-auto' : 'pointer-events-none'}`}>
        <div
          className={`absolute inset-0 bg-black/20 backdrop-blur-sm transition-opacity duration-500 ${open ? 'opacity-100' : 'opacity-0'}`}
          onClick={() => setOpen(false)}
        />
        <div
          className={`absolute top-0 right-0 h-full w-[85%] max-w-sm bg-white shadow-2xl transition-transform duration-500 ${ease} ${
            open ? 'translate-x-0' : 'translate-x-full'
          }`}
        >
          <div className="flex flex-col justify-center h-full px-8 gap-1">
            {navLinks.map((l, i) => (
              <a
                key={l}
                href={`#${l.toLowerCase()}`}
                onClick={() => setOpen(false)}
                className={`text-4xl font-bold text-black hover:text-neutral-500 transition-all duration-500 ${ease} ${
                  open ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-8'
                }`}
                style={{ transitionDelay: open ? `${100 + i * 60}ms` : '0ms' }}
              >
                {l}
              </a>
            ))}
            <div
              className={`mt-8 pt-8 border-t border-neutral-200 transition-all duration-500 ${ease} ${
                open ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-8'
              }`}
              style={{ transitionDelay: open ? '450ms' : '0ms' }}
            >
              <p className="text-sm font-semibold text-black mb-4">Dental Emergency</p>
              <button className="w-full px-6 py-4 bg-black rounded-full text-white text-sm font-semibold hover:bg-neutral-800 transition-colors duration-200">
                Book Appointment
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

/* ---------- ARROW ---------- */
function Arrow({ className = '' }: { className?: string }) {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className={`rotate-[-45deg] ${className}`}>
      <path d="M1 7h12m0 0L8 2m5 5L8 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/* ---------- APP ---------- */
export default function App() {
  const [showSplash, setShowSplash] = useState(true);
  const handleSplashDone = useCallback(() => setShowSplash(false), []);
  const isMobile = useIsMobile();

  // Section 1
  const section1Ref = useRef<HTMLElement>(null);
  const s1Cards = useRef<(HTMLDivElement | null)[]>([]);
  const s1Pos = useMaskPositions(section1Ref, s1Cards);
  const s1ImgW = useImageWidth(HERO_IMAGE, section1Ref);
  const s1Reveal = useStaggeredReveal(4);
  const s1Focal = isMobile ? 0.7 : 0.8;

  // Section 2
  const section2Ref = useRef<HTMLElement>(null);
  const s2Cards = useRef<(HTMLDivElement | null)[]>([]);
  const s2Pos = useMaskPositions(section2Ref, s2Cards);
  const s2ImgW = useImageWidth(SECTION2_IMAGE, section2Ref);
  const s2Reveal = useStaggeredReveal(4);
  const s2Focal = isMobile ? 0.65 : 0.8;

  // Section 3
  const s3Reveal = useStaggeredReveal(4);

  return (
    <div className="bg-white">
      {showSplash && <SplashScreen onComplete={handleSplashDone} />}
      <Navbar />

      {/* SECTION 1 - HERO */}
      <section
        id="home"
        ref={(el) => {
          (section1Ref as React.MutableRefObject<HTMLElement | null>).current = el;
          (s1Reveal.containerRef as React.MutableRefObject<HTMLElement | null>).current = el;
        }}
        className="relative h-screen w-full overflow-hidden flex flex-col pt-24 md:pt-24 px-3 md:px-5 pb-1.5 md:pb-2 gap-1.5 md:gap-2"
      >
        {featureBars.map((label, i) => (
          <MaskedCard
            key={label}
            bgImage={HERO_IMAGE}
            position={s1Pos[i]}
            imageWidth={s1ImgW}
            focalX={s1Focal}
            cardRef={(el) => { s1Cards.current[i] = el; }}
            style={s1Reveal.getAnimStyle(i)}
            className="w-full h-14 md:h-20 shrink-0 rounded-xl md:rounded-2xl overflow-hidden relative"
          >
            <span className="flex items-center justify-center h-full text-black text-lg md:text-3xl font-bold text-center relative z-10">
              {label}
            </span>
          </MaskedCard>
        ))}

        <MaskedCard
          bgImage={HERO_IMAGE}
          position={s1Pos[3]}
          imageWidth={s1ImgW}
          focalX={s1Focal}
          cardRef={(el) => { s1Cards.current[3] = el; }}
          style={s1Reveal.getAnimStyle(3)}
          className="w-full flex-1 min-h-0 rounded-xl md:rounded-2xl overflow-hidden relative"
        >
          <p className="absolute top-4 left-4 md:top-7 md:left-7 text-black text-xs md:text-sm font-semibold leading-4 md:leading-5 max-w-[200px] md:max-w-[300px] z-10">
            We wish to provide professional dental services <br />
            that match the current technologies
          </p>
          <div className="absolute bottom-5 left-3 md:bottom-8 md:left-4 z-10">
            <span className="block text-black text-xs md:text-sm font-semibold mb-1 md:mb-2">
              Trusted Dentist in West New York
            </span>
            <h1 className="text-black text-[clamp(3rem,11vw,11rem)] font-bold leading-[0.79] tracking-tight">
              Dental <br /> Care
            </h1>
          </div>
          <span className="absolute bottom-6 right-4 md:bottom-10 md:right-8 text-white text-xs md:text-sm font-semibold z-10">
            Free Consultation
          </span>
        </MaskedCard>
      </section>

      {/* SECTION 2 - SMILE GALLERY */}
      <section
        id="gallery"
        ref={(el) => {
          (section2Ref as React.MutableRefObject<HTMLElement | null>).current = el;
          (s2Reveal.containerRef as React.MutableRefObject<HTMLElement | null>).current = el;
        }}
        className="relative min-h-screen md:h-screen w-full overflow-hidden flex flex-col pt-1.5 md:pt-2 px-3 md:px-5 pb-1.5 md:pb-2 gap-1.5 md:gap-2"
      >
        <div className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-2 grid-rows-[auto_auto_auto_auto] md:grid-rows-[1fr_1fr_0.8fr] gap-1.5 md:gap-2">
          {/* Card 0 */}
          <MaskedCard
            bgImage={SECTION2_IMAGE} position={s2Pos[0]} imageWidth={s2ImgW} focalX={s2Focal}
            cardRef={(el) => { s2Cards.current[0] = el; }}
            style={s2Reveal.getAnimStyle(0)}
            className="rounded-xl md:rounded-2xl overflow-hidden relative min-h-[160px] md:min-h-0"
          >
            <h2 className="absolute top-4 left-5 md:top-6 md:left-7 text-white md:text-black text-2xl md:text-3xl font-bold z-10">
              Smile Gallery
            </h2>
            <p className="absolute bottom-4 left-5 md:bottom-6 md:left-7 text-white md:text-black text-xs md:text-sm font-semibold z-10">
              Our cosmetic dental work
            </p>
          </MaskedCard>

          {/* Card 1 */}
          <MaskedCard
            bgImage={SECTION2_IMAGE} position={s2Pos[1]} imageWidth={s2ImgW} focalX={s2Focal}
            cardRef={(el) => { s2Cards.current[1] = el; }}
            style={s2Reveal.getAnimStyle(1)}
            className="md:row-span-2 rounded-xl md:rounded-2xl overflow-hidden relative min-h-[200px] md:min-h-0"
          >
            <p className="absolute bottom-16 left-5 md:bottom-20 md:left-7 text-white text-xs md:text-sm font-semibold leading-4 md:leading-5 z-10">
              If you want a gorgeous smile, <br />
              call us to ask about a smile makeover.
            </p>
            <button className="absolute bottom-4 right-4 md:bottom-6 md:right-6 px-5 py-3 md:px-8 md:py-5 bg-white rounded-full text-black text-base md:text-xl font-bold z-10 hover:scale-105 transition-transform">
              Call Us
            </button>
          </MaskedCard>

          {/* Card 2 */}
          <MaskedCard
            bgImage={SECTION2_IMAGE} position={s2Pos[2]} imageWidth={s2ImgW} focalX={s2Focal}
            cardRef={(el) => { s2Cards.current[2] = el; }}
            style={s2Reveal.getAnimStyle(2)}
            className="rounded-xl md:rounded-2xl overflow-hidden relative min-h-[160px] md:min-h-0"
          >
            <h2 className="absolute top-4 left-5 md:top-6 md:left-7 text-white md:text-black text-[clamp(3rem,7vw,6rem)] font-bold leading-[0.9] z-10">
              Smile <br /> makeover
            </h2>
          </MaskedCard>

          {/* Card 3 - Services */}
          <MaskedCard
            bgImage={SECTION2_IMAGE} position={s2Pos[3]} imageWidth={s2ImgW} focalX={s2Focal}
            cardRef={(el) => { s2Cards.current[3] = el; }}
            style={s2Reveal.getAnimStyle(3)}
            className="col-span-1 md:col-span-2 rounded-xl md:rounded-2xl overflow-hidden relative min-h-[200px] md:min-h-0"
          >
            <div id="services" className="absolute inset-0 z-10 flex flex-wrap md:flex-nowrap gap-1.5 md:gap-2 p-2 md:p-3">
              {services.map((svc) => (
                <div
                  key={svc.name}
                  className={`flex-1 min-w-[calc(50%-4px)] md:min-w-0 rounded-xl md:rounded-2xl p-3 md:p-5 flex flex-col justify-between ${
                    svc.active ? 'bg-white/90 backdrop-blur-md' : 'bg-white/20 backdrop-blur-xl'
                  }`}
                >
                  <h3 className={`text-xl md:text-4xl font-bold leading-[1.05] whitespace-pre-line ${svc.active ? 'text-black' : 'text-white'}`}>
                    {svc.name}
                  </h3>
                  {svc.num && (
                    <span
                      className={`self-end w-8 h-8 md:w-12 md:h-12 rounded-full border flex items-center justify-center text-xs md:text-sm font-semibold ${
                        svc.active ? 'border-black text-black' : 'border-white text-white'
                      }`}
                    >
                      {svc.num}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </MaskedCard>
        </div>
      </section>

      {/* SECTION 3 - IMPLANT DENTISTRY */}
      <section
        id="about"
        ref={s3Reveal.containerRef}
        className="min-h-screen md:h-screen w-full overflow-hidden flex flex-col pt-1.5 md:pt-2 px-3 md:px-5 pb-1.5 md:pb-2 gap-1.5 md:gap-2"
      >
        <div className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-2 gap-1.5 md:gap-2">
          <div className="flex flex-col gap-1.5 md:gap-2">
            <div
              style={s3Reveal.getAnimStyle(0)}
              className="rounded-xl md:rounded-2xl bg-stone-50 p-5 md:p-7 flex flex-col justify-between flex-[1.2] min-h-[180px] md:min-h-0"
            >
              <h2 className="text-[clamp(3rem,7vw,6.5rem)] font-bold leading-[0.95] text-black">
                Implant <br /> Dentistry
              </h2>
              <p className="text-xs md:text-sm font-semibold text-black">Restore Missing Teeth</p>
            </div>

            <div style={s3Reveal.getAnimStyle(1)} className="flex gap-1.5 md:gap-2 flex-1 min-h-[140px] md:min-h-0">
              <div className="flex-1 rounded-xl md:rounded-2xl overflow-hidden">
                <img src={SECTION3_IMG1} alt="Dental implant procedure" className="w-full h-full object-cover" />
              </div>
              <div className="flex-1 rounded-xl md:rounded-2xl overflow-hidden">
                <img src={SECTION3_IMG2} alt="Dental restoration" className="w-full h-full object-cover" />
              </div>
            </div>

            <div
              id="contact"
              style={s3Reveal.getAnimStyle(2)}
              className="rounded-xl md:rounded-2xl bg-zinc-200 p-5 md:p-7 flex items-end justify-between flex-[0.8] min-h-[160px] md:min-h-0"
            >
              <div>
                <p className="text-xs md:text-sm font-semibold text-black mb-2 md:mb-3">Consultation</p>
                <h3 className="text-xl md:text-3xl font-bold text-black leading-6 md:leading-8">
                  Dental <br /> Restoration <br /> Services
                </h3>
              </div>
              <button className="px-5 py-3 md:px-8 md:py-5 bg-white rounded-full text-black text-base md:text-xl font-bold hover:scale-105 transition-transform">
                Book Online
              </button>
            </div>
          </div>

          <div
            style={s3Reveal.getAnimStyle(3)}
            className="rounded-xl md:rounded-2xl overflow-hidden relative min-h-[350px] md:min-h-0"
          >
            <img src={SECTION3_BG} alt="Smiling patient" className="w-full h-full object-cover" />
            <div className="absolute bottom-3 left-3 right-3 md:bottom-5 md:left-5 md:right-5 flex gap-1.5 md:gap-2">
              <div className="flex-1 bg-white rounded-xl md:rounded-2xl p-3 md:p-5 flex flex-col justify-between h-36 md:h-52">
                <h4 className="text-lg md:text-2xl font-bold text-black leading-5 md:leading-7">
                  The Process <br /> of Installing <br /> Implants
                </h4>
                <div className="self-end w-9 h-9 md:w-12 md:h-12 rounded-full border border-black flex items-center justify-center">
                  <Arrow />
                </div>
              </div>
              <div className="flex-1 bg-white/20 backdrop-blur-xl rounded-xl md:rounded-2xl p-3 md:p-5 flex flex-col justify-between h-36 md:h-52">
                <h4 className="text-lg md:text-2xl font-bold text-white leading-5 md:leading-7">
                  Caring <br /> for Dental <br /> Implants
                </h4>
                <div className="self-end w-9 h-9 md:w-12 md:h-12 rounded-full border border-white flex items-center justify-center">
                  <Arrow className="text-white" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
