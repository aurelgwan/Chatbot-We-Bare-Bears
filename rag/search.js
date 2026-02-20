function searchKnowledge(query, knowledge) {
  const q = query.toLowerCase();

  const result = knowledge.filter(
    (item) =>
      q.includes(item.topic.toLowerCase()) ||
      item.topic.toLowerCase().includes(q) ||
      item.content.toLowerCase().includes(q)
  );

  return result.map((item) => item.content).join("\n");
}

module.exports = searchKnowledge;