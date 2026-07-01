import { revalidatePath } from "next/cache";
import { routing } from "@/i18n/routing";

export function revalidateAppPaths(...suffixes: string[]) {
  for (const locale of routing.locales) {
    revalidatePath(`/${locale}/app`);
    for (const suffix of suffixes) {
      revalidatePath(`/${locale}${suffix}`);
    }
  }
}
