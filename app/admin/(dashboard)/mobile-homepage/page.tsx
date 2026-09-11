'use client';

import Image from 'next/image';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ImageIcon, Loader2, RotateCcw, Save, Upload } from 'lucide-react';

import { useAdminUnsavedChanges } from '@/components/admin/unsaved-changes-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { toast } from '@/hooks/use-toast';
import { adminFetch, adminResponseError } from '@/lib/admin-fetch';
import {
  MOBILE_HOMEPAGE_DEPARTMENTS,
  createDefaultMobileHomepageConfig,
  getMobileHomepageDepartmentLabel,
  type MobileHomepageCard,
  type MobileHomepageBanner,
  type MobileHomepageConfig,
  type MobileHomepageDepartment,
} from '@/lib/mobile-homepage';
import type { CatalogHeaderDestination } from '@/lib/navigation/catalog-header-cards';

type EditorPayload = {
  config: MobileHomepageConfig;
  destinations: CatalogHeaderDestination[];
};

const BANNER_POSITIONS = [
  'After Shop by Category',
  'After the first Trending section',
  'Immediately below banner 2',
  'After Trending Fits',
  'Immediately below banner 4',
] as const;

function snapshot(config: MobileHomepageConfig | null) {
  return config ? JSON.stringify(config) : '';
}

function ImageField({ item, onChange, portrait = false }: {
  item: MobileHomepageCard;
  onChange: (image: string) => void;
  portrait?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const upload = async (file: File) => {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const response = await adminFetch('/api/admin/upload', { method: 'POST', body: formData });
      if (!response.ok) throw await adminResponseError(response, 'Image upload failed');
      const data = (await response.json()) as { url?: string };
      if (!data.url) throw new Error('The upload did not return an image URL');
      onChange(data.url);
      toast({ title: 'Image uploaded' });
    } catch (error) {
      toast({
        title: 'Upload failed',
        description: error instanceof Error ? error.message : 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  return (
    <div className='space-y-2'>
      <Label>Image</Label>
      <div className={`relative w-full max-w-[220px] overflow-hidden rounded-md border bg-muted ${portrait ? 'aspect-[4/5]' : 'aspect-square'}`}>
        {item.image ? <Image src={item.image} alt={`${item.title} preview`} fill sizes='220px' className='object-cover' /> : <ImageIcon className='absolute inset-0 m-auto h-8 w-8 text-muted-foreground' />}
        {uploading ? <span className='absolute inset-0 grid place-items-center bg-black/40'><Loader2 className='h-7 w-7 animate-spin text-white' /></span> : null}
      </div>

      <input ref={inputRef} type='file' accept='image/jpeg,image/png,image/webp' className='sr-only' onChange={(event) => {
        const file = event.target.files?.[0];
        if (file) void upload(file);
      }} />
      <div className='flex max-w-2xl gap-2'>
        <Button type='button' variant='outline' size='sm' disabled={uploading} onClick={() => inputRef.current?.click()}>
          {uploading ? <Loader2 className='mr-2 h-4 w-4 animate-spin' /> : <Upload className='mr-2 h-4 w-4' />}
          Upload
        </Button>
        <Input value={item.image} onChange={(event) => onChange(event.target.value)} className='font-mono text-xs' placeholder='/images/... or uploaded URL' />
      </div>
    </div>
  );
}

function DestinationField({ value, destinations, onChange }: {
  value: string;
  destinations: CatalogHeaderDestination[];
  onChange: (value: string) => void;
}) {
  return (
    <div className='space-y-2'>
      <Label>Click destination</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger><SelectValue placeholder='Choose a category or subcategory' /></SelectTrigger>
        <SelectContent>
          {destinations.map((destination) => (
            <SelectItem key={destination.id} value={destination.id}>{destination.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

export default function MobileHomepageAdminPage() {
  const [config, setConfig] = useState<MobileHomepageConfig | null>(null);
  const [destinations, setDestinations] = useState<CatalogHeaderDestination[]>([]);
  const [departmentId, setDepartmentId] = useState<MobileHomepageDepartment>('women');
  const [baseline, setBaseline] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { setHasUnsavedChanges } = useAdminUnsavedChanges();

  useEffect(() => {
    let active = true;
    adminFetch(`/api/admin/mobile-homepage?_t=${Date.now()}`, { cache: 'no-store' })
      .then(async (response) => {
        if (!response.ok) throw await adminResponseError(response, 'Could not load mobile homepage');
        return (await response.json()) as EditorPayload;
      })
      .then((payload) => {
        if (!active) return;
        setConfig(payload.config);
        setDestinations(payload.destinations);
        setBaseline(snapshot(payload.config));
      })
      .catch((error) => {
        if (!active) return;
        toast({
          title: 'Mobile homepage could not be loaded',
          description: error instanceof Error ? error.message : 'Please refresh and try again.',
          variant: 'destructive',
        });
      })
      .finally(() => { if (active) setLoading(false); });
    return () => {
      active = false;
      setHasUnsavedChanges(false);
    };
  }, [setHasUnsavedChanges]);

  const isDirty = Boolean(config && baseline && snapshot(config) !== baseline);
  useEffect(() => setHasUnsavedChanges(isDirty), [isDirty, setHasUnsavedChanges]);
  const department = config?.departments[departmentId];
  const departmentDestinations = useMemo(
    () => destinations.filter((destination) => destination.departmentId === departmentId),
    [departmentId, destinations],
  );

  const updateCategory = (index: number, patch: Partial<MobileHomepageCard>) => {
    if (!config || !department) return;
    const categoryCards = department.categoryCards.map((card, cardIndex) =>
      cardIndex === index ? { ...card, ...patch } : card,
    );
    setConfig({
      ...config,
      departments: {
        ...config.departments,
        [departmentId]: { ...department, categoryCards },
      },
    });
  };

  const updateBanner = (index: number, patch: Partial<MobileHomepageBanner>) => {
    if (!config || !department) return;
    const banners = department.banners.map((banner, bannerIndex) =>
      bannerIndex === index ? { ...banner, ...patch } : banner,
    );
    setConfig({
      ...config,
      departments: {
        ...config.departments,
        [departmentId]: { ...department, banners },
      },
    });
  };

  const restoreDepartment = () => {
    if (!config) return;
    const defaults = createDefaultMobileHomepageConfig();
    setConfig({
      ...config,
      departments: {
        ...config.departments,
        [departmentId]: defaults.departments[departmentId],
      },
    });
  };

  const save = async () => {
    if (!config) return;
    setSaving(true);
    try {
      const response = await adminFetch('/api/admin/mobile-homepage', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config }),
      });
      if (!response.ok) throw await adminResponseError(response, 'Could not save mobile homepage');
      const payload = (await response.json()) as { config: MobileHomepageConfig };
      setConfig(payload.config);
      setBaseline(snapshot(payload.config));
      setHasUnsavedChanges(false);
      toast({ title: 'Mobile homepage saved', description: 'The storefront will use the new images and links.' });
    } catch (error) {
      toast({
        title: 'Save failed',
        description: error instanceof Error ? error.message : 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className='flex min-h-64 items-center justify-center'><Loader2 className='h-8 w-8 animate-spin text-muted-foreground' /></div>;
  }
  if (!config || !department) {
    return <Card><CardContent className='py-10 text-center text-muted-foreground'>The editor is unavailable. Refresh and try again.</CardContent></Card>;
  }

  return (
    <div className='space-y-6'>
      <div className='flex flex-wrap items-start justify-between gap-4'>
        <div>
          <h1 className='text-2xl font-semibold'>Mobile Homepage</h1>
          <p className='mt-1 max-w-3xl text-sm text-muted-foreground'>
            Control the mobile-only category rail and five editorial banners. Desktop remains unchanged.
          </p>
        </div>
        <div className='flex gap-2'>
          <Button variant='outline' onClick={restoreDepartment}><RotateCcw className='mr-2 h-4 w-4' />Restore department</Button>
          <Button onClick={() => void save()} disabled={!isDirty || saving}>
            {saving ? <Loader2 className='mr-2 h-4 w-4 animate-spin' /> : <Save className='mr-2 h-4 w-4' />}
            Save changes
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className='grid gap-3 pt-6 md:grid-cols-[minmax(240px,380px)_1fr] md:items-end'>
          <div className='space-y-2'>
            <Label>Department</Label>
            <Select value={departmentId} onValueChange={(value) => setDepartmentId(value as MobileHomepageDepartment)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {MOBILE_HOMEPAGE_DEPARTMENTS.map((id) => (
                  <SelectItem key={id} value={id}>{getMobileHomepageDepartmentLabel(id)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <p className='text-sm text-muted-foreground'>Upload images here or paste an approved URL. Links stay inside the selected department.</p>
        </CardContent>
      </Card>
      <section className='space-y-4' aria-labelledby='category-editor-title'>
        <div>
          <h2 id='category-editor-title' className='text-xl font-semibold'>Shop by Category</h2>
          <p className='text-sm text-muted-foreground'>These cards swipe left and right directly below the hero.</p>
        </div>
        {department.categoryCards.map((card, index) => (
          <Card key={card.id}>
            <CardHeader><CardTitle className='text-base'>Category {index + 1}: {card.title}</CardTitle></CardHeader>
            <CardContent className='grid gap-6 lg:grid-cols-[240px_1fr]'>
              <ImageField item={card} onChange={(image) => updateCategory(index, { image })} />
              <div className='space-y-4'>
                <div className='space-y-2'>
                  <Label>Title</Label>
                  <Input maxLength={80} value={card.title} onChange={(event) => updateCategory(index, { title: event.target.value })} />
                </div>
                <DestinationField value={card.destinationId} destinations={departmentDestinations} onChange={(destinationId) => updateCategory(index, { destinationId })} />
                <div className='flex items-center justify-between rounded-md border p-3'>
                  <div>
                    <Label htmlFor={`category-visible-${card.id}`}>Visible</Label>
                    <p className='text-xs text-muted-foreground'>Hide without removing its setup.</p>
                  </div>
                  <Switch id={`category-visible-${card.id}`} checked={card.visible} onCheckedChange={(visible) => updateCategory(index, { visible })} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </section>

      <section className='space-y-4' aria-labelledby='banner-editor-title'>
        <div>
          <h2 id='banner-editor-title' className='text-xl font-semibold'>Editorial Banners</h2>
          <p className='text-sm text-muted-foreground'>Five fixed placements reproduce the requested mobile homepage rhythm.</p>
        </div>
        {department.banners.map((banner, index) => (
          <Card key={banner.id}>
            <CardHeader>
              <CardTitle className='text-base'>Banner {index + 1}: {BANNER_POSITIONS[index]}</CardTitle>
            </CardHeader>
            <CardContent className='grid gap-6 lg:grid-cols-[240px_1fr]'>
              <ImageField item={banner} portrait onChange={(image) => updateBanner(index, { image })} />
              <div className='space-y-4'>
                <div className='grid gap-4 sm:grid-cols-2'>
                  <div className='space-y-2'>
                    <Label>Title</Label>
                    <Input maxLength={80} value={banner.title} onChange={(event) => updateBanner(index, { title: event.target.value })} />
                  </div>
                  <div className='space-y-2'>
                    <Label>Subtitle</Label>
                    <Input maxLength={120} value={banner.subtitle} onChange={(event) => updateBanner(index, { subtitle: event.target.value })} />
                  </div>
                </div>
                <div className='grid gap-4 sm:grid-cols-2'>
                  <div className='space-y-2'>
                    <Label>Button text</Label>
                    <Input maxLength={40} value={banner.cta} onChange={(event) => updateBanner(index, { cta: event.target.value })} />
                  </div>
                  <DestinationField value={banner.destinationId} destinations={departmentDestinations} onChange={(destinationId) => updateBanner(index, { destinationId })} />
                </div>
                <div className='flex items-center justify-between rounded-md border p-3'>
                  <div>
                    <Label htmlFor={`banner-visible-${banner.id}`}>Visible</Label>
                    <p className='text-xs text-muted-foreground'>The other placements keep their order when hidden.</p>
                  </div>
                  <Switch id={`banner-visible-${banner.id}`} checked={banner.visible} onCheckedChange={(visible) => updateBanner(index, { visible })} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </section>
    </div>
  );
}
