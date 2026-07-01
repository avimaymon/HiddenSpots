"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { locationSchema, type LocationFormData } from "@/lib/validations/schemas";
import { updateLocation } from "@/lib/actions/locations";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Loader2, MapPin } from "lucide-react";
import { toast } from "@/hooks/use-toast";

type Location = NonNullable<Awaited<ReturnType<typeof import("@/lib/actions/locations").getLocationById>>>;

interface Props {
  location: Location;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: { id: string; name: string; color: string; icon: string }[];
  onUpdated?: () => void;
}

export function EditLocationDialog({ location, open, onOpenChange, categories, onUpdated }: Props) {
  const [loading, setLoading] = useState(false);

  const form = useForm<LocationFormData>({
    resolver: zodResolver(locationSchema),
    defaultValues: mapLocationToForm(location),
  });

  const { register, handleSubmit, setValue, watch, reset } = form;

  useEffect(() => {
    if (open) reset(mapLocationToForm(location));
  }, [open, location, reset]);

  async function onSubmit(data: LocationFormData) {
    setLoading(true);
    try {
      await updateLocation(location.id, data);
      toast({ title: "Spot updated!", variant: "success" });
      onUpdated?.();
      onOpenChange(false);
    } catch (e) {
      toast({ title: "Update failed", description: String(e), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-primary" />
            Edit Spot
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label>Name</Label>
            <Input {...register("title")} className="h-11" />
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea {...register("description")} rows={3} />
          </div>
          <div className="space-y-2">
            <Label>Category</Label>
            <Select
              value={watch("categoryId") ?? ""}
              onValueChange={(v) => setValue("categoryId", v)}
            >
              <SelectTrigger className="rounded-xl h-11">
                <SelectValue placeholder="Choose category" />
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
              <Label>Latitude</Label>
              <Input type="number" step="any" {...register("latitude", { valueAsNumber: true })} />
            </div>
            <div className="space-y-2">
              <Label>Longitude</Label>
              <Input type="number" step="any" {...register("longitude", { valueAsNumber: true })} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Private notes</Label>
            <Textarea {...register("privateNotes")} rows={2} />
          </div>
          <div className="flex gap-6">
            <div className="flex items-center gap-2">
              <Switch checked={watch("isFavorite")} onCheckedChange={(v) => setValue("isFavorite", v)} />
              <Label>Favorite</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={watch("isBucketList")} onCheckedChange={(v) => setValue("isBucketList", v)} />
              <Label>Bucket list</Label>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Save Changes
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
  };
}
