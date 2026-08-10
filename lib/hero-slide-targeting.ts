import type { HeroDepartment, HeroSlide } from "@/lib/db/store-config";

/**
 * Pick the slides for one hero context. Department-specific slides take
 * precedence over shared slides. A department must never fall through to a
 * different department's creative when neither applies.
 */
export function selectHeroSlidesForDepartment(
  slides: HeroSlide[],
  department: HeroDepartment
): HeroSlide[] {
  const sharedSlides = slides.filter(
    (slide) => (slide.department ?? "all") === "all"
  );

  if (department === "all") {
    return sharedSlides.length > 0 ? sharedSlides : slides;
  }

  const dedicatedSlides = slides.filter(
    (slide) => slide.department === department
  );

  return dedicatedSlides.length > 0 ? dedicatedSlides : sharedSlides;
}
