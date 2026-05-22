export interface CourseItem {
  id: string
  title: string
  subtitle: string
  instructor: string
  rating: number
  ratingCount: number
  price: string
  originalPrice: string
  badges: string[]
  imageUrl: string
  category: string
  description: string
  level: "Beginner" | "Intermediate" | "Advanced"
  durationHours: number
  lessons: number
  language: string
  lastUpdated: string
  whatYouLearn: string[]
  curriculum: string[]
}

export const courseCatalog: CourseItem[] = [
  {
    id: "trend-1",
    title: "AI Engineer Agentic Track: The Complete Agent & MCP Course",
    subtitle: "Ed Donner, Licency",
    instructor: "Ed Donner",
    rating: 4.7,
    ratingCount: 39719,
    price: "Rp129,000",
    originalPrice: "Rp169,000",
    badges: ["Premium", "Bestseller"],
    imageUrl: "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?q=80&w=1200&auto=format&fit=crop",
    category: "AI Engineering",
    description: "Build production-ready AI agents, tool integrations, and MCP workflows with practical labs and real-world patterns.",
    level: "Intermediate",
    durationHours: 18,
    lessons: 48,
    language: "English",
    lastUpdated: "February 2026",
    whatYouLearn: [
      "Design agent architectures and toolchains",
      "Create MCP tools and secure integrations",
      "Ship multi-step agent workflows",
      "Debug and monitor AI pipelines",
    ],
    curriculum: [
      "Agent fundamentals and design patterns",
      "Prompt routing and tool calling",
      "MCP setup and authentication",
      "Evaluation and monitoring",
      "Deployment playbook",
    ],
  },
  {
    id: "trend-2",
    title: "AI Engineer Core Track: LLM Engineering, RAG, QLoRA, ...",
    subtitle: "Licency, Ed Donner",
    instructor: "Ed Donner",
    rating: 4.7,
    ratingCount: 34560,
    price: "Rp129,000",
    originalPrice: "Rp169,000",
    badges: ["Premium", "Bestseller"],
    imageUrl: "https://images.unsplash.com/photo-1504384308090-c894fdcc538d?q=80&w=1200&auto=format&fit=crop",
    category: "LLM Engineering",
    description: "Master retrieval, fine-tuning, and LLM system design with hands-on engineering exercises.",
    level: "Intermediate",
    durationHours: 20,
    lessons: 52,
    language: "English",
    lastUpdated: "January 2026",
    whatYouLearn: [
      "RAG pipelines with vector search",
      "QLoRA and parameter-efficient tuning",
      "LLM evaluation strategies",
      "System design for LLM apps",
    ],
    curriculum: [
      "RAG foundations",
      "Embedding and indexing",
      "Fine-tuning workflows",
      "Safety and guardrails",
      "Production deployment",
    ],
  },
  {
    id: "trend-3",
    title: "Generative AI for Beginners",
    subtitle: "Aakriti E-Learning Academy",
    instructor: "Aakriti E-Learning Academy",
    rating: 4.5,
    ratingCount: 111895,
    price: "Rp129,000",
    originalPrice: "Rp169,000",
    badges: ["Premium", "Bestseller"],
    imageUrl: "https://images.unsplash.com/photo-1487058792275-0ad4aaf24ca7?q=80&w=1200&auto=format&fit=crop",
    category: "AI Basics",
    description: "Learn the core ideas of generative AI with simple projects, prompts, and real-world examples.",
    level: "Beginner",
    durationHours: 10,
    lessons: 24,
    language: "English",
    lastUpdated: "November 2025",
    whatYouLearn: [
      "Generative AI fundamentals",
      "Prompting basics",
      "Creative workflows",
      "Ethics and responsible usage",
    ],
    curriculum: [
      "Intro to generative AI",
      "Prompting workshop",
      "Use cases and tools",
      "Mini project",
    ],
  },
  {
    id: "trend-4",
    title: "100 Days of Code: The Complete Python Pro Bootcamp",
    subtitle: "Dr. Angela Yu",
    instructor: "Dr. Angela Yu",
    rating: 4.7,
    ratingCount: 423099,
    price: "Rp129,000",
    originalPrice: "Rp169,000",
    badges: ["Premium", "Bestseller"],
    imageUrl: "https://images.unsplash.com/photo-1522204523234-8729aa6e3d5f?q=80&w=1200&auto=format&fit=crop",
    category: "Python",
    description: "Build daily Python projects and master practical coding skills from fundamentals to advanced topics.",
    level: "Beginner",
    durationHours: 42,
    lessons: 100,
    language: "English",
    lastUpdated: "December 2025",
    whatYouLearn: [
      "Python fundamentals",
      "APIs and web scraping",
      "Data analysis basics",
      "Automation projects",
    ],
    curriculum: [
      "Python basics",
      "Intermediate projects",
      "APIs and automation",
      "Capstone projects",
    ],
  },
  {
    id: "trend-5",
    title: "Ultimate AWS Certified Solutions Architect Associate 2026",
    subtitle: "Stephane Maarek",
    instructor: "Stephane Maarek",
    rating: 4.7,
    ratingCount: 289163,
    price: "Rp129,000",
    originalPrice: "Rp169,000",
    badges: ["Premium", "Bestseller"],
    imageUrl: "https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?q=80&w=1200&auto=format&fit=crop",
    category: "Cloud",
    description: "Prepare for AWS SAA certification with architecture labs, practice exams, and real-world scenarios.",
    level: "Intermediate",
    durationHours: 24,
    lessons: 36,
    language: "English",
    lastUpdated: "March 2026",
    whatYouLearn: [
      "Core AWS services",
      "Architecting resilient systems",
      "Security and compliance",
      "Exam strategy and practice",
    ],
    curriculum: [
      "AWS foundations",
      "Networking and security",
      "High availability design",
      "Practice exams",
    ],
  },
  {
    id: "dev-1",
    title: "AI Coder: Complete Claude Code & Coding Agents Course",
    subtitle: "Licency, Ed Donner",
    instructor: "Ed Donner",
    rating: 4.7,
    ratingCount: 5352,
    price: "Rp109,000",
    originalPrice: "Rp149,000",
    badges: ["Premium", "Bestseller"],
    imageUrl: "https://images.unsplash.com/photo-1487014679447-9f8336841d58?q=80&w=1200&auto=format&fit=crop",
    category: "AI Development",
    description: "Build coding agents that accelerate delivery with prompts, tools, and automated workflows.",
    level: "Intermediate",
    durationHours: 14,
    lessons: 32,
    language: "English",
    lastUpdated: "October 2025",
    whatYouLearn: [
      "Agent-driven coding workflows",
      "Tooling and automation",
      "Code review acceleration",
      "Production best practices",
    ],
    curriculum: [
      "Agent setup",
      "Coding patterns",
      "Automation pipelines",
      "Deployment tips",
    ],
  },
  {
    id: "dev-2",
    title: "Claude Code - The Practical Guide",
    subtitle: "Academind by Maximilian Schwarzmuller",
    instructor: "Maximilian Schwarzmuller",
    rating: 4.6,
    ratingCount: 8257,
    price: "Rp109,000",
    originalPrice: "Rp149,000",
    badges: ["Premium"],
    imageUrl: "https://images.unsplash.com/photo-1515879218367-8466d910aaa4?q=80&w=1200&auto=format&fit=crop",
    category: "AI Tools",
    description: "A practical guide to Claude Code with hands-on examples and workflows for daily dev work.",
    level: "Beginner",
    durationHours: 9,
    lessons: 18,
    language: "English",
    lastUpdated: "September 2025",
    whatYouLearn: [
      "Claude setup and usage",
      "Prompting techniques",
      "Code refactoring",
      "Automation tips",
    ],
    curriculum: [
      "Getting started",
      "Prompt workflows",
      "Refactoring labs",
      "Mini projects",
    ],
  },
  {
    id: "dev-3",
    title: "OpenClaw: Run Powerful & Autonomous AI Agents Securely",
    subtitle: "Arnold Oberleiter",
    instructor: "Arnold Oberleiter",
    rating: 4.7,
    ratingCount: 725,
    price: "Rp109,000",
    originalPrice: "Rp149,000",
    badges: ["Premium", "Bestseller"],
    imageUrl: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?q=80&w=1200&auto=format&fit=crop",
    category: "AI Security",
    description: "Learn to run autonomous agents securely with guardrails, audits, and policy control.",
    level: "Advanced",
    durationHours: 16,
    lessons: 26,
    language: "English",
    lastUpdated: "August 2025",
    whatYouLearn: [
      "Secure agent execution",
      "Policy enforcement",
      "Audit logs and monitoring",
      "Threat modeling",
    ],
    curriculum: [
      "Security foundations",
      "Agent sandboxing",
      "Observability",
      "Compliance checks",
    ],
  },
  {
    id: "dev-4",
    title: "AI Builder: Create Agents, Voice Agents & Automations in n8n",
    subtitle: "Licency, Ed Donner",
    instructor: "Ed Donner",
    rating: 4.8,
    ratingCount: 2284,
    price: "Rp109,000",
    originalPrice: "Rp149,000",
    badges: ["Premium", "Bestseller"],
    imageUrl: "https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?q=80&w=1200&auto=format&fit=crop",
    category: "Automation",
    description: "Create multi-agent workflows in n8n, automate business tasks, and deploy reliably.",
    level: "Intermediate",
    durationHours: 12,
    lessons: 28,
    language: "English",
    lastUpdated: "July 2025",
    whatYouLearn: [
      "n8n workflow design",
      "Voice agent setup",
      "Automation best practices",
      "Monitoring and retries",
    ],
    curriculum: [
      "Workflow basics",
      "Agent building",
      "Integration patterns",
      "Deployment checklist",
    ],
  },
  {
    id: "dev-5",
    title: "AI Engineer Production Track: Deploy LLMs & Agents at Scale",
    subtitle: "Licency, Ed Donner",
    instructor: "Ed Donner",
    rating: 4.7,
    ratingCount: 2902,
    price: "Rp129,000",
    originalPrice: "Rp169,000",
    badges: ["Premium"],
    imageUrl: "https://images.unsplash.com/photo-1484417894907-623942c8ee29?q=80&w=1200&auto=format&fit=crop",
    category: "Production",
    description: "Deploy large-scale AI systems with reliability, observability, and cost controls.",
    level: "Advanced",
    durationHours: 22,
    lessons: 40,
    language: "English",
    lastUpdated: "June 2025",
    whatYouLearn: [
      "Scaling LLM infra",
      "Observability and tracing",
      "Cost optimization",
      "Reliability playbooks",
    ],
    curriculum: [
      "Infrastructure setup",
      "Scaling patterns",
      "Monitoring and alerts",
      "Cost management",
    ],
  },
]

export const trendingCourses = courseCatalog.filter((course) => course.id.startsWith("trend-"))
export const topDevelopmentCourses = courseCatalog.filter((course) => course.id.startsWith("dev-"))

export const getCourseById = (id: string) => courseCatalog.find((course) => course.id === id) || null

const normalizeCourseKey = (value: string) => {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
}

export const getCourseByParam = (param: string) => {
  const decoded = decodeURIComponent(param)
  const normalized = normalizeCourseKey(decoded)

  return (
    courseCatalog.find((course) => course.id === decoded) ||
    courseCatalog.find((course) => normalizeCourseKey(course.title) === normalized) ||
    null
  )
}
