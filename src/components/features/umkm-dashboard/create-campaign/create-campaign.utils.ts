import { calculatePlatformFee, calculateTotalPayment } from "@/types/domain";
import { CREATOR_GUIDELINES, type CreatorGuidelineItem } from "./create-campaign.constants";

export interface DerivedBudgetValues {
  platformFee: number;
  totalPayment: number;
  estimatedViews: number;
  budgetPerCreator: number;
  viewsPerCreator: number;
}

export function getDerivedBudgetValues(
  pricePerThousandViews: number,
  totalBudgetEscrow: number,
  creatorQuota: number
): DerivedBudgetValues {
  // Campaign top-up = buyer-side: UMKM membayar budget + fee.
  const platformFee = calculatePlatformFee(totalBudgetEscrow);
  const totalPayment = calculateTotalPayment(totalBudgetEscrow);
  
  const estimatedViews = pricePerThousandViews > 0 
    ? Math.round((totalBudgetEscrow / pricePerThousandViews) * 1000) 
    : 0;

  const budgetPerCreator = creatorQuota > 0 
    ? Math.round(totalBudgetEscrow / creatorQuota) 
    : 0;

  const viewsPerCreator = creatorQuota > 0 
    ? Math.round(estimatedViews / creatorQuota) 
    : 0;

  return {
    platformFee,
    totalPayment,
    estimatedViews,
    budgetPerCreator,
    viewsPerCreator,
  };
}

export const STEP_FIELD_ANCHORS: Record<string, string> = {
  // Step 1: Informasi Produk
  title: "campaign-title",
  thumbnailUrl: "field-thumbnailUrl",
  category: "field-category",
  type: "field-type",
  description: "campaign-description",
  location: "target-location",
  // Step 2: Brief & Arahan Kreator
  brief: "campaign-brief",
  videoStyle: "field-video-style",
  callToAction: "field-call-to-action",
  // Step 3: Tautan Folder Aset
  externalAssetUrl: "external-asset-url",
  // Step 4: Anggaran & Kuota
  pricePerThousandViews: "field-price-per-views",
  creatorQuota: "field-creator-quota",
  totalBudgetEscrow: "field-total-budget",
  // Step 5: Konfirmasi Escrow
  termsAgreed: "field-terms-agreed",
};

export function scrollToFirstInvalidField(errors: Record<string, string>): void {
  if (typeof document === "undefined") return;
  const errorKeys = Object.keys(errors);
  if (errorKeys.length === 0) return;

  for (const key of errorKeys) {
    const anchorId = STEP_FIELD_ANCHORS[key];
    if (!anchorId) continue;
    const element = document.getElementById(anchorId);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "center" });
      if ("focus" in element && typeof (element as HTMLElement).focus === "function") {
        (element as HTMLElement).focus({ preventScroll: true });
      }
      break;
    }
  }
}

export interface ParsedRequiredPoints {
  selectedReqGuidelines: string[];
  selectedRestGuidelines: string[];
  customRequiredPoints: string;
}

export function parseRequiredPoints(
  rawText: string,
  guidelines: CreatorGuidelineItem[] = CREATOR_GUIDELINES
): ParsedRequiredPoints {
  const reqPresetLabels = new Map<string, string>();
  const restPresetLabels = new Map<string, string>();

  guidelines.forEach((g) => {
    if (g.type === "required") {
      reqPresetLabels.set(g.label.toLowerCase().trim(), g.label);
    } else if (g.type === "restriction") {
      restPresetLabels.set(g.label.toLowerCase().trim(), g.label);
    }
  });

  const selectedReq: string[] = [];
  const selectedRest: string[] = [];
  const customLines: string[] = [];

  const rawLines = (rawText || "").split("\n");

  for (const raw of rawLines) {
    const trimmed = raw.trim();
    if (!trimmed) continue;

    const withoutBullet = trimmed.replace(/^[-•*]\s*/, "").trim();

    // Check for explicit Wajib prefix or exact preset match
    const reqPrefixMatch = withoutBullet.match(/^(?:wajib(?:\s+ditampilkan)?)\s*:?\s*(.+)$/i);
    const candidateReq = reqPrefixMatch ? reqPrefixMatch[1].trim() : withoutBullet;
    const matchedReqCanonical = reqPresetLabels.get(candidateReq.toLowerCase());

    if (matchedReqCanonical) {
      if (!selectedReq.includes(matchedReqCanonical)) {
        selectedReq.push(matchedReqCanonical);
      }
      continue;
    }

    // Check for explicit Hindari / Dilarang / Jangan prefix or exact preset match
    const restPrefixMatch = withoutBullet.match(/^(?:hindari|dilarang|jangan)\s*:?\s*(.+)$/i);
    const candidateRest = restPrefixMatch ? restPrefixMatch[1].trim() : withoutBullet;
    const matchedRestCanonical = restPresetLabels.get(candidateRest.toLowerCase());

    if (matchedRestCanonical) {
      if (!selectedRest.includes(matchedRestCanonical)) {
        selectedRest.push(matchedRestCanonical);
      }
      continue;
    }

    // Preserve non-preset line as custom point
    customLines.push(trimmed);
  }

  return {
    selectedReqGuidelines: selectedReq,
    selectedRestGuidelines: selectedRest,
    customRequiredPoints: customLines.join("\n"),
  };
}

export function formatCombinedRequiredPoints(
  selectedReq: string[],
  selectedRest: string[],
  customPoints: string
): string {
  const lines: string[] = [];
  selectedReq.forEach((r) => lines.push(`- Wajib: ${r}`));
  selectedRest.forEach((r) => lines.push(`- Hindari: ${r}`));
  if (customPoints && customPoints.trim()) {
    lines.push(customPoints.trim());
  }
  return lines.join("\n");
}


