// Only the current user's explicit request enters this function. Never pass document text or history.
export function allowedTurnTools(message: string): string[] {
  const request = message.trim().toLowerCase().replace(/^(?:(?:hey )?pip[, ]+)?(?:(?:can|could|would) you )?(?:please )?/, '');
  if (/\b(?:instead of|don't|do not|without|if i|or)\b/.test(request)) return [];
  const command = /^(create|make|write|save|add|schedule|book|update|edit|rename|reschedule|move|delete|remove|start|complete|generate|turn|convert)\b/.exec(request);
  if (!command) return [];
  const verb = command[1];
  const object = /^(?:turn|convert)\b/.test(request)
    ? request.split(/\binto\b/)[1] ?? ''
    : request.slice(command[0].length).split(/\b(?:from|about|based on|using|under|for|with)\b/)[0];
  const rules: Array<[RegExp, string, string?, string?]> = [
    [/\bnotes?\b/, 'create_note', 'update_note', 'delete_note'],
    [/\b(?:event|session|calendar|lesson)s?\b/, 'create_event', 'update_event', 'delete_event'],
    [/\btasks?\b/, 'create_task', 'update_task', 'delete_tasks'],
    [/\bgoals?\b/, 'create_goal', 'update_goal', 'delete_goal'],
    [/\bmilestones?\b/, 'add_goal_milestone', 'update_goal_milestone', 'delete_goal_milestone'],
    [/\bdecks?\b/, 'create_deck', undefined, 'delete_deck'],
    [/\bflash\s?cards?\b/, 'create_flashcards'],
    [/\b(?:practice tests?|quizzes|quiz)\b/, 'create_practice_test', undefined, 'delete_practice_test'],
    [/\bexams?\b/, 'create_exam', 'update_exam', 'delete_exam'],
  ];
  if (verb === 'start') return /\bfocus\b/.test(object) ? ['start_focus_session'] : [];
  const matches = rules.filter(([pattern]) => pattern.test(object));
  if (matches.length > 1) return [];
  const rule = matches[0];
  if (verb === 'complete') return rule?.[1] === 'create_task' ? ['complete_tasks'] : [];
  if (!rule) return ['schedule', 'book'].includes(verb) ? ['create_event'] : [];
  const tool = /^(delete|remove)$/.test(verb) ? rule[3] : /^(update|edit|move|reschedule|rename)$/.test(verb) ? rule[2] : rule[1];
  if (!tool) return [];
  if (tool === 'create_event' && /\b(events|sessions|lessons)\b/.test(object)) return ['create_events'];
  if (tool === 'create_task' && /\btasks\b/.test(object)) return ['create_tasks'];
  if (tool === 'delete_event' && /\bevents\b/.test(object)) return ['delete_events'];
  return [tool];
}
