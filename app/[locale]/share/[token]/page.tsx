import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { getShareByToken, recordShareView } from "@/lib/actions/shares";
import { getCommentsForShareToken } from "@/lib/actions/comments";
import { auth } from "@/lib/auth/config";
import { notFound } from "next/navigation";
import { SharePublicPage } from "@/components/share/SharePublicPage";
import { CommentsSection } from "@/components/share/CommentsSection";
import { SpotReportButton } from "@/components/share/SpotReportButton";
import { buildPageAlternates, SITE_NAME, OG_LOCALE } from "@/lib/seo/site";
import type { Locale } from "@/i18n/routing";
import { routing } from "@/i18n/routing";
import { permissionAtLeast } from "@/lib/permissions/share-access";

interface Props {
  params: Promise<{ locale: string; token: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale: raw, token } = await params;
  const locale = (routing.locales.includes(raw as Locale) ? raw : routing.defaultLocale) as Locale;
  const share = await getShareByToken(token);
  const t = await getTranslations({ locale, namespace: "sharing" });

  const title =
    share?.location?.title ||
    share?.collection?.name ||
    share?.trip?.name ||
    t("shareTitle");

  const description = t("sharedVia");
  const path = `/share/${token}`;
  const alternates = buildPageAlternates(locale, path);

  const site = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ?? "";
  const ogImage = site
    ? `${site}/${locale}/share/${token}/opengraph-image`
    : undefined;

  return {
    title,
    description,
    robots: { index: false, follow: false },
    alternates,
    openGraph: {
      type: "website",
      siteName: SITE_NAME,
      locale: OG_LOCALE[locale],
      title: t("shareTitleNamed", { title }),
      description: t("shareOgDescription", { title }),
      url: alternates.canonical,
      ...(ogImage ? { images: [{ url: ogImage, width: 1200, height: 630 }] } : {}),
    },
    twitter: {
      card: "summary_large_image",
      title: t("shareTitleNamed", { title }),
      description: t("shareOgDescription", { title }),
      ...(ogImage ? { images: [ogImage] } : {}),
    },
  };
}

export default async function SharePage({ params }: Props) {
  const { token } = await params;
  const share = await getShareByToken(token);

  if (!share) notFound();
  if (share.expiresAt && share.expiresAt < new Date()) notFound();

  await recordShareView(token);

  const session = await auth();
  const comments = share.location ? await getCommentsForShareToken(token) : [];

  const isOwner = Boolean(session?.user?.id && session.user.id === share.sharedById);
  const isGrantee = Boolean(session?.user?.id && session.user.id === share.sharedWithId);
  const canComment =
    isOwner ||
    (isGrantee && permissionAtLeast(share.permission, "COMMENT")) ||
    // Public link with COMMENT+ (anyone signed in)
    (!share.sharedWithId && permissionAtLeast(share.permission, "COMMENT") && Boolean(session?.user?.id));

  return (
    <>
      <SharePublicPage share={share} />
      {share.location && (
        <div className="max-w-xl mx-auto px-4 pb-12 space-y-4">
          <CommentsSection
            locationId={share.location.id}
            initialComments={comments}
            currentUserId={session?.user?.id ?? undefined}
            canComment={canComment}
            shareToken={token}
          />
          <div className="flex justify-end">
            <SpotReportButton locationId={share.location.id} shareToken={token} />
          </div>
        </div>
      )}
    </>
  );
}
