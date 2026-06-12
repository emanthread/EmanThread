"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { Star, Search, Eye, EyeOff, Edit3, Trash2, Loader2, Check, X, MessageSquare, ShieldCheck, ShieldX } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface Review {
  id: string;
  productId: string;
  userId: string;
  rating: number;
  title: string | null;
  comment: string;
  isVisible: boolean;
  isVerified: boolean;
  createdAt: string;
  user: { id: string; name: string; email: string };
  product: { id: string; name: string; sku: string; images: string };
}

export default function AdminReviewsPage() {
  const { toast } = useToast();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [editDialog, setEditDialog] = useState<Review | null>(null);
  const [editComment, setEditComment] = useState("");
  const [saving, setSaving] = useState(false);

  const loadReviews = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: "20" });
      if (search) params.set("search", search);
      const res = await fetch(`/api/admin/reviews?${params}`);
      if (!res.ok) throw new Error("Failed to load");
      const data = await res.json();
      setReviews(data.reviews || []);
      setTotal(data.total || 0);
      setTotalPages(data.totalPages || 1);
    } catch (err) {
      console.error("Load reviews error:", err);
      toast({ title: "Error", description: "Could not load reviews", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [page, search, toast]);

  useEffect(() => {
    loadReviews();
  }, [loadReviews]);

  const handleToggleVisibility = async (review: Review) => {
    try {
      const res = await fetch(`/api/admin/reviews/${review.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isVisible: !review.isVisible }),
      });
      if (!res.ok) throw new Error("Failed to update");
      toast({
        title: "Review updated",
        description: `Review is now ${!review.isVisible ? "visible" : "hidden"}.`,
      });
      loadReviews();
    } catch {
      toast({ title: "Error", description: "Failed to update review", variant: "destructive" });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/reviews/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      toast({ title: "Review deleted", description: "The review has been removed." });
      setDeleteConfirm(null);
      loadReviews();
    } catch {
      toast({ title: "Error", description: "Failed to delete review", variant: "destructive" });
    }
  };

  const handleEditOpen = (review: Review) => {
    setEditDialog(review);
    setEditComment(review.comment);
  };

  const handleEditSave = async () => {
    if (!editDialog) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/reviews/${editDialog.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ comment: editComment }),
      });
      if (!res.ok) throw new Error("Failed to update");
      toast({ title: "Review updated", description: "Comment has been edited." });
      setEditDialog(null);
      loadReviews();
    } catch {
      toast({ title: "Error", description: "Failed to update review", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleToggleVerified = async (review: Review) => {
    try {
      const res = await fetch(`/api/admin/reviews/${review.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isVerified: !review.isVerified }),
      });
      if (!res.ok) throw new Error("Failed to update");
      toast({
        title: "Verification updated",
        description: `Review is now ${!review.isVerified ? "verified" : "unverified"}.`,
      });
      loadReviews();
    } catch {
      toast({ title: "Error", description: "Failed to update verification", variant: "destructive" });
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    loadReviews();
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`h-3.5 w-3.5 ${i < rating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"}`}
      />
    ));
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Product Reviews</h1>
          <p className="text-muted-foreground">
            Manage customer reviews and comments ({total} total)
          </p>
        </div>
      </div>

      {/* Search */}
      <form onSubmit={handleSearch} className="flex gap-2 max-w-md">
        <Input
          placeholder="Search by user or comment..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <Button type="submit" variant="secondary" size="icon">
          <Search className="h-4 w-4" />
        </Button>
      </form>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-medium">All Reviews</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : reviews.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>No reviews found.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead className="hidden sm:table-cell">User</TableHead>
                  <TableHead className="hidden sm:table-cell">Rating</TableHead>
                  <TableHead>Comment</TableHead>
                  <TableHead className="hidden sm:table-cell">Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reviews.map((review) => {
                  let images: string[] = [];
                  try { images = JSON.parse(review.product.images); } catch { images = []; }
                  return (
                    <TableRow key={review.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="relative h-10 w-10 rounded bg-secondary overflow-hidden shrink-0">
                            {images[0] && (
                              <Image
                                src={images[0]}
                                alt={review.product.name}
                                fill
                                className="object-cover"
                              />
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate max-w-[200px]">
                              {review.product.name}
                            </p>
                            <p className="text-xs text-muted-foreground">Code: {review.product.sku}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <p className="text-sm font-medium">{review.user.name}</p>
                        <p className="text-xs text-muted-foreground">{review.user.email}</p>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <div className="flex gap-0.5">{renderStars(review.rating)}</div>
                        {review.isVerified && (
                          <Badge variant="secondary" className="text-[10px] px-1 mt-1">
                            <Check className="h-3 w-3 mr-0.5" /> Verified
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="max-w-[300px]">
                        {review.title && (
                          <p className="text-xs font-semibold mb-0.5">{review.title}</p>
                        )}
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {review.comment}
                        </p>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground whitespace-nowrap hidden sm:table-cell">
                        {new Date(review.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="space-y-1">
                        <Badge variant={review.isVisible ? "default" : "secondary"} className="block w-fit">
                          {review.isVisible ? "Visible" : "Hidden"}
                        </Badge>
                        <Badge variant={review.isVerified ? "outline" : "secondary"} className={cn("block w-fit", review.isVerified && "border-green-500 text-green-600")}>
                          {review.isVerified ? "Verified" : "Unverified"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleToggleVisibility(review)}
                            title={review.isVisible ? "Hide review" : "Show review"}
                          >
                            {review.isVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEditOpen(review)}
                            title="Edit comment"
                          >
                            <Edit3 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleToggleVerified(review)}
                            title={review.isVerified ? "Mark as unverified" : "Mark as verified"}
                          >
                            {review.isVerified ? <ShieldCheck className="h-4 w-4 text-green-600" /> : <ShieldX className="h-4 w-4 text-muted-foreground" />}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setDeleteConfirm(review.id)}
                            className="text-red-600"
                            title="Delete review"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage(page - 1)}
          >
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => setPage(page + 1)}
          >
            Next
          </Button>
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={!!editDialog} onOpenChange={(open) => !open && setEditDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Review Comment</DialogTitle>
            <DialogDescription>
              Modify the review comment. Rating and title remain unchanged.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {editDialog && (
              <>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">Rating:</span>
                  <div className="flex gap-0.5">{renderStars(editDialog.rating)}</div>
                </div>
                {editDialog.title && (
                  <div>
                    <span className="text-sm font-medium">Title:</span>
                    <p className="text-sm text-muted-foreground">{editDialog.title}</p>
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="editComment">Comment</Label>
                  <Textarea
                    id="editComment"
                    value={editComment}
                    onChange={(e) => setEditComment(e.target.value)}
                    rows={4}
                  />
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialog(null)}>
              Cancel
            </Button>
            <Button onClick={handleEditSave} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
    </div>
  );
}