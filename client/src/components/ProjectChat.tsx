import { useState, useRef, useEffect, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Send, MessageCircle, Trash2, Lock, AtSign } from "lucide-react";
import { toast } from "sonner";

interface ProjectChatProps {
  projectId: number;
}

export default function ProjectChat({ projectId }: ProjectChatProps) {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const [message, setMessage] = useState("");
  const [isAdminOnly, setIsAdminOnly] = useState(false);
  const [showMentions, setShowMentions] = useState(false);
  const [mentionFilter, setMentionFilter] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const previousMessageCountRef = useRef<number>(0);
  const lastMessageSenderRef = useRef<number | null>(null);

  const { data: messages, refetch } = trpc.messages.list.useQuery(
    { projectId },
    { refetchInterval: 5000 }
  );

  const { data: mentionableUsers } = trpc.messages.mentionableUsers.useQuery({ projectId });

  const sendMutation = trpc.messages.send.useMutation({
    onSuccess: () => {
      setMessage("");
      setIsAdminOnly(false);
      refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  const deleteMutation = trpc.messages.delete.useMutation({
    onSuccess: () => refetch(),
    onError: (err) => toast.error(err.message),
  });

  // Only scroll to bottom when a NEW message from a DIFFERENT user arrives
  useEffect(() => {
    if (messages && messages.length > previousMessageCountRef.current) {
      // Check if the new message is from a different user
      const lastMessage = messages[messages.length - 1];
      if (lastMessage && lastMessage.senderId !== user?.id) {
        // New message from a different user - scroll to it
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }
    }
    previousMessageCountRef.current = messages?.length || 0;
    lastMessageSenderRef.current = messages?.[messages.length - 1]?.senderId || null;
  }, [messages?.length, user?.id]);

  const filteredMentions = useMemo(() => {
    if (!mentionableUsers) return [];
    if (!mentionFilter) return mentionableUsers;
    return mentionableUsers.filter((u) =>
      u.name.toLowerCase().includes(mentionFilter.toLowerCase())
    );
  }, [mentionableUsers, mentionFilter]);

  const handleSend = () => {
    if (!message.trim()) return;
    // Extract @mentions from message
    const mentionPattern = /@(\w+[\w\s]*?)(?=\s|$|@)/g;
    const mentionMatches = message.match(mentionPattern);
    const mentionIds: number[] = [];
    if (mentionMatches && mentionableUsers) {
      for (const match of mentionMatches) {
        const name = match.slice(1).trim();
        const found = mentionableUsers.find(
          (u) => u.name.toLowerCase() === name.toLowerCase()
        );
        if (found) mentionIds.push(found.id);
      }
    }

    sendMutation.mutate({
      projectId,
      content: message.trim(),
      mentions: mentionIds.length > 0 ? mentionIds.join(",") : undefined,
      isAdminOnly,
    });
  };

  const insertMention = (userName: string) => {
    const textarea = inputRef.current;
    if (!textarea) return;
    const cursorPos = textarea.selectionStart;
    const textBefore = message.slice(0, cursorPos);
    const textAfter = message.slice(cursorPos);
    const lastAtIndex = textBefore.lastIndexOf("@");
    const newText = textBefore.slice(0, lastAtIndex) + `@${userName} ` + textAfter;
    setMessage(newText);
    setShowMentions(false);
    setMentionFilter("");
    textarea.focus();
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setMessage(val);
    const cursorPos = e.target.selectionStart;
    const textBefore = val.slice(0, cursorPos);
    const lastAtIndex = textBefore.lastIndexOf("@");
    if (lastAtIndex >= 0 && !textBefore.slice(lastAtIndex).includes(" ")) {
      setShowMentions(true);
      setMentionFilter(textBefore.slice(lastAtIndex + 1));
    } else {
      setShowMentions(false);
      setMentionFilter("");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const renderContent = (content: string) => {
    // Highlight @mentions in the message
    const parts = content.split(/(@\w+[\w\s]*?)(?=\s|$|@)/g);
    return parts.map((part, i) => {
      if (part.startsWith("@")) {
        return (
          <span key={i} className="bg-red-100 text-red-700 font-medium rounded px-1">
            {part}
          </span>
        );
      }
      return <span key={i}>{part}</span>;
    });
  };

  const formatTime = (date: Date | string) => {
    const d = new Date(date);
    return d.toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <MessageCircle className="h-5 w-5 text-red-600" />
          Project Chat
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Messages area */}
        <div className="border rounded-lg bg-gray-50 mb-3 max-h-96 overflow-y-auto">
          {!messages || messages.length === 0 ? (
            <div className="p-8 text-center text-gray-400">
              <MessageCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No messages yet. Start the conversation!</p>
            </div>
          ) : (
            <div className="p-3 space-y-3">
              {messages.map((msg) => {
                const isMe = msg.senderId === user?.id;
                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-lg p-3 ${
                        msg.isAdminOnly
                          ? "bg-amber-50 border border-amber-200"
                          : isMe
                          ? "bg-red-600 text-white"
                          : "bg-white border border-gray-200"
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span
                          className={`text-xs font-semibold ${
                            msg.isAdminOnly
                              ? "text-amber-700"
                              : isMe
                              ? "text-red-100"
                              : "text-gray-600"
                          }`}
                        >
                          {msg.senderName || "Unknown"}
                        </span>
                        {msg.isAdminOnly && (
                          <span className="flex items-center gap-1 text-xs text-amber-600">
                            <Lock className="h-3 w-3" /> Admin only
                          </span>
                        )}
                      </div>
                      <p
                        className={`text-sm ${
                          isMe && !msg.isAdminOnly ? "text-white" : "text-gray-800"
                        }`}
                      >
                        {renderContent(msg.content)}
                      </p>
                      <div className="flex items-center justify-between mt-1">
                        <span
                          className={`text-xs ${
                            isMe && !msg.isAdminOnly ? "text-red-200" : "text-gray-400"
                          }`}
                        >
                          {formatTime(msg.createdAt)}
                        </span>
                        {isAdmin && (
                          <button
                            onClick={() => deleteMutation.mutate({ id: msg.id })}
                            className="ml-2 p-1.5 rounded-full text-white hover:bg-white hover:text-red-600 transition-colors"
                            title="Delete message"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input area */}
        <div className="relative">
          {/* Mention dropdown */}
          {showMentions && filteredMentions.length > 0 && (
            <div className="absolute bottom-full left-0 right-0 mb-1 bg-white border rounded-lg shadow-lg max-h-40 overflow-y-auto z-10">
              {filteredMentions.map((u) => (
                <button
                  key={u.id}
                  onClick={() => insertMention(u.name)}
                  className="w-full text-left px-3 py-2 hover:bg-gray-100 flex items-center gap-2 text-sm"
                >
                  <AtSign className="h-3 w-3 text-red-500" />
                  <span className="font-medium">{u.name}</span>
                  <span className="text-xs text-gray-400 ml-auto">
                    {u.type === "admin" ? "Team" : "Sub"}
                  </span>
                </button>
              ))}
            </div>
          )}

          <div className="flex gap-2">
            <div className="flex-1 relative">
              <textarea
                ref={inputRef}
                value={message}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                placeholder="Type a message... Use @ to mention someone"
                className="w-full border rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                rows={2}
              />
            </div>
            <div className="flex flex-col gap-1">
              {isAdmin && (
                <button
                  onClick={() => setIsAdminOnly(!isAdminOnly)}
                  className={`p-2 rounded-lg text-xs ${
                    isAdminOnly
                      ? "bg-amber-100 text-amber-700 border border-amber-300"
                      : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                  }`}
                  title={isAdminOnly ? "Admin-only message" : "Visible to all"}
                >
                  <Lock className="h-4 w-4" />
                </button>
              )}
              <Button
                onClick={handleSend}
                disabled={!message.trim() || sendMutation.isPending}
                size="sm"
                className="bg-red-600 hover:bg-red-700"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
          {isAdminOnly && (
            <p className="text-xs text-amber-600 mt-1">
              This message will only be visible to admin team members
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
