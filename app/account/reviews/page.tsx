"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { Star, MessageSquare, ChevronLeft, Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { CartDrawer } from "@/components/cart/cart-drawer";
import { useToast } from "@/hooks/use-toast";

interface Review {
  id: string;
  productId: string;
  rating: number;
  title: string | null;
  comment: string;
  isVisible: boolean;
  isVerified: boolean;
  createdAt: string;
  product: { id: string; name: string; sku: string; images: string };
}

export default function MyReviewsPage() {
  const { toast } = useToast();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  useEffect(() => {
    loadReviews();
  }, []);

  const loadReviews = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/user/reviews");
      if (!res.ok) throw new Error("Failed to load");
      const data = await res.json();
      setReviews(data);
    } catch {
      toast({ title: "Error", description: "Could not load your reviews", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/user/reviews/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      toast({ title: "Review deleted" });
      setDeleteConfirm(null);
      loadReviews();
    } catch {
      toast({ title: "Error", description: "Failed to delete review", variant: "destructive" });
    }
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`h-4 w-4 ${i < rating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"}`}
      />
    ));
  };

  return (
    <>
      <Header />
      <CartDrawer />

      <main className="min-h-screen bg-muted/30 pt-28 pb-16">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          {/* Back link */}
          <Link
            href="/account"
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6"
          >
            <ChevronLeft className="h-4 w-4" />
            Back to Account
          </Link>

          <h1 className="text-2xl font-semibold mb-6">My Reviews</h1>

          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : reviews.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center py-16 text-muted-foreground">
                <MessageSquare className="h-12 w-12 mb-3 opacity-30" />
                <p className="text-lg font-medium">No reviews yet</p>
                <p className="text-sm mt-1">Your product reviews will appear here.</p>
                <Button asChild className="mt-4" variant="outline">
                  <Link href="/shop">Browse Products</Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {reviews.map((review) => {
                let images: string[] = [];
                try { images = JSON.parse(review.product.images); } catch { images = []; }
                return (
                  <Card key={review.id}>
                    <CardContent className="p-4">
                      <div className="flex items-start gap-4">
                        <Link href={`/product/${review.product.id}`} className="shrink-0">
                          <div className="relative h-16 w-16 rounded bg-secondary overflow-hidden">
                            {images[0] && (
                              <Image
                                src={images[0]}
                                alt={review.product.name}
                                fill
                                className="object-cover"
                              />
                            )}
                          </div>
                        </Link>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <Link
                                href={`/product/${review.product.id}`}
                                className="text-sm font-medium hover:underline"
                              >
                                {review.product.name}
                              </Link>
                              <p className="text-xs text-muted-foreground">Code: {review.product.sku}</p>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              {review.isVerified && (
                                <Badge variant="outline" className="text-[10px] border-green-500 text-green-600">
                                  Verified
                                </Badge>
                              )}
                              <Badge variant={review.isVisible ? "secondary" : "outline"} className="text-[10px]">
                                {review.isVisible ? "Published" : "Hidden"}
                              </Badge>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 mt-2">
                            <div className="flex">{renderStars(review.rating)}</div>
                            <span className="text-xs text-muted-foreground">
                              {new Date(review.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                          {review.title && (
                            <p className="text-sm font-semibold mt-2">{review.title}</p>
                          )}
                          <p className="text-sm text-muted-foreground mt-1">{review.comment}</p>
                          <div className="mt-3">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-red-600 h-8 px-2"
                              onClick={() => setDeleteConfirm(review.id)}
                            >
                              <Trash2 className="h-4 w-4 mr-1" />
                              Delete
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteConfirm} onOpenChange={(open) => !open && setDeleteConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Review</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this review? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteConfirm && handleDelete(deleteConfirm)}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Footer />
    </>
  );
}