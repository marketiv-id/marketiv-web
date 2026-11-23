import { executeAdminFunction } from "@/lib/admin/execute-function";
import { FUNCTION_IDS } from "@/lib/admin/appwrite";
import { callAdminApi } from "@/lib/api/call-api";

export type DeliverableDecision = "valid" | "invalid";
export interface RateCardValidationItem { id:string; orderId:string; version:number; source:string; evidenceUrl:string; notes?:string; submittedAt:string; creatorId:string; umkmId:string; projectTitle:string; }
export async function getRateCardValidationQueue(): Promise<RateCardValidationItem[]> { const body=await callAdminApi("getAdminRatecardDeliverableQueue",{},isQueue,"Gagal memuat antrean validasi Rate Card."); return body.items; }
// TODO(fase-07): tulis masih lewat Function Appwrite `review-ratecard-deliverable`;
// pindah ke POST /api/admin/ratecard-deliverables/[id]/review.
export async function reviewRateCardDeliverable(deliverableId:string, decision:DeliverableDecision, notes:string) { return executeAdminFunction(FUNCTION_IDS.reviewRatecardDeliverable,{deliverableId,decision,notes},isReview,"Gagal menyimpan keputusan validasi."); }
function isQueue(v:unknown):v is {items:RateCardValidationItem[];total:number}{return !!v&&typeof v==="object"&&Array.isArray((v as {items?:unknown}).items);}
function isReview(v:unknown):v is {success:true;deliverableId:string;decision:DeliverableDecision;reviewedAt:string}{const x=v as Record<string,unknown>;return !!x&&x.success===true&&typeof x.deliverableId==="string"&&(x.decision==="valid"||x.decision==="invalid");}
