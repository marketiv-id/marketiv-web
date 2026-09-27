import { z } from "zod";
import { requiredStringMax, currencyAmountIDR, integerCount } from "./common";

/**
 * Input paket rate card kreator (boundary service, memakai nama kolom skema:
 * output/deliveryDays/revisionLimit — bukan nama view-model deliverable/
 * estimatedDays/revisionCount). Mirror validatePackage di
 * 00_BACKEND/src/services/creator.service.ts.
 */
export const rateCardPackageSchema = z.object({
  // Batas = size kolom rate_card_packages di appwrite.config.json.
  name: requiredStringMax("Nama paket", 100),
  description: requiredStringMax("Deskripsi paket", 2000),
  output: requiredStringMax("Output hasil kerja", 2000),
  deliveryDays: integerCount("Durasi pengerjaan (hari)", 1),
  price: currencyAmountIDR(1000),
  revisionLimit: integerCount("Jumlah revisi", 0),
});

export type RateCardPackageInput = z.infer<typeof rateCardPackageSchema>;
