/**
 * @license
 * Copyright 2025 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

export interface CallbackInfo {
    shortDescription: string;
    detailedDescription: string;
    docLink: string;
}

export interface ToolInfo {
    shortDescription: string;
    detailedDescription: string;
    docLink: string;
}

export class TooltipUtil {
    private static readonly toolMenuTooltips = new Map<string, string>([
        ["Function tool", "Build custom tools for your specific ADK agent needs."],
        ["Built-in tool", "Ready-to-use functionality such as Google Search or code executors that provide agents with common capabilities. "],
        ["Agent tool", "A sub-agent that can be invoked as a tool by another agent."]
    ]);

    private static readonly toolDetailedInfo = new Map<string, ToolInfo>([
        ["Function tool", {
            shortDescription: "Build custom tools for your specific ADK agent needs.",
            detailedDescription: "The ADK framework automatically inspects your Python function's signature—including its name, docstring, parameters, type hints, and default values—to generate a schema. This schema is what the LLM uses to understand the tool's purpose, when to use it, and what arguments it requires.",
            docLink: "https://google.github.io/adk-docs/tools/function-tools/"
        }],
        ["Agent tool", {
            shortDescription: "Wraps a sub-agent as a callable tool, enabling modular and hierarchical agent architectures.",
            detailedDescription: "Agent tools allow you to use one agent as a tool within another agent, creating powerful multi-agent workflows.",
            docLink: "https://google.github.io/adk-docs/agents/multi-agents/#c-explicit-invocation-agenttool"
        }]
    ]);

    private static readonly callbackMenuTooltips = new Map<string, string>([
        ["before_agent", "Called immediately before the agent's _run_async_impl (or _run_live_impl) method is executed."],
        ["after_agent", "Called immediately after the agent's _run_async_impl (or _run_live_impl) method successfully completes."],
        ["before_model", "Called just before the generate_content_async (or equivalent) request is sent to the LLM within an LlmAgent's flow."],
        ["after_model", "Called just after a response (LlmResponse) is received from the LLM, before it's processed further by the invoking agent."],
        ["before_tool", "Called just before a specific tool's run_async method is invoked, after the LLM has generated a function call for it."],
        ["after_tool", "Called just after the tool's run_async method completes successfully."]
    ]);

    private static readonly callbackDialogTooltips = new Map<string, string>([
        ["before_agent", "Called immediately before the agent's _run_async_impl (or _run_live_impl) method is executed."],
        ["after_agent", "Called immediately after the agent's _run_async_impl (or _run_live_impl) method successfully completes."],
        ["before_model", "Called just before the generate_content_async (or equivalent) request is sent to the LLM within an LlmAgent's flow."],
        ["after_model", "Called just after a response (LlmResponse) is received from the LLM, before it's processed further by the invoking agent."],
        ["before_tool", "Called just before a specific tool's run_async method is invoked, after the LLM has generated a function call for it."],
        ["after_tool", "Called just after the tool's run_async method completes successfully."]
    ]);

    private static readonly callbackDetailedInfo = new Map<string, CallbackInfo>([
        ["before_agent", {
            shortDescription: "Called immediately before the agent's _run_async_impl (or _run_live_impl) method is executed.  It runs after the agent's InvocationContext is created but before its core logic begins.",
            detailedDescription: " Ideal for setting up resources or state needed only for this specific agent's run, performing validation checks on the session state (callback_context.state) before execution starts, logging the entry point of the agent's activity, or potentially modifying the invocation context before the core logic uses it.",
            docLink: "https://google.github.io/adk-docs/callbacks/types-of-callbacks/#before-agent-callback"
        }],
        ["after_agent", {
            shortDescription: "Called immediately after the agent's _run_async_impl (or _run_live_impl) method successfully completes.",
            detailedDescription: "Useful for cleanup tasks, post-execution validation, logging the completion of an agent's activity, modifying final state, or augmenting/replacing the agent's final output.",
            docLink: "https://google.github.io/adk-docs/callbacks/types-of-callbacks/#after-agent-callback"
        }],
        ["before_model", {
            shortDescription: "Called just before the generate_content_async (or equivalent) request is sent to the LLM within an LlmAgent's flow.",
            detailedDescription: "Allows inspection and modification of the request going to the LLM. Use cases include adding dynamic instructions, injecting few-shot examples based on state, modifying model config, implementing guardrails (like profanity filters), or implementing request-level caching.",
            docLink: "https://google.github.io/adk-docs/callbacks/types-of-callbacks/#before-model-callback"
        }],
        ["after_model", {
            shortDescription: "Called just after a response (LlmResponse) is received from the LLM, before it's processed further by the invoking agent.",
            detailedDescription: "Allows inspection or modification of the raw LLM response.",
            docLink: "https://google.github.io/adk-docs/callbacks/types-of-callbacks/#after-model-callback"
        }],
        ["before_tool", {
            shortDescription: "Called just before a specific tool's run_async method is invoked, after the LLM has generated a function call for it.",
            detailedDescription: "Allows inspection and modification of tool arguments, performing authorization checks before execution, logging tool usage attempts, or implementing tool-level caching.",
            docLink: "https://google.github.io/adk-docs/callbacks/types-of-callbacks/#before-tool-callback"
        }],
        ["after_tool", {
            shortDescription: "Called just after the tool's run_async method completes successfully.",
            detailedDescription: "Allows inspection and modification of the tool's result before it's sent back to the LLM (potentially after summarization). Useful for logging tool results, post-processing or formatting results, or saving specific parts of the result to the session state.",
            docLink: "https://google.github.io/adk-docs/callbacks/types-of-callbacks/#after-tool-callback"
        }]
    ]);

    static getToolMenuTooltips(toolType: string) {
        return TooltipUtil.toolMenuTooltips.get(toolType);
    }

    static getToolDetailedInfo(toolType: string): ToolInfo | undefined {
        return TooltipUtil.toolDetailedInfo.get(toolType);
    }

    static getCallbackMenuTooltips(callbackName: string) {
        return TooltipUtil.callbackMenuTooltips.get(callbackName);
    }

    static getCallbackDialogTooltips(callbackName: string) {
        return TooltipUtil.callbackDialogTooltips.get(callbackName);
    }

    static getCallbackDetailedInfo(callbackName: string): CallbackInfo | undefined {
        return TooltipUtil.callbackDetailedInfo.get(callbackName);
    }

}