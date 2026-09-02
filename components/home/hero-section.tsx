"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import type {
  HeroDepartment,
  HeroSlide,
} from "@/lib/db/store-config";
import { selectHeroSlidesForDepartment } from "@/lib/hero-slide-targeting";

interface HeroSectionProps {
  initialSlides: HeroSlide[];
  initialDepartment?: HeroDepartment;
  locked?: boolean;
}

const HERO_DEPARTMENTS: { id: HeroDepartment; label: string }[] = [
  { id: "all", label: "All" },
  { id: "women", label: "Women" },
  { id: "men", label: "Men" },
  { id: "fragrance-beauty", label: "Fragrance & Beauty" },
  { id: "teens", label: "Teens" },
];

function HeroVideo({
  slide,
  isActive,
  onReady,
}: {
  slide: HeroSlide;
  isActive: boolean;
  onReady?: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (isActive) {
      const playPromise = video.play();
      if (playPromise) {
        void playPromise.catch(() => undefined);
      }
    } else {
      video.pause();
    }
  }, [isActive]);

  if (!slide.videoUrl) return null;

  return (
    <video
      ref={videoRef}
      src={slide.videoUrl}
      poster={slide.poster || slide.image || undefined}
      autoPlay={isActive}
      loop
      muted
      playsInline
      preload={isActive ? "auto" : "metadata"}
      onCanPlay={isActive ? onReady : undefined}
      aria-label={slide.title}
      className="h-full w-full object-cover"
    />
  );
}

export function HeroSection({ initialSlides, initialDepartment = "all", locked = false }: HeroSectionProps) {
  const [activeDepartment, setActiveDepartment] =
    useState<HeroDepartment>(initialDepartment);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [mediaPreloadReady, setMediaPreloadReady] = useState(false);
  const transitionTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const slides = useMemo(
    () => selectHeroSlidesForDepartment(initialSlides, activeDepartment),
    [activeDepartment, initialSlides]
  );
  const displayedSlideIndex = Math.min(
    currentSlide,
    Math.max(slides.length - 1, 0)
  );
  const slide = slides[displayedSlideIndex];

  const clearTransition = useCallback(() => {
    if (transitionTimeout.current) {
      clearTimeout(transitionTimeout.current);
      transitionTimeout.current = null;
    }
  }, []);

  const transitionTo = useCallback(
    (change: () => void, duration = 300) => {
      clearTransition();
      setIsTransitioning(true);
      transitionTimeout.current = setTimeout(() => {
        change();
        setIsTransitioning(false);
        transitionTimeout.current = null;
      }, duration);
    },
    [clearTransition]
  );

  const selectDepartment = useCallback(
    (department: HeroDepartment) => {
      if (department === activeDepartment) return;
      transitionTo(() => {
        setMediaPreloadReady(false);
        setActiveDepartment(department);
        setCurrentSlide(0);
      }, 250);
    },
    [activeDepartment, transitionTo]
  );

  useEffect(() => clearTransition, [clearTransition]);

  // Keep this local event listener for homepage promotional controls. Primary
  // catalog navigation routes directly to department pages instead.
  useEffect(() => {
    if (locked) return;
    const handleDepartmentChange = (event: Event) => {
      const department = (event as CustomEvent<{ department?: unknown }>).detail
        ?.department;
      if (HERO_DEPARTMENTS.some((item) => item.id === department)) {
        selectDepartment(department as HeroDepartment);
      }
    };

    window.addEventListener("eman-thread:hero-department", handleDepartmentChange);
    return () =>
      window.removeEventListener("eman-thread:hero-department", handleDepartmentChange);
  }, [selectDepartment, locked]);

  // Auto-advance within the selected department only.
  useEffect(() => {
    if (slides.length <= 1) return;

    const interval = setInterval(() => {
      transitionTo(
        () => setCurrentSlide((previous) => (previous + 1) % slides.length),
        500
      );
    }, 6000);

    return () => clearInterval(interval);
  }, [activeDepartment, slides.length, transitionTo]);

  if (!slide) return null;

  const selectSlide = (index: number) => {
    if (index === displayedSlideIndex) return;
    transitionTo(() => setCurrentSlide(index));
  };

  // Only the active hero is present for first paint. Once it has loaded, keep
  // the adjacent slides warm so transitions stay smooth without downloading
  // every department/slide image on mobile.
  const visibleSlideIndexes = new Set([displayedSlideIndex]);
  if (mediaPreloadReady && slides.length > 1) {
    visibleSlideIndexes.add((displayedSlideIndex + 1) % slides.length);
    visibleSlideIndexes.add(
      (displayedSlideIndex - 1 + slides.length) % slides.length,
    );
  }

  return (
    <section
      data-testid="hero-section"
      className="relative h-[60vh] min-h-[450px] md:h-screen md:min-h-[700px] max-h-[900px] overflow-hidden"
    >
      {/* Background image or video */}
      {slides.map((backgroundSlide, index) => {
        if (!visibleSlideIndexes.has(index)) return null;
        const isActive = displayedSlideIndex === index;
        const isVideo = backgroundSlide.mediaType === "video" && backgroundSlide.videoUrl;

        return (
          <div
            key={`${backgroundSlide.id ?? "legacy"}-${index}`}
            className={cn(
              "absolute inset-0 transition-opacity duration-1000",
              isActive ? "opacity-100" : "opacity-0"
            )}
          >
            {isVideo ? (
              <HeroVideo
                slide={backgroundSlide}
                isActive={isActive}
                onReady={() => setMediaPreloadReady(true)}
              />
            ) : backgroundSlide.image ? (
              <>
                {/* Desktop image (hidden on mobile if mobileImage is set) */}
                <Image
                  src={backgroundSlide.image}
                  alt={backgroundSlide.title}
                  fill
                  priority={isActive && index === 0}
                  loading={isActive && index === 0 ? undefined : "lazy"}
                  sizes="100vw"
                  className={cn(
                    "object-cover",
                    backgroundSlide.mobileImage ? "hidden md:block" : "block"
                  )}
                  onLoad={() => {
                    if (isActive) setMediaPreloadReady(true);
                  }}
                />
                {/* Mobile image (portrait crop) — only shown when provided */}
                {backgroundSlide.mobileImage && (
                  <Image
                    src={backgroundSlide.mobileImage}
                    alt={backgroundSlide.title}
                    fill
                    priority={isActive && index === 0}
                    loading={isActive && index === 0 ? undefined : "lazy"}
                    sizes="100vw"
                    className="object-cover block md:hidden"
                    onLoad={() => {
                      if (isActive) setMediaPreloadReady(true);
                    }}
                  />
                )}
              </>
            ) : null}

          </div>
        );
      })}


      {/* Slide indicators */}
      <div className="absolute bottom-8 left-1/2 z-20 -translate-x-1/2 flex gap-3">
        {slides.map((_, index) => (
          <button
            key={index}
            type="button"
            onClick={() => selectSlide(index)}
            className={cn(
              "h-2 rounded-full transition-all duration-300",
              displayedSlideIndex === index
                ? "w-8 bg-white"
                : "w-2 bg-white/40 hover:bg-white/70"
            )}
          >
            <span className="sr-only">Go to slide {index + 1}</span>
          </button>
        ))}
      </div>
    </section>
  );
}
