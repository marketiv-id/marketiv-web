export interface LandingLink {
  label: string;
  href: string;
}

// A sentence split into runs so a phrase can be underlined or accented without HTML in content.
export interface LandingTextRun {
  text: string;
  mark?: boolean;
}

export interface LandingNavContent {
  skipLink: string;
  mainLabel: string;
  homeLabel: string;
  openMenuLabel: string;
  closeMenuLabel: string;
  audienceUmkm: LandingLink;
  audienceKreator: LandingLink;
  menu: LandingLink[];
  menuLabel: string;
  closeLabel: string;
  login: string;
  register: string;
  registerMobile: string;
  dashboard: string;
  clockCity: string;
  mobileCtaUmkm: LandingLink;
  mobileCtaKreator: LandingLink;
}

export type HeroChipTone = "navy" | "white" | "orange";

export interface HeroChip {
  label: string;
  value: string;
  tone: HeroChipTone;
}

export interface HeroContent {
  eyebrow: string;
  titleLead: string;
  titleRest: string;
  titleAccent: string;
  subtitle: string;
  ctaUmkm: string;
  ctaCreator: string;
  dashboardCta: string;
  note: string;
  backdropWord: string;
  sampleLabel: string;
  chips: HeroChip[];
  phone: {
    title: string;
    subtitle: string;
    image: string;
    imageAlt: string;
  };
}

export interface ProblemContent {
  label: string;
  statement: LandingTextRun[];
  umkm: { title: string; items: string[] };
  kreator: { title: string; items: string[] };
}

export type PillarIcon = "chart" | "shield" | "users";

export interface PillarsContent {
  label: string;
  titleLead: string;
  titleAccent: string;
  items: { no: string; title: string; description: string; icon: PillarIcon }[];
}

export interface ModePanel {
  id: string;
  tag: string;
  title: string;
  audience: string;
  steps: string[];
  rules: string[];
  tone: "umkm" | "kreator";
}

export interface ModesContent {
  label: string;
  titleLead: string;
  titleAccent: string;
  campaign: ModePanel;
  rateCard: ModePanel;
  compare: {
    caption: string;
    headers: [string, string, string];
    rows: [string, string, string][];
  };
}

export interface EscrowStep {
  title: string;
  description: string;
  stamp: string | null;
}

export interface EscrowContent {
  label: string;
  titleLead: string;
  titleAccent: string;
  steps: EscrowStep[];
  receipt: {
    title: string;
    code: string;
    rows: { label: string; value: string }[];
    totalLabel: string;
    totalValue: string;
    sampleLabel: string;
  };
  disputeNote: string;
}

export interface PreviewContent {
  label: string;
  titleLead: string;
  titleAccent: string;
  intro: string;
  caption: string;
  scrollHint: string;
  panels: { id: string; tag: string; title: string; description: string; image: string; alt: string }[];
}

export interface UmkmContent {
  label: string;
  titleLead: string;
  titleAccent: string;
  points: string[];
  cta: string;
  brief: {
    title: string;
    productLabel: string;
    productValue: string;
    budgetLabel: string;
    budgetValue: string;
    rateLabel: string;
    rateValue: string;
    aiLabel: string;
    aiText: string;
    sampleLabel: string;
  };
}

export interface JobCard {
  id: string;
  title: string;
  brand: string;
  category: string;
  platform: string;
  rate: string;
  quota: string;
}

export interface KreatorContent {
  label: string;
  titleLead: string;
  titleAccent: string;
  points: string[];
  cta: string;
  jobsTitle: string;
  jobsSampleLabel: string;
  jobCta: string;
  jobLabels: {
    badge: string;
    category: string;
    platform: string;
    quota: string;
    perViews: string;
    previous: string;
    next: string;
  };
  jobs: JobCard[];
  simulator: {
    title: string;
    viewsLabel: string;
    rateLabel: string;
    resultLabel: string;
    formulaLabel: string;
    note: string;
    defaultViews: number;
    minViews: number;
    maxViews: number;
    stepViews: number;
    defaultRate: number;
    minRate: number;
    maxRate: number;
  };
}

export interface ContextContent {
  label: string;
  titleLead: string;
  titleAccent: string;
  facts: string[];
  mapLabel: string;
  mapCity: string;
  mapRegion: string;
  coordinates: string;
  categoriesTop: string[];
  categoriesBottom: string[];
}

export interface FaqContent {
  label: string;
  title: string;
  items: { q: string; a: string }[];
}

export interface FinalCtaContent {
  titleLead: string;
  titleAccent: string;
  subtitle: string;
  umkm: { prompt: string; cta: string };
  kreator: { prompt: string; cta: string };
}

export interface FooterContent {
  tagline: string;
  liveLine: { prefix: string; suffix: string; city: string };
  nav: { title: string; links: LandingLink[] };
  legal: { title: string; links: LandingLink[] };
  contact: { title: string; email: string; instagram: string; instagramHref: string };
  program: string;
  copyright: string;
  wordmark: string;
}

export interface LandingContent {
  hero: HeroContent;
  problem: ProblemContent;
  pillars: PillarsContent;
  modes: ModesContent;
  escrow: EscrowContent;
  preview: PreviewContent;
  umkm: UmkmContent;
  kreator: KreatorContent;
  context: ContextContent;
  faq: FaqContent;
  finalCta: FinalCtaContent;
  footer: FooterContent;
}
