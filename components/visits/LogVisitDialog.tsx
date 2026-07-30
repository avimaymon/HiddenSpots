"use client";

// Minimal typed shim for Web Speech API — avoids dependency on lib.dom SpeechRecognition global
interface SpeechRecInstance extends EventTarget {
  lang: string;
  interimResults: boolean;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
  start(): void;
  stop(): void;
}
type SpeechRecCtor = new () => SpeechRecInstance;
type WindowWithSR = Window & { SpeechRecognition?: SpeechRecCtor; webkitSpeechRecognition?: SpeechRecCtor };

import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { createVisit, addVisitPhoto } from "@/lib/actions/visits";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Camera, Loader2, Star, X, Mic, MicOff } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import Image from "next/image";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  locationId: string;
  latitude?: number;
  longitude?: number;
  onLogged?: () => void;
}

async function fetchWeather(lat: number, lng: number): Promise<string | undefined> {
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m&timezone=auto`;
    const res = await fetch(url);
    if (!res.ok) return undefined;
    const data = (await res.json()) as { current?: { temperature_2m?: number } };
    const temp = data.current?.temperature_2m;
    if (temp == null) return undefined;
    return `${Math.round(temp)}°C`;
  } catch {
    return undefined;
  }
}

async function uploadPhoto(file: File, locationId: string): Promise<string> {
  const fd = new FormData();
  fd.set("file", file);
  fd.set("locationId", locationId);
  const res = await fetch("/api/upload", { method: "POST", body: fd });
  if (!res.ok) throw new Error("Upload failed");
  const json = (await res.json()) as { url: string };
  return json.url;
}

export function LogVisitDialog({
  open,
  onOpenChange,
  locationId,
  latitude,
  longitude,
  onLogged,
}: Props) {
  const t = useTranslations("visits");
  const tc = useTranslations("common");
  const fileRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [rating, setRating] = useState(0);
  const [notes, setNotes] = useState("");
  const [weather, setWeather] = useState("");
  const [duration, setDuration] = useState("");
  const [visitedAt, setVisitedAt] = useState(() => new Date().toISOString().slice(0, 16));
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef<SpeechRecInstance | null>(null);

  function toggleVoice() {
    const win = window as WindowWithSR;
    const SR = win.SpeechRecognition ?? win.webkitSpeechRecognition;
    if (!SR) { toast({ title: "Speech recognition not supported", variant: "destructive" }); return; }
    if (listening && recognitionRef.current) {
      recognitionRef.current.stop();
      setListening(false);
      return;
    }
    const rec = new SR();
    rec.lang = "he-IL";
    rec.interimResults = false;
    rec.onresult = (e) => {
      const transcript = Array.from(e.results).map((r) => r[0].transcript).join(" ");
      setNotes((prev) => prev ? prev + " " + transcript : transcript);
    };
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    recognitionRef.current = rec;
    rec.start();
    setListening(true);
  }

  function onPickPhoto(file: File | null) {
    if (photoPreview) URL.revokeObjectURL(photoPreview);
    setPhotoFile(file);
    setPhotoPreview(file ? URL.createObjectURL(file) : null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      let weatherValue = weather.trim() || undefined;
      if (!weatherValue && latitude != null && longitude != null) {
        weatherValue = await fetchWeather(latitude, longitude);
      }

      const visit = await createVisit({
        locationId,
        visitedAt: new Date(visitedAt).toISOString(),
        rating: rating || undefined,
        notes: notes.trim() || undefined,
        weather: weatherValue,
        duration: duration ? Number(duration) : undefined,
        companions: [],
      });

      if (photoFile) {
        const url = await uploadPhoto(photoFile, locationId);
        await addVisitPhoto(visit.id, url);
      }

      toast({ title: t("logged"), variant: "success" });
      onLogged?.();
      onOpenChange(false);
      setRating(0);
      setNotes("");
      setWeather("");
      setDuration("");
      onPickPhoto(null);
    } catch (err) {
      toast({ title: String(err), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t("logVisit")}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>{t("date")}</Label>
            <Input
              type="datetime-local"
              value={visitedAt}
              onChange={(e) => setVisitedAt(e.target.value)}
              className="h-11"
              required
            />
          </div>
          <div className="space-y-2">
            <Label>{t("rating")}</Label>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setRating(n === rating ? 0 : n)}
                  className="p-1 rounded-lg hover:bg-muted"
                  aria-label={`${n}`}
                >
                  <Star
                    className={cn(
                      "h-6 w-6",
                      n <= rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground"
                    )}
                  />
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>{t("notes")}</Label>
              <button
                type="button"
                onClick={toggleVoice}
                className={cn("h-7 w-7 rounded-lg flex items-center justify-center transition-colors", listening ? "bg-destructive/15 text-destructive" : "hover:bg-muted text-muted-foreground")}
                title={listening ? "Stop recording" : "Voice note"}
              >
                {listening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
              </button>
            </div>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} placeholder={listening ? "Listening…" : ""} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>{t("weather")}</Label>
              <Input
                value={weather}
                onChange={(e) => setWeather(e.target.value)}
                placeholder={t("weatherPlaceholder")}
              />
            </div>
            <div className="space-y-2">
              <Label>{t("durationMin")}</Label>
              <Input
                type="number"
                min={0}
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                placeholder="60"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>{t("addPhoto")}</Label>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => onPickPhoto(e.target.files?.[0] ?? null)}
            />
            {photoPreview ? (
              <div className="relative h-32 rounded-xl overflow-hidden border border-border/50">
                <Image src={photoPreview} alt="" fill className="object-cover" unoptimized />
                <Button
                  type="button"
                  size="icon-sm"
                  variant="secondary"
                  className="absolute top-2 end-2 rounded-lg"
                  onClick={() => onPickPhoto(null)}
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            ) : (
              <Button
                type="button"
                variant="outline"
                className="w-full rounded-xl h-11"
                onClick={() => fileRef.current?.click()}
              >
                <Camera className="h-4 w-4" /> {t("addPhoto")}
              </Button>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {tc("cancel")}
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {t("saveVisit")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
