"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { locationSchema, type LocationFormData } from "@/lib/validations/schemas";
import { createLocation, addLocationPhoto } from "@/lib/actions/locations";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, MapPin, X } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { PhotoUpload } from "@/components/locations/PhotoUpload";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultCoords?: { lat: number; lng: number };
  categories: { id: string; name: string; color: string; icon: string }[];
  onCreated?: (loc: any) => void;
}

export function AddLocationDialog({ open, onOpenChange, defaultCoords, categories, onCreated }: Props) {
  const [loading, setLoading] = useState(false);
  const [tagInput, setTagInput] = useState("");
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

  useEffect(() => {
    if (defaultCoords) {
      setValue("latitude", defaultCoords.lat);
      setValue("longitude", defaultCoords.lng);
    }
  }, [defaultCoords, setValue]);

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
      toast({ title: "Location added!", variant: "success" });
      onCreated?.(loc);
      setPendingPhotos([]);
      form.reset();
    } catch (e) {
      toast({ title: "Failed to add location", description: String(e), variant: "destructive" });
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
      <DialogContent className="max-w-2xl sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 flex-wrap">
            <span className="flex items-center gap-2">
              <span className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center">
                <MapPin className="h-4 w-4 text-primary" />
              </span>
              Add New Spot
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
              <TabsTrigger value="basic">Basic</TabsTrigger>
              <TabsTrigger value="details">Details</TabsTrigger>
              <TabsTrigger value="photos">Photos</TabsTrigger>
              <TabsTrigger value="privacy">Privacy</TabsTrigger>
            </TabsList>

            {/* BASIC */}
            <TabsContent value="basic" className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="title">Name *</Label>
                <Input id="title" placeholder="Beautiful waterfall…" {...register("title")} />
                {errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="description">Description</Label>
                <Textarea id="description" placeholder="Describe this place…" rows={3} {...register("description")} />
              </div>

              <div className="space-y-1.5">
                <Label>Category</Label>
                <Select onValueChange={(v) => setValue("categoryId", v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a category…" />
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
                  <Label>Latitude</Label>
                  <Input type="number" step="any" {...register("latitude", { valueAsNumber: true })} />
                </div>
                <div className="space-y-1.5">
                  <Label>Longitude</Label>
                  <Input type="number" step="any" {...register("longitude", { valueAsNumber: true })} />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Address</Label>
                <Input placeholder="Optional address…" {...register("address")} />
              </div>

              <div className="flex gap-6">
                <div className="flex items-center gap-2">
                  <Switch
                    id="fav"
                    checked={watch("isFavorite")}
                    onCheckedChange={(v) => setValue("isFavorite", v)}
                  />
                  <Label htmlFor="fav">Favorite</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    id="bucket"
                    checked={watch("isBucketList")}
                    onCheckedChange={(v) => setValue("isBucketList", v)}
                  />
                  <Label htmlFor="bucket">Bucket List</Label>
                </div>
              </div>
            </TabsContent>

            {/* DETAILS */}
            <TabsContent value="details" className="space-y-4">
              <div className="space-y-1.5">
                <Label>Difficulty</Label>
                <Select onValueChange={(v) => setValue("difficulty", v as any)}>
                  <SelectTrigger><SelectValue placeholder="Choose difficulty…" /></SelectTrigger>
                  <SelectContent>
                    {["EASY", "MODERATE", "HARD", "EXPERT"].map((d) => (
                      <SelectItem key={d} value={d}>{d}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>Cellular Reception</Label>
                <Select onValueChange={(v) => setValue("cellularQuality", v as any)}>
                  <SelectTrigger><SelectValue placeholder="Choose reception quality…" /></SelectTrigger>
                  <SelectContent>
                    {["NONE", "POOR", "FAIR", "GOOD", "EXCELLENT"].map((d) => (
                      <SelectItem key={d} value={d}>{d}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-x-6 gap-y-3">
                {[
                  { id: "hasParking", label: "Parking Available" },
                  { id: "hasWater", label: "Water Available" },
                  { id: "hasShade", label: "Shaded Area" },
                  { id: "isFamilyFriendly", label: "Family Friendly" },
                  { id: "isDogFriendly", label: "Dog Friendly" },
                  { id: "isCampingAllowed", label: "Camping Allowed" },
                ].map(({ id, label }) => (
                  <div key={id} className="flex items-center gap-2">
                    <Switch
                      id={id}
                      onCheckedChange={(v) => setValue(id as any, v)}
                    />
                    <Label htmlFor={id}>{label}</Label>
                  </div>
                ))}
              </div>

              <div className="space-y-1.5">
                <Label>Recommended Seasons</Label>
                <div className="flex flex-wrap gap-2">
                  {["Spring", "Summer", "Autumn", "Winter"].map((s) => (
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
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Private Notes</Label>
                <Textarea placeholder="Personal notes (only visible to you)…" rows={3} {...register("privateNotes")} />
              </div>
            </TabsContent>

            {/* PHOTOS */}
            <TabsContent value="photos">
              <PhotoUpload
                onUploadComplete={(url) => setPendingPhotos((p) => [...p, url])}
              />
            </TabsContent>

            {/* PRIVACY */}
            <TabsContent value="privacy" className="space-y-4">
              <div className="space-y-1.5">
                <Label>Visibility</Label>
                <Select defaultValue="PRIVATE" onValueChange={(v) => setValue("privacy", v as any)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PRIVATE">Private — only you</SelectItem>
                    <SelectItem value="SHARED">Shared — invited users</SelectItem>
                    <SelectItem value="PUBLIC">Public — anyone with link</SelectItem>
                    <SelectItem value="SECRET">Secret — hide exact location</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {watch("privacy") === "SECRET" && (
                <div className="flex items-center gap-2 p-3 bg-amber-50 dark:bg-amber-950/20 rounded-lg border border-amber-200 dark:border-amber-800">
                  <div className="text-sm text-amber-800 dark:text-amber-200">
                    <p className="font-medium">Secret mode active</p>
                    <p className="text-xs mt-0.5">Exact coordinates will be hidden from other users. Only approximate area will be shown.</p>
                  </div>
                </div>
              )}
            </TabsContent>
          </Tabs>

          <DialogFooter className="mt-6">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Save Location
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
