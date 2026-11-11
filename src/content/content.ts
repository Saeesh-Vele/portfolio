/**
 * Single source of truth for every piece of copy, every link and every number on the site.
 * Components import from here and never hardcode copy.
 *
 * Sources: Saeesh_Vele_Resume.pdf, the public GitHub READMEs/notebooks, and facts stated by
 * Saeesh directly. Nothing here is invented — unknowns are marked TODO and listed in `TODOS`.
 */

// ---------------------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------------------

export type ProjectTag = "data" | "ai" | "web";
export type ProjectStatus = "shipped" | "in progress";

export interface Project {
  slug: string;
  title: string;
  oneLiner: string;
  problem: string;
  /** 2–4 bullets. */
  built: string[];
  result: string;
  /** Extra line shown only inside the case-study panel. */
  detail?: string;
  stack: string[];
  repoUrl?: string;
  liveUrl?: string;
  tags: ProjectTag[];
  status: ProjectStatus;
  featured: boolean;
  /** Context label, e.g. "Built at BrainHeaters". */
  label?: string;
}

export interface MoreWorkItem {
  title: string;
  oneLiner: string;
  stack: string[];
  repoUrl: string;
  liveUrl?: string;
}

export interface Experience {
  slug: string;
  company: string;
  /** Short name used on the pipeline station panels. */
  station: string;
  role: string;
  start: string;
  end: string;
  mode: string;
  /** The two strongest bullets, from the resume. */
  bullets: string[];
  /** Per-role stack line, as given by Saeesh from the resume. */
  stack: string[];
  /** The role held today. */
  current?: boolean;
}

export interface Education {
  school: string;
  university: string;
  degree: string;
  start: string;
  end: string;
  cgpa: string;
}

export interface SkillGroup {
  label: string;
  items: string[];
}

export interface Stat {
  /** Final text, rendered on the server and with reduced motion. */
  value: string;
  label: string;
  /** Optional second line of context under the label. */
  note?: string;
  /** How the count-up animates towards `value`. */
  count: {
    to: number;
    decimals?: number;
    prefix?: string;
    suffix?: string;
    /** Render as an ordinal (1st, 2nd, 3rd). */
    ordinal?: boolean;
  };
}

export interface Achievement {
  title: string;
  event: string;
  detail: string;
}

export interface Certification {
  name: string;
  issuer: string;
  /** TODO(saeesh): credential links not on the resume. */
  credentialUrl?: string;
}

export interface NavLink {
  label: string;
  /** Section id: the `data-section` value the link scrolls to. */
  id: string;
}

// ---------------------------------------------------------------------------------------
// Site + identity
// ---------------------------------------------------------------------------------------

export const site = {
  name: "Saeesh Vele",
  particleName: "SAEESH VELE",
  monogram: "SV",
  role: "Data & AI Engineer",
  title: "Saeesh Vele — Data & AI Engineer",
  description:
    "Saeesh Vele is a final-year Computer Engineering student in Mumbai who builds data pipelines, dashboards and LLM-powered apps. Five internships, products used by 1,000+ students, 3rd of 1,000+ teams at NexBuildOn Hack 2026.",
  location: "Mumbai, India",
  graduation: "May 2027",
  resumePath: "/Saeesh_Vele_Resume.pdf",
  // TODO(saeesh): OG image not designed yet — add /public/og.png and wire it in layout.tsx.
  ogImage: undefined as string | undefined,
} as const;

const WHATSAPP_MESSAGE = "Hi Saeesh, I came across your portfolio and wanted to connect.";

export const contact = {
  email: "saeeshvele@gmail.com",
  emailHref: "mailto:saeeshvele@gmail.com",
  /** Link only. The phone number is never rendered as visible text. */
  whatsappHref: `https://wa.me/919561592734?text=${encodeURIComponent(WHATSAPP_MESSAGE)}`,
  linkedinHref: "https://linkedin.com/in/saeesh-vele-a523aa307",
  githubHref: "https://github.com/Saeesh-Vele",
  resumeHref: site.resumePath,
} as const;

// ---------------------------------------------------------------------------------------
// Chrome: nav, loader, hero
// ---------------------------------------------------------------------------------------

export const a11y = {
  skipToContent: "Skip to content",
  /** The real, visually hidden h1. The particle name is decorative. */
  heroHeading: "Saeesh Vele — Data & AI Engineer",
} as const;

export const nav = {
  homeLabel: "Saeesh Vele — back to top",
  /** Page order. Links whose section is not built yet render as unavailable. */
  links: [
    { label: "About", id: "about" },
    { label: "Experience", id: "experience" },
    { label: "Work", id: "work" },
    { label: "Contact", id: "contact" },
  ] satisfies NavLink[],
  resumeLabel: "Resume",
  ariaLabel: "Primary",
  menu: {
    open: "Menu",
    close: "Close",
    ariaLabel: "Site menu",
  },
} as const;

export const loader = {
  label: "PARSING RECORDS",
  from: 0,
  /** Matches the 50,000+ records per run collected at GoPerceptive. */
  to: 50000,
  ariaLabel: "Loading",
} as const;

export const hero = {
  eyebrow: "DATA & AI ENGINEER",
  /** Rendered line by line; `emphasis` words are set in Instrument Serif italic. */
  taglineLines: [
    [{ text: "I turn raw data into" }],
    [{ text: "products", emphasis: true }, { text: " people use." }],
  ] as { text: string; emphasis?: boolean }[][],
  tagline: "I turn raw data into products people use.",
  supportingLines: [
    "Pipelines, dashboards and LLM-powered apps —",
    "5 internships · 1,000+ users · 3rd of 1,000+ teams.",
  ],
  cta: {
    work: { label: "View work", target: "about" },
    resume: { label: "Resume", glyph: "↓", href: site.resumePath },
  },
  hud: {
    topLeft: "SV / 2026",
    clockZone: "IST",
    clockTimeZone: "Asia/Kolkata",
    clockLabel: "Local time in Mumbai",
    clockPlaceholder: "--:--:--",
    bottomLeft: "19.03°N 73.07°E — KHARGHAR, MUMBAI",
    status: "STATUS: OPEN TO ROLES",
  },
  scrollCue: "SCROLL",
} as const;

// ---------------------------------------------------------------------------------------
// About + numbers
// ---------------------------------------------------------------------------------------

export const about = {
  label: "02 / ABOUT",
  heading: "About",
  /**
   * REVIEW ME (saeesh): written from the facts in this file only. `emphasis` parts are set
   * in Instrument Serif italic.
   */
  bio: [
    {
      text: "I'm a final-year Computer Engineering student in Mumbai. I started with scrapers and overnight data pipelines, moved into analytics and KPI dashboards, then built LLM-powered products used by 1,000+ students. Today I work on the ",
    },
    { text: "training data", emphasis: true },
    { text: " behind robotics AI: annotating sensor data and evaluating LLM outputs." },
  ] as { text: string; emphasis?: boolean }[],
  educationLabel: "EDUCATION",
  educationLine: [
    "B.E. Computer Engineering",
    "Saraswati College of Engineering (University of Mumbai)",
    "2023–2027",
    "CGPA 9.1",
  ],
} as const;

export const stats: Stat[] = [
  { value: "5", label: "internships", count: { to: 5 } },
  { value: "1.5+", label: "years experience", count: { to: 1.5, decimals: 1, suffix: "+" } },
  { value: "1,000+", label: "students used my work", count: { to: 1000, suffix: "+" } },
  {
    value: "3rd",
    label: "of 1,000+ teams",
    note: "NexBuildOn Hack 2026",
    count: { to: 3, ordinal: true },
  },
  { value: "9.1", label: "CGPA", count: { to: 9.1, decimals: 1 } },
  {
    value: "~8",
    label: "hrs/week saved by automation",
    note: "Exide",
    count: { to: 8, prefix: "~" },
  },
];

// ---------------------------------------------------------------------------------------
// Experience — newest first, transcribed from the resume
// ---------------------------------------------------------------------------------------

export const experience: Experience[] = [
  {
    slug: "autonex",
    company: "Autonex AI 360 Pvt. Ltd.",
    station: "Autonex AI",
    role: "Robotics Annotator Intern",
    start: "Sep 2026",
    end: "Present",
    mode: "Hybrid",
    bullets: [
      "Annotate robotics sensor data (images, video, LiDAR) on Encord to train and evaluate robotic perception and control models, including object-handling and simulation workflows.",
      "Evaluate LLM explanations of time-series sensor data (HVAC, atmospheric CO2, wearable physiology, EKG) claim by claim for physical correctness, and write gold-standard reference explanations.",
    ],
    stack: ["Encord", "LiDAR / image / video annotation", "LLM evaluation"],
    current: true,
  },
  {
    slug: "brainheaters",
    company: "BrainHeaters",
    station: "BrainHeaters",
    role: "AI Full Stack Developer Intern",
    start: "Jun 2026",
    end: "Aug 2026",
    mode: "Remote",
    bullets: [
      "Architected a hybrid recommendation engine (rule-based categorization + DeepSeek LLM) for personalized study suggestions on an EdTech platform (Next.js, TypeScript, MongoDB) used by 1,000+ students during peak exam season, with caching and analytics logging.",
      "Built an interactive DSA learning platform with a flowchart roadmap, XP system, LLM path generator (OpenRouter), a 16-pattern algorithm visualizer and an AI complexity analyzer.",
    ],
    stack: ["Next.js", "TypeScript", "MongoDB", "DeepSeek", "OpenRouter"],
  },
  {
    slug: "exide",
    company: "Exide Industries Ltd., Taloja",
    station: "Exide Industries",
    role: "Software Developer Intern",
    start: "Dec 2025",
    end: "May 2026",
    mode: "Navi Mumbai, India",
    bullets: [
      "Built internal tools for production data and inventory tracking at a large-scale battery manufacturing plant.",
      "Automated Python and SQL reporting pipelines for production, vendor dispatch and QC metrics, replacing manual spreadsheet reports and saving ~8 hours per week; built KPI dashboards used by production, QA and logistics teams.",
    ],
    stack: ["Python", "SQL", "KPI dashboards"],
  },
  {
    slug: "labmentix",
    company: "Labmentix",
    station: "Labmentix",
    role: "Data Analytics Intern",
    start: "Jul 2025",
    end: "Nov 2025",
    mode: "Remote",
    bullets: [
      "Delivered end-to-end analytics (cleaning, EDA, reporting) across multiple projects on retail datasets of 100K+ records each using Python (Pandas, NumPy) and SQL.",
      "Classified and structured product data to client-specific taxonomies using RegEx-based tagging.",
    ],
    stack: ["Python", "Pandas", "NumPy", "SQL", "RegEx"],
  },
  {
    slug: "goperceptive",
    company: "GoPerceptive Technologies LLP",
    station: "GoPerceptive",
    role: "Software Developer Intern",
    start: "Feb 2025",
    end: "Jun 2025",
    mode: "Remote",
    bullets: [
      "Built Scrapy and Selenium pipelines that ran unattended overnight to collect 50,000+ product records per run from multiple e-commerce platforms.",
      "Cleaned, validated and mapped scraped data to client categories with RegEx, reducing manual processing.",
    ],
    stack: ["Python", "Scrapy", "Selenium", "RegEx"],
  },
];

/** Oldest first: the order the pipeline stations are visited in. */
export const experienceChronological: Experience[] = [...experience].reverse();

export const experienceSection = {
  label: "03 / EXPERIENCE",
  heading: "Experience",
  /** Readout prefix: "STATION 03 / 05". */
  stationLabel: "STATION",
  /** Tag carried by the current station. */
  nowTag: "NOW",
  stackLabel: "STACK",
  periodSeparator: "—",
} as const;

export const education: Education[] = [
  {
    school: "Saraswati College of Engineering, Kharghar",
    university: "University of Mumbai",
    degree: "Bachelor of Engineering in Computer Engineering",
    start: "Aug 2023",
    end: "May 2027",
    cgpa: "9.1 / 10",
  },
];

// ---------------------------------------------------------------------------------------
// Projects — featured order: RogRakshak, ShikshaSetu, PredictX, BH.DSA, NeuroPhysio, SatQuery
// ---------------------------------------------------------------------------------------

export const projects: Project[] = [
  {
    slug: "rograkshak",
    title: "RogRakshak (Infectra)",
    oneLiner:
      "Hospital infection tracing: a Neo4j contact graph with a LangGraph + Gemini layer that reconstructs how an outbreak spread.",
    problem:
      "Tracing a hospital-acquired infection means connecting patients, wards, staff contact and lab cultures over time — relationships that sit awkwardly in tables and naturally in a graph.",
    built: [
      "Neo4j graph of ward co-locations, staff interactions and multi-hop transmission chains, alongside clinical records in Supabase Postgres.",
      "LangGraph + Gemini multi-agent workflow (surveillance, epidemiology, genomics and briefing agents) that reconstructs exposure pathways.",
      "Next.js dashboard with an interactive contact graph and patient-journey timelines, served by a FastAPI backend.",
      "Supabase authentication with a closed-signup model; deployed on Vercel and Render.",
    ],
    result: "3rd place of 1,000+ teams at NexBuildOn Hack 2026.",
    stack: ["Next.js", "FastAPI", "Neo4j", "Supabase", "LangGraph", "Gemini"],
    repoUrl: "https://github.com/Saeesh-Vele/RogRakshak",
    // TODO(saeesh): live URL (Vercel) to be sent later.
    liveUrl: undefined,
    tags: ["ai", "data", "web"],
    status: "shipped",
    featured: true,
  },
  {
    slug: "shikshasetu",
    title: "ShikshaSetu",
    oneLiner:
      "AI career guidance platform that turns psychometric assessments into personalized career recommendations.",
    problem:
      "Career and college guidance for Indian students in Classes 10–12 and beyond, personalized to the student instead of generic.",
    built: [
      "AI psychometric assessments that feed personalized career recommendations.",
      "AI mock-interview module and AI-generated career roadmaps.",
      "College recommendation engine with a map-based college explorer.",
    ],
    result: "Pilot-tested with 100+ students.",
    stack: ["Next.js", "React", "Tailwind CSS", "Gemini", "Groq", "Firebase"],
    repoUrl: "https://github.com/Saeesh-Vele/ShikshaSetu-",
    liveUrl: "https://shiksha-setu-dun.vercel.app",
    tags: ["ai", "web"],
    status: "shipped",
    featured: true,
  },
  {
    slug: "predictx",
    title: "PredictX — Cricket Intelligence System",
    oneLiner:
      "Player-performance modelling on 1,095 IPL matches (2008–2024) and 260,759 ball-by-ball rows, with a leak-free time split and SHAP explanations.",
    problem:
      "Predicting a batsman's runs and a bowler's wickets in their next IPL match from ball-by-ball history, without letting future matches leak into training.",
    built: [
      "Cleaning pipeline over 260,759 ball-by-ball rows, aggregated into 15,842 batsman-match and 12,448 bowler-match rows.",
      "Engineered player-match features: rolling 5- and 10-match form, career, venue and versus-team averages, player-versus-player history and a pressure index.",
      "Leak-free time-based split (train before 2023, test 2023 onward); Random Forest and LightGBM compared against a rolling-average baseline.",
      "Streamlit app with SHAP explanations, 95% prediction intervals, live match context and PDF reports.",
    ],
    result:
      "End-to-end pipeline from raw deliveries to an explainable Streamlit app: 1,095 matches, engineered player-match features, time-based evaluation against a rolling-average baseline.",
    detail:
      "Beats the rolling-average baseline on both targets — runs MAE 16.34 vs 16.99, wickets MAE 0.83 vs 0.89.",
    stack: ["Python", "Pandas", "scikit-learn", "LightGBM", "XGBoost", "SHAP", "Streamlit"],
    repoUrl: "https://github.com/Saeesh-Vele/CRICKET_INTELLIGENCE_SYSTEM",
    tags: ["data"],
    status: "shipped",
    featured: true,
  },
  {
    slug: "bh-dsa",
    title: "BH.DSA",
    oneLiner:
      "Interactive DSA learning platform: a flowchart roadmap, XP and levels, an LLM path generator and a 16-pattern algorithm visualizer.",
    problem:
      "Learning data structures and algorithms as a guided path with visible progress, instead of an unordered list of problems.",
    built: [
      "Flowchart roadmap with an XP and levels system.",
      "LLM path generator using DeepSeek via OpenRouter at ~$0.003 per generation.",
      "16-pattern algorithm visualizer.",
      "AI complexity analyzer.",
    ],
    // TODO(saeesh): no usage or outcome figure known for BH.DSA.
    result: "Built during the BrainHeaters internship, Jun–Aug 2026.",
    // TODO(saeesh): confirm the framework/database used for BH.DSA before listing them.
    stack: ["DeepSeek", "OpenRouter"],
    tags: ["ai", "web"],
    status: "shipped",
    featured: true,
    label: "Built at BrainHeaters",
  },
  {
    slug: "neurophysio",
    title: "NeuroPhysio AI",
    oneLiner:
      "Rehabilitation platform with real-time pose detection and low-latency exercise feedback over WebSocket.",
    problem:
      "Giving a patient form feedback during a physiotherapy exercise needs pose tracking and coaching fast enough to feel live.",
    built: [
      "Real-time pose detection with TensorFlow MoveNet (17 keypoints) behind a FastAPI + WebSocket backend.",
      "Joint-angle computation, rep counting and form-correction feedback across a 52-exercise library.",
      "Gemini and Groq recovery insights, with Firebase auth.",
    ],
    result:
      "Low-latency exercise feedback from a webcam: keypoints, joint angles, rep counts and form cues streamed over WebSocket.",
    stack: ["FastAPI", "React", "TypeScript", "TensorFlow", "Firebase", "Gemini", "Groq"],
    repoUrl: "https://github.com/Saeesh-Vele/NeuroPhysio-AI-",
    tags: ["ai", "web"],
    status: "shipped",
    featured: true,
  },
  {
    slug: "satquery",
    title: "SatQuery AI",
    oneLiner:
      "Agentic vision-language assistant for satellite imagery: LoRA fine-tuned LLaVA-1.5-7B on EuroSAT behind a LangGraph controller.",
    problem:
      "Asking a plain-language question about satellite imagery and getting an answer with a trace of every step the system took.",
    built: [
      "LangGraph controller that classifies the question, validates it against the uploaded imagery, routes to the right model and logs an execution trace.",
      "LoRA fine-tuned LLaVA-1.5-7B on EuroSAT (r=16, alpha=32, attention projections only).",
      "FastAPI service streaming each step over SSE to a Next.js console; MongoDB for query history and traces.",
    ],
    result:
      "In progress for Smart India Hackathon 2026. The v1 adapter proves the fine-tuning path end to end, with EuroSAT as a stand-in dataset.",
    stack: ["Python", "LLaVA-1.5", "LoRA (PEFT)", "LangGraph", "FastAPI", "Next.js", "MongoDB"],
    repoUrl: "https://github.com/Saeesh-Vele/SIH2026",
    tags: ["ai", "data"],
    status: "in progress",
    featured: true,
  },
  {
    slug: "study-recommendations",
    title: "Study recommendation engine",
    oneLiner:
      "Hybrid recommendation engine (rule-based categorization + DeepSeek LLM) for personalized study suggestions on an EdTech platform.",
    problem:
      "Suggesting what each student should study next on an EdTech platform, personalized, during peak exam season.",
    built: [
      "Hybrid engine: rule-based categorization first, DeepSeek LLM for the personalized suggestions.",
      "Dismiss controls, analytics logging and caching.",
    ],
    result: "Used by 1,000+ students during peak exam season.",
    stack: ["Next.js", "TypeScript", "MongoDB", "DeepSeek"],
    tags: ["ai", "web"],
    status: "shipped",
    featured: false,
    label: "Built at BrainHeaters",
  },
];

export const featuredProjects = projects.filter((p) => p.featured);

/** Compact list for a later phase. Not featured, not part of the 3D project graph. */
export const moreWork: MoreWorkItem[] = [
  {
    title: "AURORA",
    oneLiner:
      "Physics-informed digital twin of India's Antarctic research stations Maitri and Bharati, driven by ERA5 reanalysis weather, with residual-based anomaly detection. A prototype for a Smart India Hackathon problem statement.",
    stack: ["React", "three.js", "FastAPI", "Python", "Docker"],
    repoUrl: "https://github.com/Saeesh-Vele/SIH2026A",
    liveUrl: "https://aurora-sih.centralindia.cloudapp.azure.com",
  },
  {
    title: "ExamFlow AI",
    oneLiner:
      "Adaptive exam study planner: parses an exam timetable from a photo, PDF or DOCX and generates a day-by-day study schedule with risk and readiness tracking.",
    stack: ["Next.js", "TypeScript", "Tailwind CSS", "Zustand", "Tesseract.js", "Groq"],
    repoUrl: "https://github.com/Saeesh-Vele/AI-EXAM-PLANNER",
    liveUrl: "https://ai-exam-planner-lemon.vercel.app",
  },
  {
    title: "Syllabus Parser",
    oneLiner:
      "Pilot pipeline that turns Mumbai University syllabus PDFs into one structured JSON file per subject, with a validation report.",
    stack: ["Python", "pdfplumber", "TypeScript", "OpenRouter", "MongoDB"],
    repoUrl: "https://github.com/Saeesh-Vele/Syllabus-Parser",
  },
  {
    title: "Ola ride analytics",
    oneLiner:
      "Analysis of Ola ride data: demand patterns, booking status and cancellations, revenue by payment method and vehicle-type utilization.",
    stack: ["Python"],
    repoUrl: "https://github.com/Saeesh-Vele/ola-ride-analytics",
  },
];

// ---------------------------------------------------------------------------------------
// Skills, achievements, certifications
// ---------------------------------------------------------------------------------------

export const skills: SkillGroup[] = [
  {
    label: "Languages",
    items: ["Python", "TypeScript", "JavaScript", "Java", "SQL", "HTML", "CSS"],
  },
  {
    label: "Web & Backend",
    items: [
      "React",
      "Next.js",
      "Node.js",
      "Express.js",
      "FastAPI",
      "REST APIs",
      "WebSockets",
      "Tailwind CSS",
    ],
  },
  {
    label: "AI / ML",
    items: [
      "LLM Integration",
      "Prompt Engineering",
      "LangGraph",
      "Gemini",
      "DeepSeek",
      "Groq",
      "OpenRouter",
      "TensorFlow",
      "Scikit-learn",
    ],
  },
  {
    label: "Data",
    items: [
      "Pandas",
      "NumPy",
      "EDA",
      "Web Scraping (Scrapy, Selenium)",
      "RegEx",
      "Encord",
      "LiDAR/Image/Video Annotation",
      "LLM Evaluation",
    ],
  },
  {
    label: "Databases & Cloud",
    items: [
      "MongoDB",
      "MySQL",
      "Neo4j",
      "Supabase",
      "Firebase",
      "Google Cloud",
      "Vercel",
      "Render",
    ],
  },
  {
    label: "Tools & Practices",
    items: [
      "Git",
      "GitHub",
      "Postman",
      "Jupyter",
      "Excel",
      "Agile",
      "DSA",
      "OOP",
      "System Design",
    ],
  },
];

export const achievements: Achievement[] = [
  {
    title: "3rd Place of 1,000+ teams",
    event: "NexBuildOn Hack 2026",
    detail: "RogRakshak (Infectra), a hospital infection tracing system.",
  },
];

/** Names only — the resume gives no dates. credentialUrl is a TODO for every entry. */
export const certifications: Certification[] = [
  { name: "Microsoft Azure AI Fundamentals (AI-900)", issuer: "Microsoft", credentialUrl: undefined },
  { name: "Google Generative AI", issuer: "Google", credentialUrl: undefined },
  { name: "Full Stack Web Dev", issuer: "100xDevs", credentialUrl: undefined },
  { name: "Alpha DSA with Java", issuer: "Apna College", credentialUrl: undefined },
];

// ---------------------------------------------------------------------------------------
// Open items for Saeesh
// ---------------------------------------------------------------------------------------

export const TODOS: string[] = [
  "OG image: design /public/og.png and set site.ogImage.",
  "RogRakshak: live URL.",
  "BH.DSA: framework/database stack and any usage figure.",
  "Certifications: credential URLs.",
  "NEXT_PUBLIC_SITE_URL: set to the production domain when deployed.",
];
