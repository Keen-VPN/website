import { useCallback, useEffect, useRef, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  AlertCircle,
  Bot,
  Loader2,
  RotateCcw,
  Send,
  Sparkles,
} from "lucide-react";
import {
  closeAiConversation,
  createAiConversation,
  getAiConversation,
  listAiConversations,
  listWorkflows,
  sendAiMessage,
  type AiMessageData,
  type AiPendingApproval,
} from "@/auth/backend";
import { cn } from "@/lib/utils";
import { pendingApprovalFromWorkflows } from "@/lib/workflow-ui";

interface AiAssistantCardProps {
  sessionToken: string;
}

const SUGGESTIONS = [
  "Help me find the best perk for me",
  "Help me sign up for Chase",
  "Show my active applications",
  "What information do I need to complete this?",
];

function humanizeStepKey(key: string): string {
  return key
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export function AiAssistantCard({ sessionToken }: AiAssistantCardProps) {
  const [loading, setLoading] = useState(true);
  const [featureDisabled, setFeatureDisabled] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<AiMessageData[]>([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [pendingApproval, setPendingApproval] =
    useState<AiPendingApproval | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const loadGeneration = useRef(0);

  const load = useCallback(async () => {
    const generation = ++loadGeneration.current;
    setLoading(true);
    setError(null);
    setFeatureDisabled(false);

    const listRes = await listAiConversations(sessionToken);
    if (generation !== loadGeneration.current) return;

    if (!listRes.ok || !listRes.data) {
      if (listRes.error?.includes("not available")) {
        setFeatureDisabled(true);
      } else {
        setError(listRes.error ?? "Could not load the AI assistant.");
      }
      setLoading(false);
      return;
    }

    const activeConversation = listRes.data.conversations.find(
      (c) => c.status === "ACTIVE",
    );
    if (activeConversation) {
      const detailRes = await getAiConversation(
        sessionToken,
        activeConversation.id,
      );
      if (generation !== loadGeneration.current) return;
      if (detailRes.ok && detailRes.data) {
        setConversationId(activeConversation.id);
        setMessages(detailRes.data.messages);
      } else {
        setError(detailRes.error ?? "Could not load your conversation.");
      }
    }

    const workflowsRes = await listWorkflows(sessionToken);
    if (generation !== loadGeneration.current) return;
    if (workflowsRes.ok && workflowsRes.data) {
      setPendingApproval(
        pendingApprovalFromWorkflows(workflowsRes.data.workflows),
      );
    }

    setLoading(false);
  }, [sessionToken]);

  useEffect(() => {
    void load();
    return () => {
      loadGeneration.current += 1;
    };
  }, [load]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function ensureConversation(): Promise<string | null> {
    if (conversationId) return conversationId;
    const res = await createAiConversation(sessionToken);
    if (!res.ok || !res.data) {
      setError(res.error ?? "Failed to start a conversation");
      return null;
    }
    setConversationId(res.data.conversationId);
    return res.data.conversationId;
  }

  async function handleSend(overrideText?: string) {
    const text = (overrideText ?? draft).trim();
    if (!text || sending) return;

    setSending(true);
    setError(null);
    try {
      const id = await ensureConversation();
      if (!id) return;

      const optimisticId = `local-${Date.now()}`;
      const optimisticUserMessage: AiMessageData = {
        id: optimisticId,
        role: "USER",
        content: text,
        toolName: null,
        toolInput: null,
        toolResult: null,
        isError: false,
        createdAt: new Date().toISOString(),
      };
      setMessages((current) => [...current, optimisticUserMessage]);
      setDraft("");

      const res = await sendAiMessage(sessionToken, id, text);
      if (!res.ok || !res.data) {
        setMessages((current) => current.filter((m) => m.id !== optimisticId));
        setDraft(text);
        setError(res.error ?? "Failed to send message");
        return;
      }

      const reply = res.data.reply;
      const nextPendingApproval = res.data.pendingApproval ?? null;
      setMessages((current) => [
        ...current,
        {
          id: `local-${Date.now()}-reply`,
          role: "ASSISTANT",
          content: reply,
          toolName: null,
          toolInput: null,
          toolResult: null,
          isError: false,
          createdAt: new Date().toISOString(),
        },
      ]);
      setPendingApproval(nextPendingApproval);
    } finally {
      setSending(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  }

  async function handleNewChat() {
    if (sending) return;
    if (conversationId) {
      const res = await closeAiConversation(sessionToken, conversationId);
      if (!res.ok) {
        setError(res.error ?? "Failed to start a new chat");
        return;
      }
    }
    setConversationId(null);
    setMessages([]);
    setDraft("");
    setError(null);
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            AI Assistant
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading…
        </CardContent>
      </Card>
    );
  }

  if (featureDisabled) {
    return null;
  }

  const visibleMessages = messages.filter((m) => m.role !== "TOOL");
  const hasDraft = Boolean(draft.trim());

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            AI Assistant
          </CardTitle>
          {(visibleMessages.length > 0 || hasDraft) && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 gap-1.5 px-2 text-xs"
              onClick={() => void handleNewChat()}
              disabled={sending}
            >
              <RotateCcw className="h-3.5 w-3.5" aria-hidden />
              New chat
            </Button>
          )}
        </div>
        <CardDescription>
          Tell KeenVPN what you&apos;d like help with. We&apos;ll find the right
          application and guide you through it. Nothing is ever submitted
          without your explicit approval.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && <p className="text-sm text-destructive">{error}</p>}

        {pendingApproval && (
          <div className="flex items-start gap-2 rounded-md bg-muted/40 p-3 text-sm">
            <AlertCircle
              className="mt-0.5 h-4 w-4 shrink-0 text-primary"
              aria-hidden
            />
            <p>
              Your approval is needed for &quot;
              {humanizeStepKey(pendingApproval.stepKey ?? "this step")}&quot;.
              Head to{" "}
              <a href="#applications" className="font-medium underline">
                Applications
              </a>{" "}
              below to review and approve it.
            </p>
          </div>
        )}

        <ScrollArea className="h-80 rounded-md border">
          <div className="space-y-3 p-4">
            {visibleMessages.length === 0 ? (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Ask me to help you complete a partner application, check on
                  something in progress, or explain what KeenVPN can do for you.
                </p>
              </div>
            ) : (
              visibleMessages.map((message) => (
                <div
                  key={message.id}
                  className={cn(
                    "flex items-start gap-2",
                    message.role === "USER" ? "justify-end" : "justify-start",
                  )}
                >
                  {message.role === "ASSISTANT" && (
                    <Bot
                      className="mt-1 h-4 w-4 shrink-0 text-muted-foreground"
                      aria-hidden
                    />
                  )}
                  <div
                    className={cn(
                      "max-w-[85%] whitespace-pre-wrap rounded-lg px-3 py-2 text-sm",
                      message.role === "USER"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted",
                    )}
                  >
                    {message.content}
                  </div>
                </div>
              ))
            )}
            {sending && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Bot className="h-4 w-4" aria-hidden />
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                Thinking…
              </div>
            )}
            <div ref={bottomRef} />
          </div>
        </ScrollArea>

        <div className="flex flex-wrap gap-2">
          {SUGGESTIONS.map((suggestion) => (
            <Button
              key={suggestion}
              type="button"
              variant="outline"
              size="sm"
              className="h-auto whitespace-normal py-1.5 text-left text-xs"
              onClick={() => void handleSend(suggestion)}
              disabled={sending || hasDraft}
            >
              {suggestion}
            </Button>
          ))}
        </div>

        <div className="flex items-end gap-2">
          <Textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask KeenVPN to help with an application…"
            className="min-h-[44px] resize-none"
            rows={1}
            disabled={sending}
          />
          <Button
            size="icon"
            onClick={() => void handleSend()}
            disabled={sending || !draft.trim()}
            aria-label="Send message"
          >
            {sending ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            ) : (
              <Send className="h-4 w-4" aria-hidden />
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
