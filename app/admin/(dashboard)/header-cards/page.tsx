"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  ExternalLink,
  ImageIcon,
  Loader2,
  Plus,
  Save,
  Trash2,
  Upload,
} from "lucide-react";

import { useAdminUnsavedChanges } from "@/components/admin/unsaved-changes-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";
import { adminFetch, adminResponseError } from "@/lib/admin-fetch";
import {
  MAX_HEADER_CARDS_PER_CONTEXT,
  type CatalogHeaderCard,
  type CatalogHeaderCardContext,
  type CatalogHeaderDestination,
} from "@/lib/navigation/catalog-header-cards";

type EditorPayload = {
  contexts: CatalogHeaderCardContext[];
  destinations: CatalogHeaderDestination[];
};

function normalizeContexts(contexts: CatalogHeaderCardContext[]) {
  return contexts.map((context) => ({
    ...context,
    cards: context.cards.map((card, index) => ({ ...card, order: index + 1 })),
  }));
}

function snapshot(contexts: CatalogHeaderCardContext[]) {
  return JSON.stringify(normalizeContexts(contexts));
}

function CardImageEditor({
  card,
  onChange,
}: {
  card: CatalogHeaderCard;
  onChange: (patch: Partial<CatalogHeaderCard>) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const upload = async (file: File) => {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const response = await adminFetch("/api/admin/upload", {
        method: "POST",
        body: formData,
      });
      if (!response.ok) throw await adminResponseError(response, "Image upload failed");
      const data = (await response.json()) as { url?: string };
      if (!data.url) throw new Error("The upload did not return an image URL");
      onChange({ image: data.url });
      toast({ title: "Image uploaded" });
    } catch (error) {
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-2">
      <Label>Image</Label>
      <div className="relative aspect-[3/4] w-full max-w-[210px] overflow-hidden rounded-md border bg-muted">
        {card.image ? (
          <Image src={card.image} alt="Card preview" fill className="object-cover" sizes="210px" />
        ) : (
          <div className="flex h-full items-center justify-center text-muted-foreground">
            <ImageIcon className="h-8 w-8" />
          </div>
        )}
        {uploading ? (
          <div className="absolute inset-0 flex items-center justify-center bg-black/45">
            <Loader2 className="h-7 w-7 animate-spin text-white" />
          </div>
        ) : null}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="sr-only"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void upload(file);
        }}
      />
      <div className="flex max-w-xl gap-2">
        <Button type="button" variant="outline" size="sm" disabled={uploading} onClick={() => inputRef.current?.click()}>
          <Upload className="mr-2 h-4 w-4" /> Upload image
        </Button>
        <Input
          value={card.image}
          onChange={(event) => onChange({ image: event.target.value })}
          placeholder="/images/... or an approved image URL"
          className="font-mono text-xs"
        />
      </div>
    </div>
  );
}

export default function HeaderCardsPage() {
  const [contexts, setContexts] = useState<CatalogHeaderCardContext[]>([]);
  const [destinations, setDestinations] = useState<CatalogHeaderDestination[]>([]);
  const [selectedContextId, setSelectedContextId] = useState("");
  const [baseline, setBaseline] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { setHasUnsavedChanges } = useAdminUnsavedChanges();

  useEffect(() => {
    let active = true;
    adminFetch(`/api/admin/header-cards?_t=${Date.now()}`, { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw await adminResponseError(response, "Could not load header cards");
        return (await response.json()) as EditorPayload;
      })
      .then((payload) => {
        if (!active) return;
        const next = normalizeContexts(payload.contexts);
        setContexts(next);
        setDestinations(payload.destinations);
        setSelectedContextId(next[0]?.id ?? "");
        setBaseline(snapshot(next));
      })
      .catch((error) => {
        if (!active) return;
        toast({
          title: "Header cards could not be loaded",
          description: error instanceof Error ? error.message : "Please refresh and try again.",
          variant: "destructive",
        });
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
      setHasUnsavedChanges(false);
    };
  }, [setHasUnsavedChanges]);

  const isDirty = Boolean(baseline) && snapshot(contexts) !== baseline;
  useEffect(() => setHasUnsavedChanges(isDirty), [isDirty, setHasUnsavedChanges]);

  const selectedContext = contexts.find(({ id }) => id === selectedContextId) ?? contexts[0];
  const contextDestinations = useMemo(
    () =>
      destinations.filter(
        (destination) => destination.departmentId === selectedContext?.departmentId,
      ),
    [destinations, selectedContext?.departmentId],
  );

  const updateCards = (cards: CatalogHeaderCard[]) => {
    if (!selectedContext) return;
    const orderedCards = cards.map((card, index) => ({ ...card, order: index + 1 }));
    setContexts((current) =>
      current.map((context) =>
        context.id === selectedContext.id
          ? {
              ...context,
              cards: orderedCards,
              customized: true,
            }
          : context.inheritFromContextId === selectedContext.id && !context.customized
            ? { ...context, cards: orderedCards.map((card) => ({ ...card })) }
          : context,
      ),
    );
  };

  const restoreDefault = () => {
    if (!selectedContext) return;
    setContexts((current) => {
      const inheritedCards = selectedContext.inheritFromContextId
        ? current.find(({ id }) => id === selectedContext.inheritFromContextId)?.cards
        : null;
      const restoredCards = (inheritedCards ?? selectedContext.defaultCards).map(
        (card, index) => ({ ...card, order: index + 1 }),
      );
      return current.map((context) =>
        context.id === selectedContext.id
          ? { ...context, cards: restoredCards, customized: false }
          : context.inheritFromContextId === selectedContext.id && !context.customized
            ? { ...context, cards: restoredCards.map((card) => ({ ...card })) }
            : context,
      );
    });
  };

  const updateCard = (index: number, patch: Partial<CatalogHeaderCard>) => {
    if (!selectedContext) return;
    updateCards(selectedContext.cards.map((card, cardIndex) => (cardIndex === index ? { ...card, ...patch } : card)));
  };

  const moveCard = (index: number, direction: -1 | 1) => {
    if (!selectedContext) return;
    const target = index + direction;
    if (target < 0 || target >= selectedContext.cards.length) return;
    const cards = [...selectedContext.cards];
    [cards[index], cards[target]] = [cards[target], cards[index]];
    updateCards(cards);
  };

  const addCard = () => {
    if (!selectedContext || selectedContext.cards.length >= MAX_HEADER_CARDS_PER_CONTEXT) return;
    const destination = contextDestinations[0];
    if (!destination) return;
    updateCards([
      ...selectedContext.cards,
      {
        id: `admin-card-${crypto.randomUUID()}`,
        title: "New card",
        subtitle: "",
        cta: "Shop now",
        image: "/placeholder.jpg",
        destinationId: destination.id,
        order: selectedContext.cards.length + 1,
        visible: true,
      },
    ]);
  };

  const save = async () => {
    setSaving(true);
    try {
      const contextMap = Object.fromEntries(
        normalizeContexts(contexts)
          .filter((context) => context.customized)
          .map((context) => [context.id, context.cards]),
      );
      const response = await adminFetch("/api/admin/header-cards", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contexts: contextMap }),
      });
      if (!response.ok) throw await adminResponseError(response, "Could not save header cards");
      const payload = (await response.json()) as { contexts: CatalogHeaderCardContext[] };
      const next = normalizeContexts(payload.contexts);
      setContexts(next);
      setBaseline(snapshot(next));
      setHasUnsavedChanges(false);
      toast({ title: "Header cards saved", description: "The storefront menu will use the new presentation." });
    } catch (error) {
      toast({
        title: "Save failed",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="flex min-h-64 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Header Menu Cards</h1>
          <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
            Edit menu imagery and copy. Catalog paths, slugs, and parent-child relationships remain protected.
          </p>
        </div>
        <Button onClick={() => void save()} disabled={!isDirty || saving || !selectedContext}>
          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          Save changes
        </Button>
      </div>

      <Card>
        <CardContent className="grid gap-3 pt-6 md:grid-cols-[minmax(260px,420px)_1fr] md:items-end">
          <div className="space-y-2">
            <Label htmlFor="header-card-context">Menu selection</Label>
            <Select value={selectedContext?.id ?? ""} onValueChange={setSelectedContextId}>
              <SelectTrigger id="header-card-context"><SelectValue placeholder="Choose a department or subcategory" /></SelectTrigger>
              <SelectContent>
                {contexts.map((context) => <SelectItem key={context.id} value={context.id}>{context.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <p className="text-sm text-muted-foreground">
            “Default cards” are the fallback for that department. A section entry controls what appears when that specific header section is open.
          </p>
        </CardContent>
      </Card>

      {!selectedContext ? (
        <Card><CardContent className="py-10 text-center text-muted-foreground">No editable header contexts are available.</CardContent></Card>
      ) : selectedContext.cards.length === 0 ? (
        <Card><CardContent className="flex flex-col items-center gap-3 py-10 text-center"><p className="text-sm text-muted-foreground">No cards will appear for this menu selection.</p><Button variant="outline" onClick={addCard}><Plus className="mr-2 h-4 w-4" />Add card</Button></CardContent></Card>
      ) : (
        <div className="space-y-4">
          {selectedContext.cards.map((card, index) => {
            const destination = destinations.find(({ id }) => id === card.destinationId);
            return (
              <Card key={card.id}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0">
                  <CardTitle className="text-base">Card {index + 1}</CardTitle>
                  <div className="flex items-center gap-1">
                    <Button type="button" variant="ghost" size="icon" aria-label="Move card up" disabled={index === 0} onClick={() => moveCard(index, -1)}><ArrowUp className="h-4 w-4" /></Button>
                    <Button type="button" variant="ghost" size="icon" aria-label="Move card down" disabled={index === selectedContext.cards.length - 1} onClick={() => moveCard(index, 1)}><ArrowDown className="h-4 w-4" /></Button>
                    <Button type="button" variant="ghost" size="icon" aria-label="Remove card" className="text-destructive" onClick={() => updateCards(selectedContext.cards.filter((_, cardIndex) => cardIndex !== index))}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </CardHeader>
                <CardContent className="grid gap-6 lg:grid-cols-[230px_1fr]">
                  <CardImageEditor card={card} onChange={(patch) => updateCard(index, patch)} />
                  <div className="space-y-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2"><Label>Title</Label><Input maxLength={80} value={card.title} onChange={(event) => updateCard(index, { title: event.target.value })} /></div>
                      <div className="space-y-2"><Label>Subtitle (optional)</Label><Input maxLength={120} value={card.subtitle} onChange={(event) => updateCard(index, { subtitle: event.target.value })} /></div>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2"><Label>CTA (optional)</Label><Input maxLength={40} value={card.cta} placeholder="Shop now" onChange={(event) => updateCard(index, { cta: event.target.value })} /></div>
                      <div className="space-y-2"><Label>Linked catalog node</Label><Select value={card.destinationId} onValueChange={(value) => updateCard(index, { destinationId: value })}><SelectTrigger><SelectValue placeholder="Choose a catalog destination" /></SelectTrigger><SelectContent>{contextDestinations.map((item) => <SelectItem key={item.id} value={item.id}>{item.label}</SelectItem>)}</SelectContent></Select></div>
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-4 rounded-md border p-3">
                      <div><Label htmlFor={`visible-${card.id}`}>Visible</Label><p className="text-xs text-muted-foreground">Hide this card without deleting its setup.</p></div>
                      <Switch id={`visible-${card.id}`} checked={card.visible} onCheckedChange={(visible) => updateCard(index, { visible })} />
                    </div>
                    {destination ? <Button type="button" variant="link" className="h-auto p-0" asChild><a href={destination.href} target="_blank" rel="noreferrer"><ExternalLink className="mr-2 h-4 w-4" />Preview destination</a></Button> : null}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {selectedContext && selectedContext.cards.length < MAX_HEADER_CARDS_PER_CONTEXT ? (
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={addCard}><Plus className="mr-2 h-4 w-4" />Add card</Button>
          {selectedContext.customized ? <Button variant="ghost" onClick={restoreDefault}>Use default cards</Button> : null}
        </div>
      ) : selectedContext?.customized ? (
        <Button variant="ghost" onClick={restoreDefault}>Use default cards</Button>
      ) : null}

      <div className="rounded-lg bg-muted p-4 text-sm text-muted-foreground">
        Up to three cards can appear per menu selection. Only their presentation is editable here; catalog structure is managed by the system.
      </div>
    </div>
  );
}
