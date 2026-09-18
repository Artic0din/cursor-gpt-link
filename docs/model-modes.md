# Context and MAX mode

Cursor's legacy MAX mode expands the context window. Effort controls reasoning depth, and Fast requests priority processing. These are separate settings. [Cursor documentation](https://cursor.com/help/ai-features/max-mode) limits the legacy switch to request-based plans and describes API-rate billing plus 20% for those Cursor requests. Current Cursor plans use explicit model parameters such as Context.

## ChatGPT Link

The normal window is 200K tokens or the smaller model limit. MAX uses `context_window` from the signed-in Codex catalog. On the tested account this is 272K for most models and 128K for Spark, which has no larger mode. The API documentation and an experimental `max_context_window` ceiling do not establish that the same window is enabled for the subscription, so those values are not used to claim extra capacity.

Select the desired window under **Context**. Where Cursor exposes its legacy MAX switch, it selects the larger window and switching it off selects the normal window. The patch preserves the selected effort and Fast value. Models without a larger supported window do not advertise MAX support.

The provider metadata now reports `capabilities.context_length`, which Cursor actually reads. Cursor applies the selected Context value to its prompt session, context usage reporting and compaction budget, capped by that advertised window. A larger window does not automatically raise effort or change the provider connection. More context can consume more allowance and increase latency. Existing subscription authentication and routing are retained.

For the provider-side distinctions, see [OpenAI context configuration](https://learn.chatgpt.com/docs/config-file/config-reference) and [Claude extended context](https://code.claude.com/docs/en/model-config#extended-context).
