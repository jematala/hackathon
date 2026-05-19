import type { QuestProgressUpdate } from "@repo/shared";

const recent: QuestProgressUpdate[] = [];

export function pushQuestProgress(updates: ReadonlyArray<QuestProgressUpdate> | undefined): void {
  if (!updates || updates.length === 0) return;
  for (const u of updates) {
    recent.push(u);
    if (u.completed) {
      console.log(`[quest] completed ${u.questId} (${u.source})`);
    } else {
      console.log(`[quest] ${u.questId} ${u.progressCount}/${u.targetCount}`);
    }
  }
  // TODO(stage 5+): forward to a visible toast UI once the quests branch lands.
}

export function getRecentQuestProgress(): ReadonlyArray<QuestProgressUpdate> {
  return recent;
}
