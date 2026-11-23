import { callApi } from "@/lib/api/call-api";
import { failFromError, noData, ok } from "@/services/shared/service-result";
import type { ServiceResult } from "@/types/domain";
import type { RatecardReview } from "@/types/ratecard-review.types";

export async function getUmkmRatecardReviews(): Promise<ServiceResult<RatecardReview[]>> {
  try {
    const reviews = await callApi<RatecardReview[]>("umkmRatecardReviews", {});
    return ok(reviews);
  } catch (err) {
    return failFromError<RatecardReview[]>(err, [], "getUmkmRatecardReviews");
  }
}

export async function getUmkmRatecardReview(
  orderId: string,
): Promise<ServiceResult<RatecardReview>> {
  const empty = noData<RatecardReview>();
  try {
    const review = await callApi<RatecardReview>("umkmRatecardReviews", { orderId });
    return ok(review);
  } catch (err) {
    return failFromError<RatecardReview>(err, empty, "getUmkmRatecardReview");
  }
}
