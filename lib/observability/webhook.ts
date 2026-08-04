/**
 * Neutralise user-supplied text before it reaches a Slack or Discord webhook.
 *
 * Both render Markdown and both expand `@everyone` / `<@id>` style mentions, so
 * an unauthenticated error report or feedback message could ping a whole
 * workspace or forge convincing formatting in an ops channel.
 */
export function escapeWebhookText(input: string, maxLength = 500): string {
  return input
    .slice(0, maxLength)
    .replace(/[`*_~|>]/g, (c) => `\\${c}`)
    // Break mention syntax without deleting the text, so the report stays readable.
    .replace(/@(everyone|here)/gi, "@​$1")
    .replace(/<@[!&]?(\d+)>/g, "<@​$1>")
    .replace(/<[#@!&][^>]*>/g, (m) => m.replace("<", "<​"));
}
