import { useState } from "react";
import { Sidebar } from "@/components/Sidebar";
import { ChatWindow } from "@/components/ChatWindow";
import { EmptyState } from "@/components/EmptyState";

export default function ChatPage() {
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);

  return (
    <div className="flex h-screen overflow-hidden bg-white dark:bg-gray-900">
      <Sidebar
        selectedConversationId={selectedConversationId}
        onSelectConversation={setSelectedConversationId}
      />
      {selectedConversationId ? (
        <ChatWindow conversationId={selectedConversationId} />
      ) : (
        <EmptyState />
      )}
    </div>
  );
}
