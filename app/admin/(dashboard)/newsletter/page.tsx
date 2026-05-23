"use client";

import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { Mail, Users, Send, Loader2, RefreshCw } from "lucide-react";

interface Subscriber {
  id: string;
  email: string;
  isSubscribed: boolean;
  subscribedAt: string;
  unsubscribedAt: string | null;
  source: string | null;
}

export default function NewsletterPage() {
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [filter, setFilter] = useState<"all" | "subscribed">("all");
  const [loading, setLoading] = useState(false);

  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [recipientFilter, setRecipientFilter] = useState<"all" | "subscribed">("subscribed");
  const [sending, setSending] = useState(false);

  const loadSubscribers = async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/admin/newsletter/subscribers?page=${page}&limit=${limit}&filter=${filter}`
      );
      if (!res.ok) throw new Error("Failed to load subscribers");
      const data = await res.json();
      setSubscribers(data.subscribers || []);
      setTotal(data.total || 0);
    } catch (err) {
      console.error(err);
      toast({ title: "Failed to load subscribers", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleSendCampaign = async () => {
    if (!subject.trim() || !body.trim()) {
      toast({ title: "Subject and body are required", variant: "destructive" });
      return;
    }

    if (!confirm(`Send campaign to ${recipientFilter === "subscribed" ? "subscribed" : "all"} subscribers?`)) {
      return;
    }

    setSending(true);
    try {
      const res = await fetch("/api/admin/newsletter/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject, body, recipientFilter }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast({ title: data.error || "Failed to send campaign", variant: "destructive" });
        return;
      }

      toast({
        title: `Campaign sent! ${data.sent} delivered, ${data.failed} failed.`,
      });
      setSubject("");
      setBody("");
    } catch (err) {
      console.error(err);
      toast({ title: "Failed to send campaign", variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  useEffect(() => {
    loadSubscribers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, filter]);

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Subscribers</CardDescription>
            <CardTitle className="text-3xl flex items-center gap-2">
              <Users className="h-6 w-6 text-primary" />
              {total}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Active Subscribers</CardDescription>
            <CardTitle className="text-3xl flex items-center gap-2">
              <Mail className="h-6 w-6 text-green-500" />
              {subscribers.filter((s) => s.isSubscribed).length}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Page</CardDescription>
            <CardTitle className="text-xl">
              {page} / {totalPages || 1}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Campaign Composer */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Send className="h-5 w-5" />
            Campaign Composer
          </CardTitle>
          <CardDescription>
            Compose and send bulk email campaigns to your subscribers.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-1 block">Subject</label>
            <Input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="e.g. New Summer Collection is here!"
              maxLength={200}
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Body</label>
            <Textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Hello! Check out our latest arrivals..."
              rows={10}
              maxLength={50000}
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Recipients</label>
            <Select
              value={recipientFilter}
              onValueChange={(v: "all" | "subscribed") => setRecipientFilter(v)}
            >
              <SelectTrigger className="w-64">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="subscribed">Subscribed only</SelectItem>
                <SelectItem value="all">All (including unsubscribed)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button
            onClick={handleSendCampaign}
            disabled={sending || !subject.trim() || !body.trim()}
            className="w-full md:w-auto"
          >
            {sending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Send className="mr-2 h-4 w-4" />
                Send Campaign
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Subscribers Table */}
      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <CardTitle>Subscribers</CardTitle>
            <CardDescription>Manage your newsletter subscribers.</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Select
              value={filter}
              onValueChange={(v: "all" | "subscribed") => {
                setFilter(v);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="subscribed">Subscribed</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="icon" onClick={loadSubscribers} disabled={loading}>
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Subscribed</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {subscribers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                      No subscribers found.
                    </TableCell>
                  </TableRow>
                ) : (
                  subscribers.map((sub) => (
                    <TableRow key={sub.id}>
                      <TableCell className="font-medium">{sub.email}</TableCell>
                      <TableCell>
                        <Badge variant={sub.isSubscribed ? "default" : "secondary"}>
                          {sub.isSubscribed ? "Subscribed" : "Unsubscribed"}
                        </Badge>
                      </TableCell>
                      <TableCell className="capitalize">{sub.source || "—"}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {new Date(sub.subscribedAt).toLocaleDateString()}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          {totalPages > 1 && (
            <div className="flex items-center justify-end gap-2 mt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                Previous
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {page} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
              >
                Next
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}