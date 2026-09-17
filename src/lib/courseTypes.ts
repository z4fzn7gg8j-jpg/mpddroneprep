export interface SupplementReference {
  reference: string; // e.g. "Figure 23, Area 3" or "FAA-CT-8080-2H Legend 1"
  use: string;
}

export interface LessonSection {
  heading: string;
  body: string;
}

export interface WorkedExample {
  prompt: string;
  steps: string[];
  answer: string;
}

export interface KnowledgeCheckItem {
  q: string;
  choices: string[];
  answer: number; // index into choices
  explanation: string;
}

export interface RecommendedVideo {
  title: string;
  channel: string;
  url: string;
  use: string;
}

export interface CourseLesson {
  id: string;
  title: string;
  question_bank_categories: string[];
  estimated_minutes: number;
  learning_objectives: string[];
  supplement_references: SupplementReference[];
  lesson_sections: LessonSection[];
  visual_drills: string[];
  worked_examples: WorkedExample[];
  common_test_traps: string[];
  knowledge_check: KnowledgeCheckItem[];
  recommended_videos: RecommendedVideo[];
  mastery_standard: string;
  instructor_note?: string;
}

export interface CourseContent {
  project: string;
  content_version: string;
  important_2026_test_note: string;
  course_flow: string[];
  sources: Record<string, { title: string; url: string; note?: string }>;
  lessons: CourseLesson[];
}
