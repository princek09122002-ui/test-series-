export function removeTopicFromFullChapter(
  topicIds: string[],
  chapterTopicIds: string[],
  removedId: string,
) {
  return [...new Set([...topicIds, ...chapterTopicIds])].filter(
    (id) => id !== removedId,
  );
}
export type SelectableTopic = { id: string; parentId?: string | null };
export function expandTopicSelection(ids: string[], topics: SelectableTopic[]) {
  const result = new Set(ids);
  let added = true;
  while (added) {
    added = false;
    for (const t of topics)
      if (t.parentId && result.has(t.parentId) && !result.has(t.id)) {
        result.add(t.id);
        added = true;
      }
  }
  return [...result];
}
export function removeTopicSelection(
  ids: string[],
  topics: SelectableTopic[],
  removed: string,
) {
  const excluded = new Set(expandTopicSelection([removed], topics));
  let parent = topics.find((t) => t.id === removed)?.parentId;
  while (parent && !excluded.has(parent)) {
    excluded.add(parent);
    parent = topics.find((t) => t.id === parent)?.parentId;
  }
  return expandTopicSelection(ids, topics).filter((id) => !excluded.has(id));
}
