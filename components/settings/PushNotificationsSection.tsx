"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Bell, BellOff } from "lucide-react";
import { toast } from "@/hooks/use-toast";

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

export function PushNotificationsSection() {
  // Lazy initial state avoids setting state inside an effect
  const [supported] = useState(
    () => typeof window !== "undefined" && "PushManager" in window && "serviceWorker" in navigator
  );
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!supported) return;
    navigator.serviceWorker.ready.then((reg) =>
      reg.pushManager.getSubscription().then((sub) => setSubscribed(!!sub))
    );
  }, [supported]);

  async function toggle() {
    setLoading(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      if (subscribed) {
        const sub = await reg.pushManager.getSubscription();
        await sub?.unsubscribe();
        await fetch("/api/push/subscribe", { method: "DELETE" });
        setSubscribed(false);
        toast({ title: "Push notifications disabled", variant: "success" });
      } else {
        if (!VAPID_PUBLIC_KEY) { toast({ title: "Push not configured (missing VAPID key)", variant: "destructive" }); return; }
        const sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
        });
        await fetch("/api/push/subscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(sub.toJSON()),
        });
        setSubscribed(true);
        toast({ title: "Push notifications enabled", variant: "success" });
      }
    } catch (e) {
      toast({ title: String(e), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  if (!supported) return (
    <p className="text-xs text-muted-foreground">Push notifications not supported in this browser.</p>
  );

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 font-bold text-sm">
        <Bell className="h-4 w-4 text-primary" /> Push Notifications
      </div>
      <p className="text-sm text-muted-foreground">
        Get notified when someone views or interacts with your shared spots.
      </p>
      <Button
        variant={subscribed ? "destructive" : "outline"}
        size="sm"
        className="rounded-xl"
        onClick={toggle}
        disabled={loading}
      >
        {subscribed ? <BellOff className="h-4 w-4 mr-1.5" /> : <Bell className="h-4 w-4 mr-1.5" />}
        {loading ? "Updating…" : subscribed ? "Disable notifications" : "Enable notifications"}
      </Button>
    </div>
  );
}
