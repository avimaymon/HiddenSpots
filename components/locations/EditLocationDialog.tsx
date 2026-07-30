"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { locationSchema, type LocationFormData } from "@/lib/validations/schemas";
import { updateLocation } from "@/lib/actions/locations";
import { addTagToLocation, removeTagFromLocation } from "@/lib/actions/tags";
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
import { TagInput } from "@/components/locations/TagInput";
import { useTranslations } from "next-intl";

type Location = NonNullable<Awaited<ReturnType<typeof import("@/lib/actions/locations").getLocationById>>>;

interface Props {
  location: Location;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: { id: string; name: string; color: string; icon: string }[];
  onUpdated?: () => void;
}

export function EditLocationDialog({ location, open, onOpenChange, categories, onUpdated }: Props) {
  const t = useTranslations("locations");
  const tc = useTranslations("common");
  const [loading, setLoading] = useState(false);
  const [tags, setTags] = useState<string[]>([]);

  const form = useForm<LocationFormData>({
    resolver: zodResolver(locationSchema),
    defaultValues: mapLocationToForm(location),
  });

  const { register, handleSubmit, setValue, watch, reset } = form;

  useEffect(() => {
    if (open) {
      reset(mapLocationToForm(location));
      setTags(location.tags.map((t) => t.tag.name));
    }
  }, [open, location, reset]);

  async function onSubmit(data: LocationFormData) {
    setLoading(true);
    try {
      await updateLocation(location.id, data);

      // Sync tags: add new ones, remove deleted ones
      const existingNames = location.tags.map((t) => t.tag.name);
      const toAdd = tags.filter((t) => !existingNames.includes(t));
      const toRemove = location.tags.filter((t) => !tags.includes(t.tag.name));

      await Promise.all([
        ...toAdd.map((name) => addTagToLocation(location.id, name)),
        ...toRemove.map((t) => removeTagFromLocation(location.id, t.tag.id)),
      ]);

      toast({ title: t("updatedToast"), variant: "success" });
      onUpdated?.();
      onOpenChange(false);
    } catch (e) {
      toast({ title: t("updateFailedToast"), description: String(e), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  const seasons = watch("recommendedSeasons") ?? [];

  function toggleSeason(s: string) {
    setValue("recommendedSeasons", seasons.includes(s) ? seasons.filter((x) => x !== s) : [...seasons, s]);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl sm:max-w-2xl overflow-y-auto" style={{ maxHeight: "calc(100dvh - var(--keyboard-height, 0px) - 2rem)" }}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center">
              <MapPin className="h-4 w-4 text-primary" />
            </span>
            {t("editTitle")}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)}>
          <Tabs defaultValue="basic" className="mt-2">
            <TabsList className="mb-4">
              <TabsTrigger value="basic">{t("tabBasic")}</TabsTrigger>
              <TabsTrigger value="details">{t("tabDetails")}</TabsTrigger>
              <TabsTrigger value="tags">{t("tabTags")}</TabsTrigger>
              <TabsTrigger value="privacy">{t("tabPrivacy")}</TabsTrigger>
            </TabsList>

            {/* BASIC */}
            <TabsContent value="basic" className="space-y-4">
              <div className="space-y-2">
                <Label>{t("fieldName")}</Label>
                <Input {...register("title")} className="h-11" />
              </div>
              <div className="space-y-2">
                <Label>{t("fieldDescription")}</Label>
                <Textarea {...register("description")} rows={3} />
              </div>
              <div className="space-y-2">
                <Label>{t("fieldCategory")}</Label>
                <Select
                  value={watch("categoryId") ?? ""}
                  onValueChange={(v) => setValue("categoryId", v)}
                >
                  <SelectTrigger className="rounded-xl h-11">
                    <SelectValue placeholder={t("fieldCategoryPlaceholder")} />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>{t("fieldLatitude")}</Label>
                  <Input type="number" step="any" {...register("latitude", { valueAsNumber: true })} />
                </div>
                <div className="space-y-2">
                  <Label>{t("fieldLongitude")}</Label>
                  <Input type="number" step="any" {...register("longitude", { valueAsNumber: true })} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>{t("fieldPrivateNotes")}</Label>
                <Textarea {...register("privateNotes")} rows={2} />
              </div>
              <div className="flex gap-6">
                <div className="flex items-center gap-2">
                  <Switch checked={watch("isFavorite")} onCheckedChange={(v) => setValue("isFavorite", v)} />
                  <Label>{t("fieldFavorite")}</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={watch("isBucketList")} onCheckedChange={(v) => setValue("isBucketList", v)} />
                  <Label>{t("fieldBucketList")}</Label>
                </div>
              </div>
            </TabsContent>

            {/* DETAILS */}
            <TabsContent value="details" className="space-y-4">
              <div className="space-y-1.5">
                <Label>{t("fieldDifficulty")}</Label>
                <Select
                  value={watch("difficulty") ?? ""}
                  onValueChange={(v) => setValue("difficulty", v as LocationFormData["difficulty"])}
                >
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
                <Select
                  value={watch("cellularQuality") ?? ""}
                  onValueChange={(v) => setValue("cellularQuality", v as LocationFormData["cellularQuality"])}
                >
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
                      id={`edit-${id}`}
                      checked={!!watch(id as keyof LocationFormData)}
                      onCheckedChange={(v) => setValue(id as keyof LocationFormData, v as never)}
                    />
                    <Label htmlFor={`edit-${id}`}>{t(`amenities.${id}`)}</Label>
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
            </TabsContent>

            {/* TAGS */}
            <TabsContent value="tags" className="space-y-3">
              <div className="space-y-1.5">
                <Label>{t("fieldTags")}</Label>
                <TagInput
                  tags={tags}
                  onChange={setTags}
                  placeholder={t("fieldTagsPlaceholder")}
                />
                <p className="text-xs text-muted-foreground">{t("fieldTagsHint")}</p>
              </div>
            </TabsContent>

            {/* PRIVACY */}
            <TabsContent value="privacy" className="space-y-4">
              <div className="space-y-1.5">
                <Label>{t("fieldVisibility")}</Label>
                <Select
                  value={watch("privacy") ?? "PRIVATE"}
                  onValueChange={(v) => setValue("privacy", v as LocationFormData["privacy"])}
                >
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
              {t("saveChanges")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function mapLocationToForm(loc: Location): LocationFormData {
  return {
    title: loc.title,
    description: loc.description ?? undefined,
    latitude: loc.latitude,
    longitude: loc.longitude,
    address: loc.address ?? undefined,
    categoryId: loc.categoryId ?? undefined,
    isFavorite: loc.isFavorite,
    isBucketList: loc.isBucketList,
    difficulty: loc.difficulty ?? undefined,
    cellularQuality: loc.cellularQuality ?? undefined,
    hasParking: loc.hasParking ?? undefined,
    hasWater: loc.hasWater ?? undefined,
    hasShade: loc.hasShade ?? undefined,
    isFamilyFriendly: loc.isFamilyFriendly ?? undefined,
    isDogFriendly: loc.isDogFriendly ?? undefined,
    isCampingAllowed: loc.isCampingAllowed ?? undefined,
    privateNotes: loc.privateNotes ?? undefined,
    privacy: loc.privacy,
    fuzzyCoordinates: loc.fuzzyCoordinates,
    fuzzyRadiusMeters: loc.fuzzyRadiusMeters,
    recommendedSeasons: loc.recommendedSeasons ?? [],
    externalLinks: loc.externalLinks ?? [],
    vibes: (loc as { vibes?: string[] }).vibes ?? [],
    tips: (loc as { tips?: string | null }).tips ?? undefined,
    hazardNote: (loc as { hazardNote?: string | null }).hazardNote ?? undefined,
    hazardExpiresAt: (loc as { hazardExpiresAt?: Date | null }).hazardExpiresAt
      ? new Date((loc as { hazardExpiresAt: Date }).hazardExpiresAt).toISOString().split("T")[0]
      : undefined,
    accessibilityLevel: (loc as { accessibilityLevel?: string | null }).accessibilityLevel ?? undefined,
  };
}
