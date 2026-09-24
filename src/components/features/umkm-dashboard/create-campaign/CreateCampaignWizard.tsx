"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/providers/AuthProvider";
import { useCampaignAutoDraft } from "./create-campaign.autodraft";

// Subcomponents & steps
import { CampaignWizardHeader } from "./CampaignWizardHeader";
import { CampaignWizardStepper } from "./CampaignWizardStepper";
import { CampaignWizardLayout } from "./CampaignWizardLayout";
import { CampaignWizardFooter } from "./CampaignWizardFooter";
import { CampaignLivePreviewCard } from "./CampaignLivePreviewCard";
import { CampaignHealthChecklist } from "./CampaignHealthChecklist";

import { ProductInfoStep } from "./steps/ProductInfoStep";
import { BriefGuidelineStep } from "./steps/BriefGuidelineStep";
import { AssetLinkStep } from "./steps/AssetLinkStep";
import { BudgetQuotaStep } from "./steps/BudgetQuotaStep";
import { ReviewEscrowStep } from "./steps/ReviewEscrowStep";

// Cards & helpers
import { BriefQualityCard } from "./cards/BriefQualityCard";
import { BudgetCalculatorCard } from "./cards/BudgetCalculatorCard";
import { CampaignWizardState } from "./types";
import { validateStepFields, isStepCompleted } from "./create-campaign.validation";
import { scrollToFirstInvalidField } from "./create-campaign.utils";
import { TONE_OPTIONS, CTA_OPTIONS } from "./create-campaign.constants";
import { composeBriefDetail, packDoAndDontJson } from "@/lib/validations/campaign.schema";
import {
  createCampaignDraft,
  updateCampaignDraft,
  generateCampaignBrief,
  createCampaignPayment,
  publishCampaign,
} from "@/services/umkm/umkm-dashboard.service";
import type { RehydratedWizard } from "./create-campaign.rehydrate";
import { loadSnap } from "@/lib/midtrans/snap";
import { type CampaignType, calculateTotalPayment } from "@/types/domain";
import { formatCurrency } from "@/lib/formatters";
import { toast } from "sonner";

// Modals
import { SaveDraftModal } from "./modals/SaveDraftModal";
import { PaymentSimulationModal, SimulatedSnapModal } from "./modals/PaymentSimulationModal";
import { CampaignCreatedModal } from "./modals/CampaignCreatedModal";
import { DATA_SOURCE_CONFIG } from "@/config/data-source.config";

interface CreateCampaignWizardProps {
  /** Id campaign draft yang sudah ada. Saat diisi, wizard berjalan dalam mode edit. */
  campaignId?: string;
  /** State awal untuk seeding field — dari rehydrateWizard(). */
  initialState?: RehydratedWizard["state"];
  /** Meta awal (assetId, dll.) — dari rehydrateWizard(). */
  initialMeta?: RehydratedWizard["meta"];
}

export function CreateCampaignWizard({ campaignId, initialState, initialMeta }: CreateCampaignWizardProps = {}) {
  const router = useRouter();
  const { user } = useAuth();

  // Wizard state machine
  const [currentStep, setCurrentStep] = useState(1);
  const stepsCount = 5;

  // Form states — seeded dari initialState kalau dalam mode edit
  const [title, setTitle] = useState(initialState?.title ?? "");
  const [category, setCategory] = useState(initialState?.category ?? "");
  const [type, setType] = useState(initialState?.type ?? "");
  const [description, setDescription] = useState(initialState?.description ?? "");
  const [location, setLocation] = useState(initialState?.location ?? "");
  const [brief, setBrief] = useState(initialState?.brief ?? "");
  const [videoStyle, setVideoStyle] = useState(initialState?.videoStyle ?? "");
  const [requiredPoints, setRequiredPoints] = useState(initialState?.requiredPoints ?? "");
  const [callToAction, setCallToAction] = useState(initialState?.callToAction ?? "");
  const [hashtags, setHashtags] = useState(initialState?.hashtags ?? "");
  const [selectedDirections, setSelectedDirections] = useState<string[]>(initialState?.selectedDirections ?? []);
  const [externalAssetUrl, setExternalAssetUrl] = useState(initialState?.externalAssetUrl ?? "");
  const [assetNotes, setAssetNotes] = useState(initialState?.assetNotes ?? "");
  const [pricePerThousandViews, setPricePerThousandViews] = useState(initialState?.pricePerThousandViews ?? 0);
  const [totalBudgetEscrow, setTotalBudgetEscrow] = useState(initialState?.totalBudgetEscrow ?? 0);
  const [creatorQuota, setCreatorQuota] = useState(initialState?.creatorQuota ?? 0);
  const [termsAgreed, setTermsAgreed] = useState(false); // sengaja tidak di-seed — user wajib centang ulang

  // Validation state
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [stepValidationTried, setStepValidationTried] = useState<Record<number, boolean>>({});

  // AI brief state
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  /** Diisi hasil AI agar ikut tersimpan ke campaign_briefs saat draft dibuat. */
  const [aiObjective, setAiObjective] = useState("");
  const [aiGenerated, setAiGenerated] = useState(false);

  /** Id campaign draft yang sudah tertulis — mencegah create ganda saat bayar. */
  const [createdCampaignId, setCreatedCampaignId] = useState<string | null>(null);
  /**
   * Budget yang benar-benar tersimpan di baris draft.
   *
   * Bukan sekadar salinan `totalBudgetEscrow`: draft ditulis sekali lalu
   * saveDraft() mengembalikannya apa adanya, jadi kalau pengguna mengubah budget
   * setelah percobaan bayar yang gagal, nilai di layar tidak lagi sama dengan
   * nilai di DB. create-payment menolak selisih itu dengan 409, dan menolaknya
   * memang benar — yang harus dikirim adalah angka milik draft.
   */
  const [draftBudget, setDraftBudget] = useState<number | null>(null);

  // Modals state
  const [isDraftOpen, setIsDraftOpen] = useState(false);
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [isCreatedOpen, setIsCreatedOpen] = useState(false);
  const [isSimulatedSnapOpen, setIsSimulatedSnapOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Unified wizard state object
  const wizardState: CampaignWizardState = {
    title,
    category,
    type,
    description,
    location,
    brief,
    videoStyle,
    requiredPoints,
    callToAction,
    hashtags,
    selectedDirections,
    externalAssetUrl,
    assetNotes,
    pricePerThousandViews,
    totalBudgetEscrow,
    creatorQuota,
    termsAgreed,
  };

  const handleRestoreDraft = useCallback(
    (restored: Omit<CampaignWizardState, "termsAgreed">, restoredStep: number) => {
      if (restored.title !== undefined) setTitle(restored.title);
      if (restored.category !== undefined) setCategory(restored.category);
      if (restored.type !== undefined) setType(restored.type);
      if (restored.description !== undefined) setDescription(restored.description);
      if (restored.location !== undefined) setLocation(restored.location);
      if (restored.brief !== undefined) setBrief(restored.brief);
      if (restored.videoStyle !== undefined) setVideoStyle(restored.videoStyle);
      if (restored.requiredPoints !== undefined) setRequiredPoints(restored.requiredPoints);
      if (restored.callToAction !== undefined) setCallToAction(restored.callToAction);
      if (restored.hashtags !== undefined) setHashtags(restored.hashtags);
      if (restored.selectedDirections !== undefined) setSelectedDirections(restored.selectedDirections);
      if (restored.externalAssetUrl !== undefined) setExternalAssetUrl(restored.externalAssetUrl);
      if (restored.assetNotes !== undefined) setAssetNotes(restored.assetNotes);
      if (restored.pricePerThousandViews !== undefined) setPricePerThousandViews(restored.pricePerThousandViews);
      if (restored.totalBudgetEscrow !== undefined) setTotalBudgetEscrow(restored.totalBudgetEscrow);
      if (restored.creatorQuota !== undefined) setCreatorQuota(restored.creatorQuota);
      if (restoredStep && restoredStep >= 1 && restoredStep <= stepsCount) {
        setCurrentStep(restoredStep);
      }
    },
    [stepsCount]
  );

  const handleDiscardDraft = useCallback(() => {
    setTitle("");
    setCategory("");
    setType("");
    setDescription("");
    setLocation("");
    setBrief("");
    setVideoStyle("");
    setRequiredPoints("");
    setCallToAction("");
    setHashtags("");
    setSelectedDirections([]);
    setExternalAssetUrl("");
    setAssetNotes("");
    setPricePerThousandViews(5000);
    setTotalBudgetEscrow(3200000);
    setCreatorQuota(4);
    setTermsAgreed(false);
    setCurrentStep(1);
    setValidationErrors({});
    setStepValidationTried({});
    toast.success("Draf berhasil dihapus.");
  }, []);

  const { clearDraft } = useCampaignAutoDraft({
    userId: user?.userId || "umkm_local",
    campaignId,
    currentStep,
    state: wizardState,
    onRestoreDraft: handleRestoreDraft,
    onDiscardDraft: handleDiscardDraft,
    enabled: true,
  });

  // Real-time validations for checklist markers using validation helpers
  const productInfoValid = isStepCompleted(1, wizardState);
  const briefValid = isStepCompleted(2, wizardState);
  const assetValid = isStepCompleted(3, wizardState);
  const budgetValid = isStepCompleted(4, wizardState);
  const reviewValid = isStepCompleted(5, wizardState);

  // Validate step specific fields using validation helpers
  const validateStep = (step: number): boolean => {
    const errs = validateStepFields(step, wizardState);
    setValidationErrors(errs);
    setStepValidationTried((prev) => ({ ...prev, [step]: true }));
    return Object.keys(errs).length === 0;
  };

  const handleNext = () => {
    const errs = validateStepFields(currentStep, wizardState);
    setValidationErrors(errs);
    setStepValidationTried((prev) => ({ ...prev, [currentStep]: true }));

    if (Object.keys(errs).length === 0) {
      if (currentStep < stepsCount) {
        setCurrentStep((prev) => prev + 1);
        window.scrollTo({ top: 0, behavior: "smooth" });
      } else {
        // Last step: Buka modal konfirmasi sebelum lanjut ke Midtrans Snap
        setIsPaymentOpen(true);
      }
    } else {
      toast.warning("Harap lengkapi kolom wajib sebelum melanjutkan.");
      scrollToFirstInvalidField(errs);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handleSaveDraft = () => {
    setIsDraftOpen(true);
  };

  /**
   * Aksi eksplisit "Bantu dengan AI". Mengisi brief + poin wajib; TIDAK menimpa
   * videoStyle/callToAction karena itu pilihan enumerated user (AI mengembalikan
   * prosa, bukan id opsi).
   */
  /**
   * Aksi eksplisit "Bantu dengan AI". Mengisi brief + poin wajib; TIDAK menimpa
   * videoStyle/callToAction karena itu pilihan enumerated user (AI mengembalikan
   * prosa, bukan id opsi).
   */
  const handleGenerateAiBrief = async (selectedDirections?: string[]) => {
    if (brief.trim() && !window.confirm("Brief yang sudah Anda tulis akan ditimpa. Lanjutkan?")) {
      return;
    }
    setAiError(null);
    setIsGeneratingAi(true);

    let fullDescription = description;
    if (selectedDirections && selectedDirections.length > 0) {
      fullDescription += `\n\nPoin utama yang ingin ditekankan:\n- ${selectedDirections.join("\n- ")}`;
    }

    const res = await generateCampaignBrief({
      description: fullDescription,
      type: (type as CampaignType) || "ugc",
      productName: title || undefined,
      targetMarket: location || undefined,
      goal: CTA_OPTIONS.find((o) => o.id === callToAction)?.label,
      materials: externalAssetUrl.trim() ? [externalAssetUrl.trim()] : [],
    });
    setIsGeneratingAi(false);

    if (!res.success || !res.data) {
      setAiError(
        res.code === "validation"
          ? res.error ?? "Data belum cukup untuk menyusun brief."
          : "Layanan AI sedang tidak tersedia. Coba lagi nanti."
      );
      return;
    }

    const ai = res.data;
    setBrief(ai.briefDetail);
    setRequiredPoints(
      [
        ...ai.doAndDont.do.map((d) => `- ${d}`),
        ...ai.doAndDont.dont.map((d) => `- Dilarang: ${d}`),
      ].join("\n")
    );
    setAiObjective(ai.objective);
    setAiGenerated(true);
  };

  /**
   * Tulis campaign draft. Dipakai tombol "Simpan Draft" maupun jalur pembayaran
   * (campaign harus ada dulu supaya create-payment punya campaignId).
   *
   * Mode create: buat baris baru. Mode edit (`campaignId` prop ada): update baris
   * yang sudah ada. Setelah satu kali simpan sesi ini (`createdCampaignId` terisi),
   * operasi berikutnya mengembalikan id langsung (idempoten).
   */
  const saveDraft = async (): Promise<string | null> => {
    // Kolom wajib campaigns (title/category/type/description) = langkah 1.
    if (!isStepCompleted(1, wizardState)) {
      setCurrentStep(1);
      validateStep(1);
      toast.error("Lengkapi Informasi Produk (langkah 1) sebelum menyimpan draft.");
      return null;
    }

    const tone = TONE_OPTIONS.find((o) => o.id === videoStyle);
    const ctaOpt = CTA_OPTIONS.find((o) => o.id === callToAction);

    const draftInput = {
      title,
      category,
      type: type as CampaignType,
      description,
      budget: totalBudgetEscrow,
      rewardPer1000Views: pricePerThousandViews,
      claimLimit: creatorQuota,
      brief: {
        briefDetail: composeBriefDetail({
          brief,
          requiredPoints,
          hashtags,
          location,
          assetNotes,
          selectedDirections,
        }),
        contentAngle: tone ? `${tone.label} — ${tone.desc}` : videoStyle,
        cta: ctaOpt ? ctaOpt.label : callToAction,
        doAndDont: requiredPoints.trim() ? packDoAndDontJson(requiredPoints) : "",
        objective: aiObjective || undefined,
        generatedByAi: aiGenerated,
      },
      asset: externalAssetUrl.trim() ? { fileUrl: externalAssetUrl.trim() } : undefined,
    };

    const targetId = campaignId || createdCampaignId;
    const res = targetId
      ? await updateCampaignDraft(targetId, draftInput)
      : await createCampaignDraft(draftInput);

    if (res.success && res.data) {
      res.data.warnings.forEach((w) => toast.warning(w));
      setCreatedCampaignId(res.data.campaign.id);
      setDraftBudget(res.data.campaign.totalBudgetEscrow);
      return res.data.campaign.id;
    }

    toast.error(
      res.code === "auth"
        ? "Sesi berakhir, silakan login kembali."
        : res.error ?? "Gagal menyimpan draft. Coba lagi."
    );
    return null;
  };

  const handleConfirmDraft = async () => {
    setIsDraftOpen(false);
    setIsSubmitting(true);
    const id = await saveDraft();
    setIsSubmitting(false);
    if (!id) return;
    clearDraft();
    toast.success("Draft campaign berhasil disimpan.");
    router.push("/dashboard/umkm/campaign");
  };

  /**
   * Terbitkan campaign setelah pembayaran, dengan menunggu dana benar-benar
   * masuk.
   *
   * Dananya tidak muncul di `campaigns.remainingBudget` saat Snap menutup —
   * yang mengisinya adalah `create-escrow`, yang baru menyala setelah Midtrans
   * memanggil `midtrans-webhook`. Itu perjalanan server-ke-server yang bisa
   * makan beberapa detik. Karena itu di-poll, bukan diterbitkan langsung.
   *
   * Kalau poll habis, campaign SENGAJA dibiarkan sebagai draft dan pengguna
   * diberi tahu apa adanya — menandai campaign `active` tanpa dana adalah
   * kebohongan yang akan tampak sebagai kuota kreator yang tidak bisa dibayar.
   * Tombol "Terbitkan" di daftar campaign menjadi jalan keluarnya.
   */
  const publishAfterPayment = async (campaignId: string) => {
    const ATTEMPTS = 5;
    const GAP_MS = 2000;

    for (let i = 0; i < ATTEMPTS; i++) {
      await new Promise((r) => setTimeout(r, GAP_MS));

      const res = await publishCampaign(campaignId);
      if (res.success) {
        toast.success("Campaign berhasil diterbitkan dan kini tayang di Job Pool.");
        return true;
      }
      // "validation" = dana belum masuk; error lain tidak akan membaik dengan
      // menunggu, jadi berhenti mencoba.
      if (res.code !== "validation") break;
    }

    toast.info(
      "Pembayaran diterima, tapi dana belum tercatat di campaign. Campaign tersimpan sebagai draft — terbitkan dari daftar campaign setelah beberapa saat."
    );
    return false;
  };

  /**
   * Bayar: pastikan draft ada → create-payment → Snap → tunggu dana → terbitkan.
   */
  const handleConfirmPayment = async () => {
    setIsPaymentOpen(false);
    setIsSubmitting(true);

    const campaignId = await saveDraft();
    if (!campaignId) {
      setIsSubmitting(false);
      return;
    }

    const res = await createCampaignPayment({
      campaignId,
      budget: draftBudget ?? totalBudgetEscrow,
    });
    if (!res.success || !res.data) {
      setIsSubmitting(false);
      toast.error(
        res.code === "auth"
          ? "Sesi berakhir, silakan login kembali."
          : res.error ?? "Gagal membuat pembayaran. Draft Anda sudah tersimpan."
      );
      return;
    }

    const intent = res.data;
    clearDraft();

    // Snap token → buka popup pembayaran.
    if (intent.snapToken) {
      try {
        const snap = await loadSnap();
        setIsSubmitting(false);
        snap.pay(intent.snapToken, {
          onSuccess: () => {
            setIsCreatedOpen(true);
            void publishAfterPayment(campaignId);
          },
          onPending: () => {
            toast.info("Pembayaran menunggu konfirmasi. Campaign tetap tersimpan sebagai draft.");
            router.push("/dashboard/umkm/campaign");
          },
          onError: () => toast.error("Pembayaran gagal. Draft Anda tetap tersimpan."),
          onClose: () =>
            toast.info("Pembayaran dibatalkan. Campaign tersimpan sebagai draft."),
        });
      } catch (err) {
        setIsSubmitting(false);
        toast.error(err instanceof Error ? err.message : "Gagal membuka pembayaran.");
      }
      return;
    }

    // Hanya redirect URL → alihkan halaman.
    if (intent.redirectUrl) {
      window.location.assign(intent.redirectUrl);
      return;
    }

    // Mode demo booth: tampilkan Simulated Snap Modal interaktif
    if (DATA_SOURCE_CONFIG.useMockData) {
      setIsSubmitting(false);
      setCreatedCampaignId(campaignId);
      setIsSimulatedSnapOpen(true);
      return;
    }

    // Tidak ada keduanya (mock fallback) → tampilkan modal berhasil seperti sebelumnya.
    setIsSubmitting(false);
    setIsCreatedOpen(true);
  };

  const handleSuccessRedirect = () => {
    setIsCreatedOpen(false);
    router.push("/dashboard/umkm/campaign");
  };

  const handleResetWizard = () => {
    clearDraft();
    setIsCreatedOpen(false);
    setCurrentStep(1);
    setTitle("");
    setCategory("");
    setType("");
    setDescription("");
    setLocation("");
    setBrief("");
    setVideoStyle("");
    setRequiredPoints("");
    setCallToAction("");
    setHashtags("");
    setSelectedDirections([]);
    setExternalAssetUrl("");
    setAssetNotes("");
    setPricePerThousandViews(5000);
    setTotalBudgetEscrow(3200000);
    setCreatorQuota(4);
    setTermsAgreed(false);
    setValidationErrors({});
    setStepValidationTried({});
    setAiError(null);
    setAiObjective("");
    setAiGenerated(false);
    setCreatedCampaignId(null);
    setDraftBudget(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Render current active step form content
  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <ProductInfoStep
            title={title}
            onChangeTitle={setTitle}
            category={category}
            onChangeCategory={setCategory}
            type={type}
            onChangeType={setType}
            description={description}
            onChangeDescription={setDescription}
            location={location}
            onChangeLocation={setLocation}
            validationErrors={validationErrors}
          />
        );
      case 2:
        return (
          <BriefGuidelineStep
            brief={brief}
            onChangeBrief={setBrief}
            videoStyle={videoStyle}
            onChangeVideoStyle={setVideoStyle}
            requiredPoints={requiredPoints}
            onChangeRequiredPoints={setRequiredPoints}
            callToAction={callToAction}
            onChangeCallToAction={setCallToAction}
            hashtags={hashtags}
            onChangeHashtags={setHashtags}
            selectedDirections={selectedDirections}
            onChangeSelectedDirections={setSelectedDirections}
            validationErrors={validationErrors}
            onGenerateAi={handleGenerateAiBrief}
            isGeneratingAi={isGeneratingAi}
            aiError={aiError}
            canGenerateAi={description.trim().length >= 30}
            productCategory={category}
            aiGenerated={aiGenerated}
          />
        );
      case 3:
        return (
          <AssetLinkStep
            externalAssetUrl={externalAssetUrl}
            onChangeExternalAssetUrl={setExternalAssetUrl}
            assetNotes={assetNotes}
            onChangeAssetNotes={setAssetNotes}
            validationErrors={validationErrors}
          />
        );
      case 4:
        return (
          <BudgetQuotaStep
            pricePerThousandViews={pricePerThousandViews}
            onChangePricePerThousandViews={setPricePerThousandViews}
            totalBudgetEscrow={totalBudgetEscrow}
            onChangeTotalBudgetEscrow={setTotalBudgetEscrow}
            creatorQuota={creatorQuota}
            onChangeCreatorQuota={setCreatorQuota}
            validationErrors={validationErrors}
          />
        );
      case 5:
        return (
          <ReviewEscrowStep
            title={title}
            category={category}
            description={description}
            brief={brief}
            videoStyle={videoStyle}
            requiredPoints={requiredPoints}
            callToAction={callToAction}
            hashtags={hashtags}
            externalAssetUrl={externalAssetUrl}
            assetNotes={assetNotes}
            pricePerThousandViews={pricePerThousandViews}
            totalBudgetEscrow={totalBudgetEscrow}
            creatorQuota={creatorQuota}
            termsAgreed={termsAgreed}
            onChangeTermsAgreed={setTermsAgreed}
            onJumpToStep={setCurrentStep}
            validationErrors={validationErrors}
          />
        );
      default:
        return null;
    }
  };

  // Render sidebar contents dynamically based on active step status
  const renderSidebar = () => {
    return (
      <div className="space-y-4">
        {/* Live Preview Card (Always rendered to show visual progress) */}
        <CampaignLivePreviewCard
          title={title}
          category={category}
          brief={brief}
          pricePerThousandViews={pricePerThousandViews}
          totalBudgetEscrow={totalBudgetEscrow}
          creatorQuota={creatorQuota}
        />

        {/* Dynamic Insight Indicators */}
        {currentStep === 2 && (
          <BriefQualityCard
            campaignTitle={title}
            productCategory={category}
            productDescription={description}
            mainBrief={brief}
            callToAction={callToAction}
            externalAssetUrl={externalAssetUrl}
          />
        )}

        {currentStep === 4 && (
          <BudgetCalculatorCard
            pricePerThousandViews={pricePerThousandViews}
            totalBudgetEscrow={totalBudgetEscrow}
            creatorQuota={creatorQuota}
          />
        )}

        {/* Step Health Check indicator list */}
        <CampaignHealthChecklist
          currentStep={currentStep}
          productInfoValid={productInfoValid}
          briefValid={briefValid}
          assetValid={assetValid}
          budgetValid={budgetValid}
          reviewValid={reviewValid}
          stepValidationTried={stepValidationTried}
        />
      </div>
    );
  };

  return (
    <div className="pb-6 relative">
      {/* Wizard Header */}
      <CampaignWizardHeader
        onSaveDraft={handleSaveDraft}
        onCancel={() => router.push("/dashboard/umkm/campaign")}
      />

      {/* Wizard Stepper Checkpoints */}
      <CampaignWizardStepper
        currentStep={currentStep}
        stepsCount={stepsCount}
        productInfoValid={productInfoValid}
        briefValid={briefValid}
        assetValid={assetValid}
        budgetValid={budgetValid}
        reviewValid={reviewValid}
        stepValidationTried={stepValidationTried}
      />

      {/* Standardized Layout grid splitting forms and preview panels */}
      <CampaignWizardLayout sidebar={renderSidebar()}>
        <div className="space-y-6">
          {renderStepContent()}
          
          <CampaignWizardFooter
            currentStep={currentStep}
            stepsCount={stepsCount}
            onBack={handleBack}
            onNext={handleNext}
            isSubmitting={isSubmitting}
            totalPaymentText={formatCurrency(calculateTotalPayment(totalBudgetEscrow))}
          />
        </div>
      </CampaignWizardLayout>

      {/* Mount Modals */}
      {isDraftOpen && (
        <SaveDraftModal
          isOpen={isDraftOpen}
          onClose={() => setIsDraftOpen(false)}
          onConfirm={handleConfirmDraft}
        />
      )}

      {isPaymentOpen && (
        <PaymentSimulationModal
          isOpen={isPaymentOpen}
          onClose={() => setIsPaymentOpen(false)}
          onConfirm={handleConfirmPayment}
          totalBudgetEscrow={draftBudget ?? totalBudgetEscrow}
        />
      )}

      {isSimulatedSnapOpen && (
        <SimulatedSnapModal
          isOpen={isSimulatedSnapOpen}
          onClose={() => {
            setIsSimulatedSnapOpen(false);
            toast.info("Pembayaran dibatalkan. Campaign tersimpan sebagai draft.");
          }}
          grossAmount={calculateTotalPayment(draftBudget ?? totalBudgetEscrow)}
          itemName={title || "Deposit Escrow Kampanye Marketiv"}
          onSuccess={async () => {
            setIsSimulatedSnapOpen(false);
            if (createdCampaignId) {
              const res = await publishCampaign(createdCampaignId);
              if (res.success) {
                toast.success("Campaign berhasil diterbitkan dan kini tayang di Job Pool.");
              }
            }
            setIsCreatedOpen(true);
          }}
        />
      )}

      {isCreatedOpen && (
        <CampaignCreatedModal
          isOpen={isCreatedOpen}
          onConfirm={handleSuccessRedirect}
          onReset={handleResetWizard}
        />
      )}
    </div>
  );
}
