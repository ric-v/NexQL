import * as vscode from 'vscode';
import { ChatMessage, ToolCall } from '../types';
import { ToolExecutor } from './ToolExecutor';
import { DB_TOOLS } from './ToolSpec';
import { AiService } from '../AiService';
import { debugLog } from '../../../common/logger';
import { TelemetryService } from '../../../services/TelemetryService';

export class ToolOrchestrator {
  private readonly toolExecutor: ToolExecutor;
  private readonly maxTurns = 6;

  constructor(
    private readonly context: vscode.ExtensionContext,
    private readonly aiService: AiService,
    private readonly connectionId: string,
    private readonly databaseName: string
  ) {
    this.toolExecutor = new ToolExecutor(context, connectionId, databaseName);
  }

  async run(
    provider: string,
    initialMessages: ChatMessage[],
    config: vscode.WorkspaceConfiguration,
    customSystemPrompt?: string,
    scope: any = 'chat',
    cancellationToken?: vscode.CancellationToken,
    onTurnComplete?: (messages: ChatMessage[]) => Promise<void> | void
  ): Promise<{ messages: ChatMessage[]; text: string; usage?: string }> {
    const telemetry = TelemetryService.getInstance();
    telemetry.trackEvent('agentic_loop_started', { provider, database: this.databaseName });

    // Work on a copy of messages to keep history mutation controlled
    let currentMessages = [...initialMessages];
    let turns = 0;
    let finalResponseText = '';
    let finalUsage = '';

    while (turns < this.maxTurns) {
      if (cancellationToken?.isCancellationRequested) {
        debugLog('[ToolOrchestrator] Loop cancelled.');
        break;
      }

      turns++;
      debugLog(`[ToolOrchestrator] Starting turn ${turns}/${this.maxTurns}`);

      // Set the history in AiService before calling provider
      this.aiService.setMessages(currentMessages);

      // Call the AI provider with our database tools passed in
      const response = await this.aiService.callProvider(
        provider,
        '', // userMessage is empty since history is fully populated in setMessages
        config,
        customSystemPrompt,
        scope,
        DB_TOOLS
      );

      finalResponseText = response.text;
      if (response.usage) {
        finalUsage = response.usage;
      }

      // Check if the provider returned any tool calls
      if (response.toolCalls && response.toolCalls.length > 0) {
        debugLog(`[ToolOrchestrator] Model requested ${response.toolCalls.length} tool calls.`);

        // Add assistant message representing the tool calls
        const assistantMsg: ChatMessage = {
          role: 'assistant',
          content: response.text || 'Calling database tools...',
          toolCalls: response.toolCalls
        };
        currentMessages.push(assistantMsg);
        if (onTurnComplete) {
          await onTurnComplete(currentMessages);
        }

        // Execute each tool call
        const toolResults: ChatMessage[] = [];
        for (const call of response.toolCalls) {
          if (cancellationToken?.isCancellationRequested) {
            debugLog('[ToolOrchestrator] Tool execution cancelled.');
            break;
          }

          let resultStr: string;
          try {
            resultStr = await this.toolExecutor.executeTool(call.name, call.arguments);
          } catch (e: any) {
            resultStr = JSON.stringify({ error: e.message || String(e) });
          }

          toolResults.push({
            role: 'tool',
            name: call.name,
            toolCallId: call.id,
            content: resultStr
          });
        }

        currentMessages.push(...toolResults);
        if (onTurnComplete) {
          await onTurnComplete(currentMessages);
        }
      } else {
        // No tool calls: the agent is finished and returned text response
        debugLog('[ToolOrchestrator] Model completed loop with text response.');
        currentMessages.push({
          role: 'assistant',
          content: response.text || ''
        });
        break;
      }
    }

    if (turns >= this.maxTurns) {
      debugLog('[ToolOrchestrator] Warning: Max turn iteration limit reached.');
    }

    telemetry.trackEvent('agentic_loop_completed', {
      provider,
      turns,
      database: this.databaseName,
      success: true
    });

    return {
      messages: currentMessages,
      text: finalResponseText,
      usage: finalUsage
    };
  }
}
