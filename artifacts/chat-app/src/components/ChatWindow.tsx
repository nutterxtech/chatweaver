import { useState, useRef, useEffect } from "react";
import { Phone, Video, Search, MoreVertical, Send, Paperclip, Image, Smile, X, Reply, Trash2, ChevronDown } from "lucide-react";
import { Avatar } from "./Avatar";
import { useAuth } from "@/contexts/AuthContext";
import { useMessages, type MessageWithSender } from "@/hooks/useMessages";
import { useConversations } from "@/hooks/useConversations";
import { formatDistanceToNow, format, isToday, isYesterday } from "date-fns";
import { useToast } from "@/hooks/use-toast";

interface ChatWindowProps {
  conversationId: string;
}

export function ChatWindow({ conversationId }: ChatWindowProps) {
  const { user } = useAuth();
  const { conversations } = useConversations();
  const { messages, loading, typingUsers, sendMessage, sendFile, deleteMessage, startTyping, stopTyping } = useMessages(conversationId);
  const { toast } = useToast();

  const [input, setInput] = useState("");
  const [replyTo, setReplyTo] = useState<MessageWithSender | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [showScrollBtn, setShowScrollBtn] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const conv = conversations.find(c => c.id === conversationId);
  const otherUser = conv?.other_user;
  const chatName = conv?.is_group ? conv.group_name : otherUser?.display_name;
  const chatAvatar = conv?.is_group ? conv.group_avatar_url : otherUser?.avatar_url;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleScroll = () => {
    if (!containerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
    setShowScrollBtn(scrollHeight - scrollTop - clientHeight > 200);
  };

  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });

  const handleSend = async () => {
    if (!input.trim()) return;
    const content = input;
    setInput("");
    setReplyTo(null);
    await sendMessage(content, replyTo?.id);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      toast({ title: "File too large", description: "Max file size is 10MB", variant: "destructive" });
      return;
    }
    await sendFile(file);
    e.target.value = "";
  };

  const handleDelete = async (msgId: string) => {
    await deleteMessage(msgId);
    setHoveredId(null);
  };

  const getDateLabel = (date: Date) => {
    if (isToday(date)) return "Today";
    if (isYesterday(date)) return "Yesterday";
    return format(date, "MMMM d, yyyy");
  };

  const groupedMessages = messages.reduce<{ date: string; messages: MessageWithSender[] }[]>((acc, msg) => {
    const date = getDateLabel(new Date(msg.created_at));
    const last = acc[acc.length - 1];
    if (last?.date === date) { last.messages.push(msg); }
    else acc.push({ date, messages: [msg] });
    return acc;
  }, []);

  const statusText = otherUser
    ? otherUser.is_online ? "online" : `last seen ${formatDistanceToNow(new Date(otherUser.last_seen), { addSuffix: true })}`
    : conv?.is_group ? `${conv.participants.length} participants` : "";

  return (
    <div className="flex-1 flex flex-col h-full bg-[#efeae2] dark:bg-gray-950 relative">
      {/* Header */}
      <div className="px-4 py-3 bg-[#f0f2f5] dark:bg-gray-900 flex items-center gap-3 border-b border-gray-200 dark:border-gray-800 shadow-sm">
        <Avatar src={chatAvatar} name={chatName ?? "?"} size="md" online={!conv?.is_group ? otherUser?.is_online : undefined} />
        <div className="flex-1 min-w-0">
          <h2 className="font-semibold text-sm text-gray-900 dark:text-white truncate">{chatName}</h2>
          <p data-testid="status-online" className={`text-xs ${otherUser?.is_online ? "text-[#128C7E]" : "text-gray-500 dark:text-gray-400"}`}>{statusText}</p>
        </div>
        <div className="flex items-center gap-1">
          <button data-testid="button-search-chat" className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors text-gray-500 dark:text-gray-400">
            <Search className="w-5 h-5" />
          </button>
          <button data-testid="button-more" className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors text-gray-500 dark:text-gray-400">
            <MoreVertical className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-4 py-4 space-y-1"
        style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='0.03'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")" }}
      >
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="w-8 h-8 border-2 border-[#128C7E] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {groupedMessages.map(({ date, messages: dayMsgs }) => (
              <div key={date}>
                <div className="flex justify-center my-4">
                  <span className="text-xs bg-white/80 dark:bg-gray-800/80 text-gray-500 dark:text-gray-400 px-3 py-1 rounded-full shadow-sm">{date}</span>
                </div>
                {dayMsgs.map((msg, idx) => {
                  const isMe = msg.sender_id === user?.id;
                  const showAvatar = !isMe && (idx === 0 || dayMsgs[idx - 1]?.sender_id !== msg.sender_id);
                  const isConsecutive = idx > 0 && dayMsgs[idx - 1]?.sender_id === msg.sender_id;

                  return (
                    <MessageBubble
                      key={msg.id}
                      msg={msg}
                      isMe={isMe}
                      showAvatar={showAvatar}
                      isConsecutive={isConsecutive}
                      isGroup={conv?.is_group ?? false}
                      isHovered={hoveredId === msg.id}
                      onHover={setHoveredId}
                      onReply={setReplyTo}
                      onDelete={handleDelete}
                    />
                  );
                })}
              </div>
            ))}
            {typingUsers.length > 0 && (
              <div className="flex items-center gap-2 mt-2">
                <Avatar src={typingUsers[0].avatar_url} name={typingUsers[0].display_name} size="sm" />
                <div className="bg-white dark:bg-gray-800 rounded-2xl rounded-bl-none px-4 py-3 shadow-sm">
                  <div className="flex gap-1 items-center">
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                </div>
                <span className="text-xs text-gray-500">{typingUsers[0].display_name} is typing...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Scroll to bottom button */}
      {showScrollBtn && (
        <button
          onClick={scrollToBottom}
          className="absolute bottom-24 right-6 w-10 h-10 bg-white dark:bg-gray-800 shadow-lg rounded-full flex items-center justify-center text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
        >
          <ChevronDown className="w-5 h-5" />
        </button>
      )}

      {/* Reply bar */}
      {replyTo && (
        <div className="px-4 py-2 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 flex items-center gap-3">
          <div className="flex-1 bg-[#f0f2f5] dark:bg-gray-800 rounded-lg px-3 py-2 border-l-4 border-[#128C7E]">
            <p className="text-xs font-semibold text-[#128C7E]">{replyTo.sender?.display_name}</p>
            <p className="text-xs text-gray-600 dark:text-gray-400 truncate">{replyTo.content ?? (replyTo.message_type === "image" ? "📷 Photo" : "📎 File")}</p>
          </div>
          <button onClick={() => setReplyTo(null)} className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Input */}
      <div className="px-4 py-3 bg-[#f0f2f5] dark:bg-gray-900 flex items-end gap-3">
        <div className="flex items-center gap-1">
          <button data-testid="button-attach-file" onClick={() => fileInputRef.current?.click()} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors text-gray-500 dark:text-gray-400">
            <Paperclip className="w-5 h-5" />
          </button>
          <button data-testid="button-attach-image" onClick={() => { if (fileInputRef.current) { fileInputRef.current.accept = "image/*"; fileInputRef.current.click(); } }} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors text-gray-500 dark:text-gray-400">
            <Image className="w-5 h-5" />
          </button>
        </div>
        <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileChange} accept="image/*,application/pdf,.doc,.docx,.txt" />
        <div className="flex-1 bg-white dark:bg-gray-800 rounded-2xl flex items-end shadow-sm">
          <textarea
            ref={inputRef}
            data-testid="input-message"
            value={input}
            onChange={e => { setInput(e.target.value); startTyping(); }}
            onKeyDown={handleKeyDown}
            onBlur={stopTyping}
            placeholder="Type a message"
            rows={1}
            className="flex-1 resize-none bg-transparent px-4 py-3 text-sm text-gray-900 dark:text-white focus:outline-none max-h-32 overflow-y-auto placeholder-gray-400"
            style={{ minHeight: "44px" }}
          />
        </div>
        <button
          data-testid="button-send"
          onClick={handleSend}
          disabled={!input.trim()}
          className="w-11 h-11 flex-shrink-0 rounded-full bg-[#128C7E] hover:bg-[#0f7066] disabled:bg-gray-300 dark:disabled:bg-gray-700 flex items-center justify-center transition-colors shadow-sm"
        >
          <Send className="w-5 h-5 text-white" />
        </button>
      </div>
    </div>
  );
}

interface BubbleProps {
  msg: MessageWithSender;
  isMe: boolean;
  showAvatar: boolean;
  isConsecutive: boolean;
  isGroup: boolean;
  isHovered: boolean;
  onHover: (id: string | null) => void;
  onReply: (msg: MessageWithSender) => void;
  onDelete: (id: string) => void;
}

function MessageBubble({ msg, isMe, showAvatar, isConsecutive, isGroup, isHovered, onHover, onReply, onDelete }: BubbleProps) {
  const { user } = useAuth();

  const bubbleClass = isMe
    ? "bg-[#dcf8c6] dark:bg-[#005c4b] rounded-2xl rounded-tr-none"
    : "bg-white dark:bg-gray-800 rounded-2xl rounded-tl-none";

  return (
    <div
      className={`flex items-end gap-2 mb-1 ${isMe ? "flex-row-reverse" : "flex-row"} ${isConsecutive ? "mt-0.5" : "mt-3"}`}
      onMouseEnter={() => onHover(msg.id)}
      onMouseLeave={() => onHover(null)}
    >
      {!isMe && (
        <div className="w-8 flex-shrink-0">
          {showAvatar && <Avatar src={msg.sender?.avatar_url} name={msg.sender?.display_name ?? "?"} size="sm" />}
        </div>
      )}

      <div className={`max-w-[65%] group relative`}>
        {/* Action buttons */}
        {isHovered && !msg.is_deleted && (
          <div className={`absolute -top-8 ${isMe ? "right-0" : "left-0"} flex items-center gap-1 bg-white dark:bg-gray-800 rounded-full shadow-lg px-2 py-1 z-10`}>
            <button onClick={() => onReply(msg)} className="p-1 hover:text-[#128C7E] text-gray-500 transition-colors">
              <Reply className="w-3.5 h-3.5" />
            </button>
            {isMe && (
              <button onClick={() => onDelete(msg.id)} className="p-1 hover:text-red-500 text-gray-500 transition-colors">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}

        <div className={`px-3 py-2 shadow-sm ${bubbleClass}`}>
          {isGroup && !isMe && showAvatar && (
            <p className="text-xs font-semibold text-[#128C7E] mb-1">{msg.sender?.display_name}</p>
          )}

          {/* Reply preview */}
          {msg.reply_to && (
            <div className="mb-2 bg-black/5 dark:bg-white/10 rounded-lg px-2 py-1.5 border-l-2 border-[#128C7E]">
              <p className="text-xs font-semibold text-[#128C7E]">{msg.reply_to.sender?.display_name}</p>
              <p className="text-xs text-gray-600 dark:text-gray-300 truncate">{msg.reply_to.content ?? "📷 Media"}</p>
            </div>
          )}

          {msg.is_deleted ? (
            <p className="text-sm italic text-gray-400">This message was deleted</p>
          ) : msg.message_type === "image" && msg.file_url ? (
            <div className="rounded-lg overflow-hidden max-w-xs">
              <img src={msg.file_url} alt="Image" className="w-full max-h-60 object-cover cursor-pointer hover:opacity-95 transition-opacity" onClick={() => window.open(msg.file_url!, "_blank")} />
            </div>
          ) : msg.message_type === "file" ? (
            <a href={msg.file_url ?? "#"} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400 hover:underline">
              <Paperclip className="w-4 h-4 flex-shrink-0" />
              <span className="truncate max-w-[180px]">{msg.file_name}</span>
              {msg.file_size && <span className="text-xs text-gray-400 flex-shrink-0">({(msg.file_size / 1024).toFixed(0)}KB)</span>}
            </a>
          ) : (
            <p className="text-sm text-gray-900 dark:text-white whitespace-pre-wrap break-words">{msg.content}</p>
          )}

          <div className={`flex items-center gap-1 mt-1 ${isMe ? "justify-end" : "justify-end"}`}>
            <span className="text-[10px] text-gray-500 dark:text-gray-400">
              {format(new Date(msg.created_at), "HH:mm")}
            </span>
            {isMe && (
              <span className="text-[10px] text-[#4FC3F7]">✓✓</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
