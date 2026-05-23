"use client";

import { useState, useEffect } from "react";
import { Star, ChevronDown, ChevronUp, User, Check, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAuthStore } from "@/lib/auth-store";

interface Review {
  id: string;
  rating: number;
  title: string | null;
  comment: string;
  isVerified: boolean;
  createdAt: string;
  user: { name: string };
}

interface ReviewsData {
  reviews: Review[];
  average: number;
  count: number;
}

interface ProductReviewsProps {
  productId: string;
}

export function ProductReviews({ productId }: ProductReviewsProps) {
  const { toast } = useToast();
  const { user, isAuthenticated } = useAuthStore();
  const [reviewsData, setReviewsData] = useState<ReviewsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formRating, setFormRating] = useState(0);
  const [formTitle, setFormTitle] = useState("");
  const [formComment, setFormComment] = useState("");

  useEffect(() => {
    loadReviews();
  }, [productId]);

  const loadReviews = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/products/${productId}/reviews`);
      if (!res.ok) throw new Error("Failed to load");
      const data = await res.json();
      setReviewsData(data);
    } catch {
      // silent fail
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formRating === 0) {
      toast({ title: "Please select a rating", variant: "destructive" });
      return;
    }
    if (!formComment.trim()) {
      toast({ title: "Please write a comment", variant: "destructive" });
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/products/${productId}/reviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rating: formRating,
          title: formTitle || undefined,
          comment: formComment.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast({
          title: data.error || "Failed to submit review",
          variant: "destructive",
        });
        return;
      }

      toast({ title: "Review submitted!" });
      setFormRating(0);
      setFormTitle("");
      setFormComment("");
      setShowForm(false);
      loadReviews();
    } catch {
      toast({ title: "Something went wrong", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const renderStars = (rating: number, interactive = false) => {
    return (
      <div className="flex gap-0.5">
        {Array.from({ length: 5 }, (_, i) => (
          <button
            key={i}
            type={interactive ? "button" : undefined}
            disabled={!interactive}
            onClick={interactive ? () => setFormRating(i + 1) : undefined}
            className={interactive ? "hover:scale-110 transition-transform" : ""}
          >
            <Star
              className={`h-4 w-4 ${
                i < rating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"
              } ${interactive ? "cursor-pointer" : ""}`}
            />
          </button>
        ))}
      </div>
    );
  };

  return (
    <section className="py-12 border-t border-border">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl">
          <h2 className="text-2xl font-semibold mb-6">Customer Reviews</h2>

          {loading ? (
            <div className="animate-pulse space-y-4">
              <div className="h-4 bg-secondary rounded w-1/3" />
              <div className="h-20 bg-secondary rounded" />
              <div className="h-20 bg-secondary rounded" />
            </div>
          ) : reviewsData ? (
            <>
              {/* Summary */}
              <div className="flex items-center gap-4 mb-8 p-4 bg-secondary/30 rounded-lg">
                <div className="text-center">
                  <span className="text-3xl font-bold">{reviewsData.average}</span>
                  <div className="flex justify-center mt-1">
                    {renderStars(Math.round(reviewsData.average))}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {reviewsData.count} review{reviewsData.count !== 1 ? "s" : ""}
                  </p>
                </div>
                <div className="flex-1" />
                {isAuthenticated ? (
                  <Button
                    variant={showForm ? "secondary" : "default"}
                    onClick={() => setShowForm(!showForm)}
                  >
                    {showForm ? (
                      <>Cancel</>
                    ) : (
                      <>Write a Review</>
                    )}
                  </Button>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    <a href="/login" className="text-primary underline">Log in</a> to leave a review
                  </p>
                )}
              </div>

              {/* Review Form */}
              {showForm && (
                <form onSubmit={handleSubmit} className="mb-8 p-6 border border-border rounded-lg bg-background space-y-4">
                  <h3 className="font-semibold text-lg">Write Your Review</h3>
                  
                  <div className="space-y-2">
                    <Label>Rating *</Label>
                    <div className="flex gap-1">
                      {Array.from({ length: 5 }, (_, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => setFormRating(i + 1)}
                          className="hover:scale-110 transition-transform"
                        >
                          <Star
                            className={`h-6 w-6 ${
                              i < formRating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"
                            } cursor-pointer`}
                          />
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="reviewTitle">Title (optional)</Label>
                    <input
                      id="reviewTitle"
                      type="text"
                      value={formTitle}
                      onChange={(e) => setFormTitle(e.target.value)}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      placeholder="Summarize your review"
                      maxLength={200}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="reviewComment">Comment *</Label>
                    <Textarea
                      id="reviewComment"
                      value={formComment}
                      onChange={(e) => setFormComment(e.target.value)}
                      rows={4}
                      placeholder="Share your thoughts about this product..."
                      maxLength={5000}
                    />
                  </div>

                  <Button type="submit" disabled={submitting}>
                    {submitting ? "Submitting..." : "Submit Review"}
                  </Button>
                </form>
              )}

              {/* Reviews List */}
              {reviewsData.reviews.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <MessageSquare className="h-10 w-10 mx-auto mb-2 opacity-30" />
                  <p>No reviews yet. Be the first to review this product!</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {reviewsData.reviews.map((review) => (
                    <div
                      key={review.id}
                      className="p-4 border border-border rounded-lg"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className="h-8 w-8 rounded-full bg-secondary flex items-center justify-center">
                            <User className="h-4 w-4 text-muted-foreground" />
                          </div>
                          <div>
                            <p className="text-sm font-medium">{review.user.name}</p>
                            <div className="flex items-center gap-2">
                              <div className="flex gap-0.5">
                                {renderStars(review.rating)}
                              </div>
                              <span className="text-xs text-muted-foreground">
                                {new Date(review.createdAt).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                        </div>
                        {review.isVerified && (
                          <span className="text-xs text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full flex items-center gap-1">
                            <Check className="h-3 w-3" /> Verified Purchase
                          </span>
                        )}
                      </div>
                      {review.title && (
                        <p className="text-sm font-semibold mt-2">{review.title}</p>
                      )}
                      <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                        {review.comment}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : null}
        </div>
      </div>
    </section>
  );
}