"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type {
  HeroDepartment,
  HeroSlide,
} from "@/lib/db/store-config";

interface HeroSectionProps {
  initialSlides: HeroSlide[];
}

const HERO_DEPARTMENTS: { id: HeroDepartment; label: string }[] = [
  { id: "all", label: "All" },
  { id: "women", label: "Women" },
  { id: "men", label: "Men" },
  { id: "fragrance-beauty", label: "Fragrance & Beauty" },
  { id: "teens", label: "Teens" },
];

function getDepartmentSlides(
  slides: HeroSlide[],
  department: HeroDepartment
) {
  const sharedSlides = slides.filter(
    (slide) => (slide.department ?? "all") === "all"
  );

  if (department === "all") {
    return sharedSlides.length > 0 ? sharedSlides : slides;
  }

  const dedicatedSlides = slides.filter(
    (slide) => slide.department === department
  );

  // A department without its own slide keeps using the shared hero set. This
  // lets admins add categories gradually without ever leaving the hero blank.
  return dedicatedSlides.length > 0
    ? dedicatedSlides
    : sharedSlides.length > 0
      ? sharedSlides
      : slides;
}

function HeroVideo({
  slide,
  isActive,
}: {
  slide: HeroSlide;
  isActive: boolean;
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
      aria-label={slide.title}
      className="h-full w-full object-cover"
    />
  );
}

export function HeroSection({ initialSlides }: HeroSectionProps) {
  const [activeDepartment, setActiveDepartment] =
    useState<HeroDepartment>("all");
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const transitionTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const slides = useMemo(
    () => getDepartmentSlides(initialSlides, activeDepartment),
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
  }, [selectDepartment]);

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

  return (
    <section className="relative h-[60vh] min-h-[450px] md:h-screen md:min-h-[700px] max-h-[900px] overflow-hidden">
      {/* Background image or video */}
      {slides.map((backgroundSlide, index) => {
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
              <HeroVideo slide={backgroundSlide} isActive={isActive} />
            ) : backgroundSlide.image ? (
              <Image
                src={backgroundSlide.image}
                alt={backgroundSlide.title}
                fill
                priority={index === 0 && activeDepartment === "all"}
                loading={index === 0 && activeDepartment === "all" ? undefined : "lazy"}
                sizes="100vw"
                className="object-cover"
              />
            ) : null}
            <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/55 to-black/20" />
          </div>
        );
      })}

      {/* Content */}
      <div className="relative h-full mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex items-center">
        <div
          className={cn(
            "max-w-xl transition-all duration-500",
            isTransitioning
              ? "opacity-0 translate-y-4"
              : "opacity-100 translate-y-0"
          )}
        >
          <p className="text-sm tracking-[0.3em] uppercase text-white/85 mb-4">
            {slide.subtitle}
          </p>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-semibold text-white leading-tight text-balance drop-shadow-sm">
            {slide.title}
          </h1>
          <p className="mt-6 text-lg text-white/85 leading-relaxed max-w-md">
            {slide.description}
          </p>
          <div className="mt-8 flex flex-wrap gap-4">
            <Button
              size="lg"
              className="bg-primary-foreground text-foreground hover:bg-primary-foreground/90 group"
              asChild
            >
              <Link href={slide.link}>
                {slide.cta}
                <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="border-white/70 bg-black/25 text-white hover:bg-white/15 hover:border-white"
              asChild
            >
              <Link href="/women">View Collections</Link>
            </Button>
          </div>
        </div>
      </div>

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
