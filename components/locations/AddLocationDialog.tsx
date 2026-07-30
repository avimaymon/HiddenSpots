"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { locationSchema, type LocationFormData } from "@/lib/validations/schemas";
import { createLocation, addLocationPhoto } from "@/lib/actions/locations";
type CreatedLocation = Awaited<ReturnType<typeof createLocation>>;
import { addTagToLocation } from "@/lib/actions/tags";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, MapPin } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { PhotoUpload } from "@/components/locations/PhotoUpload";
import { TagInput } from "@/components/locations/TagInput";
import { useTranslations } from "next-intl";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultCoords?: { lat: number; lng: number };
  categories: { id: string; name: string; color: string; icon: string }[];
  onCreated?: (loc: CreatedLocation) => void;
}

export function AddLocationDialog({ open, onOpenChange, defaultCoords, categories, onCreated }: Props) {
  const t = useTranslations("locations");
  const tc = useTranslations("common");
  const [loading, setLoading] = useState(false);
  const [pendingTags, setPendingTags] = useState<string[]>([]);
  const [pendingPhotos, setPendingPhotos] = useState<string[]>([]);

  const form = useForm<LocationFormData>({
    resolver: zodResolver(locationSchema),
    defaultValues: {
      title: "",
      latitude: defaultCoords?.lat ?? 0,
      longitude: defaultCoords?.lng ?? 0,
      privacy: "PRIVATE",
      isFavorite: false,
      isBucketList: false,
      fuzzyCoordinates: false,
      recommendedSeasons: [],
      externalLinks: [],
    },
  });

  const { register, handleSubmit, setValue, watch, reset, formState: { errors } } = form;
  const seasons = watch("recommendedSeasons") ?? [];
  const DRAFT_KEY = "hiddenspots_add_location_draft";

  useEffect(() => {
    if (defaultCoords) {
      setValue("latitude", defaultCoords.lat);
      setValue("longitude", defaultCoords.lng);
    }
  }, [defaultCoords, setValue]);

  // Restore draft when dialog opens
  useEffect(() => {
    if (!open) return;
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (raw) {
        const draft = JSON.parse(raw) as Partial<LocationFormData>;
        if (draft.title) {
          Object.entries(draft).forEach(([k, v]) => setValue(k as keyof LocationFormData, v as never));
        }
      }
    } catch {}
  }, [open, setValue]);

  // Auto-save draft on title change
  const title = watch("title");
  useEffect(() => {
    if (!open || !title) return;
    const id = setTimeout(() => {
      const vals = form.getValues();
      localStorage.setItem(DRAFT_KEY, JSON.stringify(vals));
    }, 1000);
    return () => clearTimeout(id);
  }, [title, open, form]);

  useEffect(() => {
    if (!open) {
      setPendingPhotos([]);
      reset({
        title: "",
        latitude: defaultCoords?.lat ?? 0,
        longitude: defaultCoords?.lng ?? 0,
        privacy: "PRIVATE",
        isFavorite: false,
        isBucketList: false,
        fuzzyCoordinates: false,
        recommendedSeasons: [],
        externalLinks: [],
      });
    }
  }, [open, defaultCoords, reset]);

  async function onSubmit(data: LocationFormData) {
    setLoading(true);
    try {
      const loc = await createLocation(data);
      for (let i = 0; i < pendingPhotos.length; i++) {
        await addLocationPhoto(loc.id, pendingPhotos[i], i === 0);
      }
      for (const tag of pendingTags) {
        await addTagToLocation(loc.id, tag);
      }
      localStorage.removeItem("hiddenspots_add_location_draft");
      toast({ title: t("savedToast"), variant: "success" });
      onCreated?.(loc);
      setPendingPhotos([]);
      setPendingTags([]);
      form.reset();
    } catch (e) {
      toast({ title: t("saveFailedToast"), description: String(e), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  function toggleSeason(s: string) {
    const current = watch("recommendedSeasons") ?? [];
    setValue("recommendedSeasons", current.includes(s) ? current.filter((x) => x !== s) : [...current, s]);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-2xl sm:max-w-2xl overflow-y-auto"
        style={{ maxHeight: "calc(100dvh - var(--keyboard-height, 0px) - 2rem)" }}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 flex-wrap">
            <span className="flex items-center gap-2">
              <span className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center">
                <MapPin className="h-4 w-4 text-primary" />
              </span>
              {t("addNewTitle")}
            </span>
            {defaultCoords && (
              <span className="text-xs text-muted-foreground font-normal font-mono ml-2">
                {defaultCoords.lat.toFixed(5)}, {defaultCoords.lng.toFixed(5)}
              </span>
            )}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)}>
          <Tabs defaultValue="basic" className="mt-2">
            <TabsList className="mb-4">
              <TabsTrigger value="basic">{t("tabBasic")}</TabsTrigger>
              <TabsTrigger value="details">{t("tabDetails")}</TabsTrigger>
              <TabsTrigger value="photos">{t("tabPhotos")}</TabsTrigger>
              <TabsTrigger value="tags">{t("tabTags")}</TabsTrigger>
              <TabsTrigger value="privacy">{t("tabPrivacy")}</TabsTrigger>
            </TabsList>

            {/* BASIC */}
            <TabsContent value="basic" className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="title">{t("fieldNameRequired")}</Label>
                <Input id="title" placeholder={t("fieldNamePlaceholder")} {...register("title")} />
                {errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="description">{t("fieldDescription")}</Label>
                <Textarea id="description" placeholder={t("fieldDescriptionPlaceholder")} rows={3} {...register("description")} />
              </div>

              <div className="space-y-1.5">
                <Label>{t("fieldCategory")}</Label>
                <Select onValueChange={(v) => setValue("categoryId", v)}>
                  <SelectTrigger>
                    <SelectValue placeholder={t("fieldCategoryPlaceholder")} />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        <span className="flex items-center gap-2">
                          <span className="h-2.5 w-2.5 rounded-full inline-block" style={{ background: cat.color }} />
                          {cat.name}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>{t("fieldLatitude")}</Label>
                  <Input type="number" step="any" {...register("latitude", { valueAsNumber: true })} />
                </div>
                <div className="space-y-1.5">
                  <Label>{t("fieldLongitude")}</Label>
                  <Input type="number" step="any" {...register("longitude", { valueAsNumber: true })} />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>{t("fieldAddress")}</Label>
                <Input placeholder={t("fieldAddressPlaceholder")} {...register("address")} />
              </div>

              <div className="flex gap-6">
                <div className="flex items-center gap-2">
                  <Switch
                    id="fav"
                    checked={watch("isFavorite")}
                    onCheckedChange={(v) => setValue("isFavorite", v)}
                  />
                  <Label htmlFor="fav">{t("fieldFavorite")}</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    id="bucket"
                    checked={watch("isBucketList")}
                    onCheckedChange={(v) => setValue("isBucketList", v)}
                  />
                  <Label htmlFor="bucket">{t("fieldBucketList")}</Label>
                </div>
              </div>
            </TabsContent>

            {/* DETAILS */}
            <TabsContent value="details" className="space-y-4">
              <div className="space-y-1.5">
                <Label>{t("fieldDifficulty")}</Label>
                <Select onValueChange={(v) => setValue("difficulty", v as LocationFormData["difficulty"])}>
                  <SelectTrigger><SelectValue placeholder={t("fieldDifficultyPlaceholder")} /></SelectTrigger>
                  <SelectContent>
                    {(["EASY", "MODERATE", "HARD", "EXPERT"] as const).map((d) => (
                      <SelectItem key={d} value={d}>{t(`difficulty.${d}`)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>{t("fieldCellular")}</Label>
                <Select onValueChange={(v) => setValue("cellularQuality", v as LocationFormData["cellularQuality"])}>
                  <SelectTrigger><SelectValue placeholder={t("fieldCellularPlaceholder")} /></SelectTrigger>
                  <SelectContent>
                    {(["NONE", "POOR", "FAIR", "GOOD", "EXCELLENT"] as const).map((d) => (
                      <SelectItem key={d} value={d}>{t(`cellular.${d}`)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-x-6 gap-y-3">
                {(["hasParking", "hasWater", "hasShade", "isFamilyFriendly", "isDogFriendly", "isCampingAllowed"] as const).map((id) => (
                  <div key={id} className="flex items-center gap-2">
                    <Switch
                      id={id}
                      onCheckedChange={(v) => setValue(id as keyof LocationFormData, v as never)}
                    />
                    <Label htmlFor={id}>{t(`amenities.${id}`)}</Label>
                  </div>
                ))}
              </div>

              <div className="space-y-1.5">
                <Label>{t("fieldSeasons")}</Label>
                <div className="flex flex-wrap gap-2">
                  {(["Spring", "Summer", "Autumn", "Winter"] as const).map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => toggleSeason(s)}
                      className={`px-3 py-1 rounded-full text-sm border transition-colors ${
                        seasons.includes(s)
                          ? "bg-primary text-primary-foreground border-primary"
                          : "border-border hover:bg-muted"
                      }`}
                    >
                      {t(`seasons.${s}`)}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>{t("fieldPrivateNotes")}</Label>
                <Textarea placeholder={t("fieldPrivateNotesPlaceholder")} rows={3} {...register("privateNotes")} />
              </div>

              <div className="space-y-1.5">
                <Label>Visiting Tips</Label>
                <Textarea placeholder="Best time of day, what to bring, parking tips…" rows={2} {...register("tips")} />
              </div>

              <div className="space-y-1.5">
                <Label>Accessibility</Label>
                <Select onValueChange={(v) => setValue("accessibilityLevel" as keyof LocationFormData, v as never)}>
                  <SelectTrigger><SelectValue placeholder="Choose accessibility…" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="wheelchair">♿ Wheelchair accessible</SelectItem>
                    <SelectItem value="stroller">🍼 Stroller friendly</SelectItem>
                    <SelectItem value="elderly">👴 Elderly friendly</SelectItem>
                    <SelectItem value="challenging">⛰️ Challenging terrain</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>Hazard Alert</Label>
                <Input placeholder="Current hazard note (e.g. trail closed)" {...register("hazardNote")} />
                <Input type="date" {...register("hazardExpiresAt")} className="mt-1.5" />
              </div>
            </TabsContent>

            {/* PHOTOS */}
            <TabsContent value="photos">
              <PhotoUpload
                onUploadComplete={(url) => setPendingPhotos((p) => [...p, url])}
              />
            </TabsContent>

            {/* TAGS */}
            <TabsContent value="tags" className="space-y-3">
              <div className="space-y-1.5">
                <Label>{t("fieldTags")}</Label>
                <TagInput
                  tags={pendingTags}
                  onChange={setPendingTags}
                  placeholder={t("fieldTagsPlaceholder")}
                />
                <p className="text-xs text-muted-foreground">{t("fieldTagsHint")}</p>
              </div>
              <div className="space-y-1.5">
                <Label>Vibe</Label>
                <div className="flex flex-wrap gap-2">
                  {(["calm", "adventurous", "photogenic", "romantic", "family", "solitude", "spiritual", "lively"] as const).map((v) => {
                    const vibes: string[] = (watch as (n: string) => string[])("vibes") ?? [];
                    const active = vibes.includes(v);
                    return (
                      <button
                        key={v}
                        type="button"
                        onClick={() => {
                          const cur: string[] = vibes;
                          setValue("vibes" as keyof LocationFormData, (active ? cur.filter((x) => x !== v) : [...cur, v]) as never);
                        }}
                        className={`px-3 py-1 rounded-full text-xs border transition-colors ${active ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-muted"}`}
                      >
                        {v}
                      </button>
                    );
                  })}
                </div>
              </div>
            </TabsContent>

            {/* PRIVACY */}
            <TabsContent value="privacy" className="space-y-4">
              <div className="space-y-1.5">
                <Label>{t("fieldVisibility")}</Label>
                <Select defaultValue="PRIVATE" onValueChange={(v) => setValue("privacy", v as LocationFormData["privacy"])}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(["PRIVATE", "SHARED", "PUBLIC", "SECRET"] as const).map((p) => (
                      <SelectItem key={p} value={p}>{t(`privacy.${p}`)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {watch("privacy") === "SECRET" && (
                <div className="flex items-center gap-2 p-3 bg-amber-50 dark:bg-amber-950/20 rounded-lg border border-amber-200 dark:border-amber-800">
                  <div className="text-sm text-amber-800 dark:text-amber-200">
                    <p className="font-medium">{t("secretActive")}</p>
                    <p className="text-xs mt-0.5">{t("secretDesc")}</p>
                  </div>
                </div>
              )}
            </TabsContent>
          </Tabs>

          <DialogFooter className="mt-6">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {tc("cancel")}
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {t("saveLocation")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
