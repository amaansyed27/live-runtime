export type MemoryKind = "chat" | "chatSession" | "preference" | "fact" | "routine" | "skill" | "web" | "document" | "action" | "project";
export type MemoryScope = "session" | "longTerm" | "profile" | "skill" | "project";
export type MemoryClass = "chatHistory" | "preference" | "projectMemory" | "actionRequest" | "skillCandidate";
export type SkillStatus = "draft" | "learning" | "ready" | "disabled";

export interface MemoryRecord {
  id: string;
  kind: MemoryKind;
  scope: MemoryScope;
  title: string;
  content: string;
  source: string;
  confidence: number;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  memoryClass?: MemoryClass;
  contentHash?: string;
  searchHashes?: string[];
  embeddingModel?: string;
  vector?: number[];
}

export interface ProfileEntry {
  id: string;
  label: string;
  value: string;
  evidenceIds: string[];
  confidence: number;
  updatedAt: string;
}

export interface LearnedSkill {
  id: string;
  name: string;
  status: SkillStatus;
  trigger: string;
  instructions: string;
  evidenceIds: string[];
  usageCount: number;
  lastUsedAt?: string;
}

export interface IntelligenceSnapshot {
  profile: ProfileEntry[];
  skills: LearnedSkill[];
  recentMemoryIds: string[];
  retrievedMemoryIds: string[];
}

export interface RetrievalQuery {
  text: string;
  kinds?: MemoryKind[];
  scopes?: MemoryScope[];
  classes?: MemoryClass[];
  limit?: number;
  minConfidence?: number;
}
