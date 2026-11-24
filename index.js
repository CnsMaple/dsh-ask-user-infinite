/**
 * dsh-ask-user-infinite — Host-only plugin.
 *
 * Intercepts ask_user_question in the tools/execute waterfall and answers the
 * user-questions waterfall with wait:{ callId } and no timed deadline. The tool
 * therefore waits until the user submits an answer, in every preset, without
 * editing any preset or registering a duplicate scoped tool.
 *
 * @module dsh-ask-user-infinite
 */

const TOOL_NAME = 'ask_user_question';

function isRecord(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function normalizeQuestions(value) {
  if (!Array.isArray(value) || value.length === 0) {
    throw new Error('ask_user_question requires at least one question');
  }
  const ids = new Set();
  return value.map((raw, index) => {
    if (!isRecord(raw)) throw new Error(`question ${index + 1} must be an object`);
    const { multi_select, ...rest } = raw;
    const id = typeof raw.id === 'string' ? raw.id.trim() : '';
    const question = typeof raw.question === 'string' ? raw.question.trim() : '';
    if (id === '') throw new Error(`question ${index + 1} requires a non-empty id`);
    if (question === '') throw new Error(`question ${index + 1} requires non-empty question text`);
    if (ids.has(id)) throw new Error(`question id ${JSON.stringify(id)} must be unique within this call`);
    ids.add(id);
    return {
      ...rest,
      id,
      question,
      ...(multi_select === undefined ? {} : { multiSelect: Boolean(multi_select) }),
    };
  });
}

function toAnswers(result) {
  return {
    answers: (result.answers ?? []).map(answer => ({
      id: answer.id,
      selected: Array.isArray(answer.selected) ? [...answer.selected] : [],
      ...(answer.custom === undefined ? {} : { custom: answer.custom }),
    })),
  };
}

export const name = 'ask-user-infinite';
export const inject = ['tools', 'userQuestions'];

export function apply(ctx) {
  ctx.effect(() => ctx.on('tools/execute', async (exec, next) => {
    if (exec.name !== TOOL_NAME) return next();

    const args = exec.arguments;
    const questions = normalizeQuestions(isRecord(args) ? args.questions : undefined);

    // A call-id keyed wait keeps the Web card attached to this tool call,
    // while omitting timed/deadline keeps the wait indefinite.
    const result = await ctx.userQuestions.ask({
      questions,
      ...(exec.agent === undefined ? {} : { agent: exec.agent }),
      signal: exec.signal,
      wait: { callId: exec.callId },
    });

    const value = toAnswers(result);
    return {
      isError: false,
      value,
      content: [{ type: 'text', text: JSON.stringify(value) }],
    };
  }), 'ask-user-infinite: tools/execute');
}
