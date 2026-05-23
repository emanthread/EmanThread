"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, Quote } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const testimonials = [
  {
    id: 1,
    name: "Ahmed Hassan",
    location: "Karachi",
    quote:
      "The quality of fabric is exceptional. I&apos;ve been buying from Emaan Thread for years and they never disappoint. The wash & wear collection is perfect for our climate.",
    rating: 5,
  },
  {
    id: 2,
    name: "Bilal Khan",
    location: "Lahore",
    quote:
      "Outstanding service and premium quality fabrics. The Boski collection is simply magnificent - the drape and sheen are unmatched. Highly recommended!",
    rating: 5,
  },
  {
    id: 3,
    name: "Usman Ali",
    location: "Islamabad",
    quote:
      "Emaan Thread has become my go-to for all fabric needs. The cotton collection is breathable and comfortable, perfect for everyday wear. Excellent value for money.",
    rating: 5,
  },
];

export function TestimonialsSection() {
  const [currentIndex, setCurrentIndex] = useState(0);

  const nextTestimonial = () => {
    setCurrentIndex((prev) => (prev + 1) % testimonials.length);
  };

  const prevTestimonial = () => {
    setCurrentIndex(
      (prev) => (prev - 1 + testimonials.length) % testimonials.length
    );
  };

  return (
    <section className="py-20 lg:py-28 bg-secondary/30">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-12">
          <p className="text-sm tracking-[0.3em] uppercase text-muted-foreground mb-3">
            Customer Stories
          </p>
          <h2 className="text-3xl sm:text-4xl font-semibold">
            What Our Customers Say
          </h2>
        </div>

        {/* Testimonial */}
        <div className="relative">
          <Quote className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 h-12 w-12 text-accent/30" />

          <div className="text-center pt-8">
            <p className="text-xl sm:text-2xl font-light leading-relaxed italic text-foreground/90 max-w-3xl mx-auto">
              &quot;{testimonials[currentIndex].quote}&quot;
            </p>

            <div className="mt-8">
              <p className="font-semibold text-lg">
                {testimonials[currentIndex].name}
              </p>
              <p className="text-muted-foreground">
                {testimonials[currentIndex].location}
              </p>

              {/* Stars */}
              <div className="flex justify-center gap-1 mt-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <svg
                    key={i}
                    className={cn(
                      "h-5 w-5",
                      i < testimonials[currentIndex].rating
                        ? "text-accent fill-accent"
                        : "text-muted-foreground"
                    )}
                    viewBox="0 0 20 20"
                  >
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>
            </div>
          </div>

          {/* Navigation */}
          <div className="flex justify-center gap-4 mt-10">
            <Button
              variant="outline"
              size="icon"
              onClick={prevTestimonial}
              className="rounded-full"
            >
              <ChevronLeft className="h-5 w-5" />
              <span className="sr-only">Previous testimonial</span>
            </Button>

            {/* Dots */}
            <div className="flex items-center gap-2">
              {testimonials.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentIndex(index)}
                  className={cn(
                    "w-2 h-2 rounded-full transition-all",
                    currentIndex === index
                      ? "w-6 bg-accent"
                      : "bg-border hover:bg-muted-foreground"
                  )}
                >
                  <span className="sr-only">Go to testimonial {index + 1}</span>
                </button>
              ))}
            </div>

            <Button
              variant="outline"
              size="icon"
              onClick={nextTestimonial}
              className="rounded-full"
            >
              <ChevronRight className="h-5 w-5" />
              <span className="sr-only">Next testimonial</span>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
