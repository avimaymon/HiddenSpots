import { getYearReview } from "@/lib/actions/year-review";
import { YearReviewClientPage } from "@/components/dashboard/YearReviewClientPage";

export default async function YearReviewPage() {
  const data = await getYearReview();
  return <YearReviewClientPage data={data} />;
}
