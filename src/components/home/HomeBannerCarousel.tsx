"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ShieldCheck, Sparkles, Truck } from "lucide-react";

type BannerSlide = {
  eyebrow: string;
  title: string;
  description: string;
  cta: string;
  href: string;
  image?: string;
  theme: "care" | "delivery" | "mint" | "offer" | "wellness" | "home" | "personal";
  marathi?: string;
};

type Props = {
  careHref: string;
  dailyHref: string;
  wellnessHref: string;
  homeCareHref: string;
  personalCareHref: string;
  highestPercentOff: number | null;
};

/**
 * A deliberately small, touch-friendly campaign carousel. Cards remain fully
 * swipeable; auto-advance pauses while a customer is interacting so it never
 * fights a manual swipe.
 */
export function HomeBannerCarousel({
  careHref,
  dailyHref,
  wellnessHref,
  homeCareHref,
  personalCareHref,
  highestPercentOff,
}: Props) {
  const slides: BannerSlide[] = [
    {
      eyebrow: "Free home delivery",
      title: "Care & essentials, close to home.",
      description: "Trusted products for your everyday needs.",
      cta: "Shop now",
      href: careHref,
      theme: "care",
      marathi: "आम्ही घेऊ तुमच्या आरोग्याची काळजी",
    },
    {
      eyebrow: "Free delivery, every order",
      title: "Free delivery, right to your door.",
      description: "Every order comes home with no delivery fee.",
      cta: "Start shopping",
      href: "/categories",
      image: "/home/free-home-delivery-banner.png",
      theme: "delivery",
      marathi: "तुमच्या दारात, अगदी मोफत.",
    },
    {
      eyebrow: "Everyday essentials",
      title: "Your everyday list, sorted.",
      description: "Pantry, personal care and home essentials in one place.",
      cta: "Explore essentials",
      href: dailyHref,
      image: "/home/daily-essentials-banner.png",
      theme: "mint",
      marathi: "घरबसल्या ऑर्डर करा",
    },
    {
      eyebrow: highestPercentOff ? `Up to ${highestPercentOff}% off` : "Special offers",
      title: highestPercentOff ? "Smart savings, picked for you." : "Fresh savings are on the way.",
      description: highestPercentOff
        ? "Shop the best current offers, ranked by your saving."
        : "Check back soon for store offers on everyday favourites.",
      cta: "View offers",
      href: "/offers",
      image: "/home/offer-banner.png",
      theme: "offer",
      marathi: "बचत करा, अधिक खरेदी करा.",
    },
    {
      eyebrow: "Wellness at home",
      title: "Small essentials. Everyday care.",
      description: "Browse health and wellness essentials with ease.",
      cta: "Explore wellness",
      href: wellnessHref,
      image: "/home/wellness-banner.png",
      theme: "wellness",
      marathi: "आरोग्याची काळजी, घरबसल्या.",
    },
    {
      eyebrow: "For a fresher home",
      title: "Home care made simple.",
      description: "Useful household basics, ready when you are.",
      cta: "Shop home care",
      href: homeCareHref,
      image: "/home/home-care-banner.png",
      theme: "home",
      marathi: "घरासाठी आवश्यक सर्व काही.",
    },
    {
      eyebrow: "A little everyday care",
      title: "Personal care, made easy.",
      description: "Find the familiar essentials your routine needs.",
      cta: "Explore personal care",
      href: personalCareHref,
      image: "/home/personal-care-banner.png",
      theme: "personal",
      marathi: "दररोजची काळजी, सहज.",
    },
  ];

  const trackRef = useRef<HTMLDivElement>(null);
  const resumeTimerRef = useRef<number | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  function scrollToSlide(index: number) {
    const track = trackRef.current;
    const target = track?.querySelector<HTMLElement>(`[data-slide-index="${index}"]`);
    if (!track || !target) return;

    // Scrolling the track directly keeps the customer's page position intact.
    track.scrollTo({ left: target.offsetLeft, behavior: "smooth" });
  }

  function goTo(index: number) {
    scrollToSlide(index);
    setActiveIndex(index);
  }

  function pauseTemporarily() {
    setPaused(true);
    if (resumeTimerRef.current) window.clearTimeout(resumeTimerRef.current);
    resumeTimerRef.current = window.setTimeout(() => setPaused(false), 8000);
  }

  useEffect(() => {
    if (paused || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const timer = window.setInterval(() => {
      setActiveIndex((current) => {
        const next = (current + 1) % slides.length;
        scrollToSlide(next);
        return next;
      });
    }, 5000);

    return () => window.clearInterval(timer);
  }, [paused, slides.length]);

  useEffect(() => {
    return () => {
      if (resumeTimerRef.current) window.clearTimeout(resumeTimerRef.current);
    };
  }, []);

  function updateActiveFromScroll() {
    const track = trackRef.current;
    if (!track) return;

    const cards = Array.from(track.querySelectorAll<HTMLElement>("[data-slide-index]"));
    const nearest = cards.reduce(
      (closest, card, index) => {
        const distance = Math.abs(card.offsetLeft - track.scrollLeft);
        return distance < closest.distance ? { index, distance } : closest;
      },
      { index: 0, distance: Number.POSITIVE_INFINITY },
    );
    setActiveIndex(nearest.index);
  }

  return (
    <section aria-label="Shilpa highlights" className="-mx-2 overflow-hidden sm:mx-0">
      <div
        ref={trackRef}
        onScroll={updateActiveFromScroll}
        onPointerDown={pauseTemporarily}
        onFocus={pauseTemporarily}
        className="flex snap-x snap-mandatory gap-3 overflow-x-auto px-2 pb-2 scrollbar-none sm:px-0"
      >
        {slides.map((slide, index) => (
          <Link
            key={slide.title}
            href={slide.href}
            data-slide-index={index}
            aria-label={`${slide.title}. ${slide.cta}`}
            className={`home-banner-${slide.theme} group relative min-h-[204px] w-[88%] shrink-0 snap-start overflow-hidden rounded-[1.5rem] p-5 shadow-[0_12px_28px_rgba(89,58,38,0.15)] sm:w-[470px]`}
          >
            {slide.image && (
              <Image
                src={slide.image}
                alt=""
                fill
                priority={index < 2}
                sizes="(max-width: 640px) 88vw, 470px"
                className="object-cover object-center"
              />
            )}
            {slide.image && <div className="absolute inset-0 bg-gradient-to-r from-white/96 via-white/78 to-white/5" />}
            {slide.theme === "care" && (
              <>
                <div className="absolute -right-12 -top-12 h-44 w-44 rounded-full bg-[#f57f17]/25" />
                <div className="absolute -bottom-10 right-4 h-32 w-32 rounded-full bg-[#e9252b]/12" />
                <Image
                  src="/brand/shilpa-chemists-trust-seal.png"
                  alt="Shilpa Chemist — genuine and authentic medicines"
                  width={1254}
                  height={1254}
                  className="absolute bottom-3 right-3 h-24 w-24 rotate-6 object-contain drop-shadow-[0_8px_12px_rgba(127,28,22,0.24)] transition-transform duration-300 group-hover:rotate-0 sm:h-28 sm:w-28"
                  priority
                />
              </>
            )}
            <div className="relative z-10 max-w-[64%]">
              <span className="inline-flex items-center gap-1 rounded-full bg-[#e9252b] px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-white shadow-sm">
                {slide.theme === "care" ? <Truck size={12} strokeWidth={2.8} /> : slide.theme === "offer" ? <Sparkles size={12} strokeWidth={2.8} /> : <ShieldCheck size={12} strokeWidth={2.8} />}
                {slide.eyebrow}
              </span>
              {index === 0 ? (
                <h1 className="mt-3 font-heading text-[1.62rem] font-semibold leading-[1.04] tracking-tight text-[#34201b] sm:text-3xl">
                  {slide.title}
                </h1>
              ) : (
                <h2 className="mt-3 font-heading text-[1.62rem] font-semibold leading-[1.04] tracking-tight text-[#34201b] sm:text-3xl">
                  {slide.title}
                </h2>
              )}
              <p className="mt-2 text-xs font-medium leading-relaxed text-[#62463b]">{slide.description}</p>
              {slide.marathi && <p className="font-marathi mt-1 text-[12px] font-semibold text-[#b72b23]">{slide.marathi}</p>}
              <span className="mt-3 inline-flex items-center gap-1 text-xs font-extrabold text-[#9f2d22]">
                {slide.cta} <ArrowRight size={14} strokeWidth={2.8} />
              </span>
            </div>
          </Link>
        ))}
      </div>

      <div className="mt-1.5 flex justify-center gap-1.5" aria-label="Carousel position">
        {slides.map((slide, index) => (
          <button
            key={slide.title}
            type="button"
            onClick={() => goTo(index)}
            aria-label={`Show ${slide.title}`}
            aria-current={index === activeIndex ? "true" : undefined}
            className={`h-1.5 rounded-full transition-all ${index === activeIndex ? "w-5 bg-[#df3e31]" : "w-1.5 bg-[#d9c6b9] hover:bg-[#c5a997]"}`}
          />
        ))}
      </div>
    </section>
  );
}
