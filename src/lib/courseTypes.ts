export interface SupplementReference {
  reference: string; // e.g. "Figure 23, Area 3" or "FAA-CT-8080-2H Legend 1"
  use: string;
}

export interface InlineResource {
  type: string; // e.g. "faa_supplement"
  reference: string; // e.g. "Figure 22" -- resolved to a bundled figure via courseFigures.ts
  label: string;
  note?: string;
  url: string;
}

export interface LessonSection {
  heading: string;
  body: string;
  inline_resource?: InlineResource; // shown directly below this section, not in a top-of-page block
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
  learning_objectives: string[]; // superseded by what_you_will_cover for display when present -- kept for compatibility
  supplement_references: SupplementReference[]; // no longer rendered as a top-of-page block -- figures now shown inline via lesson_sections[].inline_resource
  lesson_sections: LessonSection[];
  visual_drills: string[]; // superseded by student_practice for display when present -- kept for compatibility
  worked_examples: WorkedExample[]; // superseded by student_practice for display when present -- kept for compatibility
  common_test_traps: string[];
  knowledge_check: KnowledgeCheckItem[];
  recommended_videos: RecommendedVideo[];
  mastery_standard: string; // not rendered on the student page (implementation-facing)
  instructor_note?: string; // never rendered on the student page
  what_you_will_cover?: string[]; // new: replaces learning_objectives for display
  student_practice?: string[]; // new: replaces worked_examples/visual_drills for the "Try it" section
}

export interface CourseContent {
  project: string;
  content_version: string;
  important_2026_test_note: string;
  course_flow: string[];
  sources: Record<string, { title: string; url: string; note?: string }>;
  lessons: CourseLesson[];
}
