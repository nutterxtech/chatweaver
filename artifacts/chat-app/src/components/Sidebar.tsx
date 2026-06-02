import { useState } from "react";
import { MessageCircle, Users, Settings, Search, Plus, Moon, Sun, LogOut, X, Phone, UserPlus } from "lucide-react";
import { Avatar } from "./Avatar";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { useConversations, type ConversationWithDetails } from "@/hooks/useConversations";
import { useContacts } from "@/hooks/useContacts";
import { formatDistanceToNow } from "date-fns";
import { useToast } from "@/hooks/use-toast";

interface SidebarProps {
  selectedConversationId: string | null;
  onSelectConversation: (id: string) => void;
}

type Tab = "chats" | "contacts" | "settings";

export function Sidebar({ selectedConversationId, onSelectConversation }: SidebarProps) {
  const { profile, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { conversations, loading: convsLoading } = useConversations();
  const { contacts, loading: contactsLoading, addContact, startConversation } = useContacts();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState<Tab>("chats");
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddContact, setShowAddContact] = useState(false);
  const [addContactInput, setAddContactInput] = useState("");
  const [addContactLoading, setAddContactLoading] = useState(false);

  const filteredConvs = conversations.filter(c => {
    const name = c.is_group ? c.group_name : c.other_user?.display_name;
    return name?.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const filteredContacts = contacts.filter(c =>
    c.profile.display_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.profile.phone.includes(searchQuery)
  );

  const handleAddContact = async () => {
    if (!addContactInput.trim()) return;
    setAddContactLoading(true);
    const result = await addContact(addContactInput.trim());
    setAddContactLoading(false);
    if ("error" in result) {
      toast({ title: "Error", description: result.error, variant: "destructive" });
    } else {
      toast({ title: "Contact added!", description: result.profile?.display_name });
      setAddContactInput("");
      setShowAddContact(false);
    }
  };

  const handleStartConversation = async (contactId: string) => {
    const convId = await startConversation(contactId);
    if (convId) {
      onSelectConversation(convId);
      setActiveTab("chats");
    }
  };

  const getLastMessagePreview = (conv: ConversationWithDetails) => {
    if (!conv.last_message) return "No messages yet";
    if (conv.last_message.is_deleted) return "This message was deleted";
    if (conv.last_message.message_type === "image") return "📷 Photo";
    if (conv.last_message.message_type === "file") return `📎 ${conv.last_message.file_name ?? "File"}`;
    return conv.last_message.content ?? "";
  };

  return (
    <div className="w-[380px] flex-shrink-0 flex flex-col h-full bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800">
      {/* Header */}
      <div className="px-4 py-3 bg-[#f0f2f5] dark:bg-gray-800 flex items-center justify-between">
        <Avatar src={profile?.avatar_url} name={profile?.display_name ?? "Me"} size="md" />
        <div className="flex items-center gap-2">
          <button onClick={toggleTheme} data-testid="button-toggle-theme" className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors text-gray-600 dark:text-gray-300">
            {theme === "dark" ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>
          <button onClick={() => setActiveTab("settings")} data-testid="button-settings" className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors text-gray-600 dark:text-gray-300">
            <Settings className="w-5 h-5" />
          </button>
          <button onClick={signOut} data-testid="button-signout" className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors text-gray-600 dark:text-gray-300">
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
        {[
          { id: "chats" as Tab, icon: MessageCircle, label: "Chats" },
          { id: "contacts" as Tab, icon: Users, label: "Contacts" },
        ].map(tab => (
          <button
            key={tab.id}
            data-testid={`tab-${tab.id}`}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 flex flex-col items-center py-3 text-xs font-medium transition-colors gap-1 ${activeTab === tab.id ? "text-[#128C7E] border-b-2 border-[#128C7E]" : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"}`}
          >
            <tab.icon className="w-5 h-5" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="px-3 py-2 bg-white dark:bg-gray-900">
        <div className="relative">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
          <input
            data-testid="input-search"
            type="search"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder={activeTab === "chats" ? "Search chats..." : "Search contacts..."}
            className="w-full pl-9 pr-4 py-2 rounded-lg bg-[#f0f2f5] dark:bg-gray-800 text-sm text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery("")} className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === "chats" && (
          <>
            {convsLoading ? (
              <div className="space-y-1 p-2">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="flex items-center gap-3 px-3 py-3 rounded-lg">
                    <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 animate-pulse" />
                    <div className="flex-1 space-y-2">
                      <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-32" />
                      <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-48" />
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredConvs.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 text-gray-400 gap-2">
                <MessageCircle className="w-10 h-10 opacity-30" />
                <p className="text-sm">{searchQuery ? "No chats found" : "No conversations yet"}</p>
                <p className="text-xs">Add a contact to start chatting</p>
              </div>
            ) : (
              filteredConvs.map(conv => {
                const name = conv.is_group ? conv.group_name : conv.other_user?.display_name;
                const avatar = conv.is_group ? conv.group_avatar_url : conv.other_user?.avatar_url;
                const isOnline = !conv.is_group && conv.other_user?.is_online;
                const preview = getLastMessagePreview(conv);
                const time = conv.last_message?.created_at ?? conv.updated_at;
                const isSelected = conv.id === selectedConversationId;

                return (
                  <button
                    key={conv.id}
                    data-testid={`conv-item-${conv.id}`}
                    onClick={() => onSelectConversation(conv.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-[#f0f2f5] dark:hover:bg-gray-800 transition-colors ${isSelected ? "bg-[#f0f2f5] dark:bg-gray-800" : ""}`}
                  >
                    <Avatar src={avatar} name={name ?? "?"} size="md" online={isOnline} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-sm text-gray-900 dark:text-white truncate">{name}</span>
                        <span className="text-xs text-gray-500 dark:text-gray-400 flex-shrink-0 ml-2">
                          {formatDistanceToNow(new Date(time), { addSuffix: false })}
                        </span>
                      </div>
                      <div className="flex items-center justify-between mt-0.5">
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{preview}</p>
                        {conv.unread_count > 0 && (
                          <span className="ml-2 flex-shrink-0 bg-[#128C7E] text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-medium">
                            {conv.unread_count > 9 ? "9+" : conv.unread_count}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </>
        )}

        {activeTab === "contacts" && (
          <>
            <div className="px-4 py-2 flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Contacts</span>
              <button
                data-testid="button-add-contact"
                onClick={() => setShowAddContact(!showAddContact)}
                className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-[#128C7E]"
              >
                <UserPlus className="w-4 h-4" />
              </button>
            </div>

            {showAddContact && (
              <div className="mx-3 mb-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Enter email or phone number:</p>
                <div className="flex gap-2">
                  <input
                    data-testid="input-add-contact"
                    value={addContactInput}
                    onChange={e => setAddContactInput(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && handleAddContact()}
                    placeholder="email or +1234567890"
                    className="flex-1 px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#128C7E]"
                  />
                  <button
                    data-testid="button-confirm-add-contact"
                    onClick={handleAddContact}
                    disabled={addContactLoading}
                    className="px-3 py-2 bg-[#128C7E] hover:bg-[#0f7066] text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-60"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {contactsLoading ? (
              <div className="space-y-1 p-2">
                {[1, 2, 3].map(i => (
                  <div key={i} className="flex items-center gap-3 px-3 py-3">
                    <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 animate-pulse" />
                    <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-32" />
                  </div>
                ))}
              </div>
            ) : filteredContacts.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 text-gray-400 gap-2">
                <Users className="w-10 h-10 opacity-30" />
                <p className="text-sm">{searchQuery ? "No contacts found" : "No contacts yet"}</p>
                <p className="text-xs">Add someone by email or phone</p>
              </div>
            ) : (
              filteredContacts.map(contact => (
                <button
                  key={contact.id}
                  data-testid={`contact-item-${contact.id}`}
                  onClick={() => handleStartConversation(contact.contact_id)}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[#f0f2f5] dark:hover:bg-gray-800 transition-colors"
                >
                  <Avatar src={contact.profile.avatar_url} name={contact.profile.display_name} size="md" online={contact.profile.is_online} />
                  <div className="flex-1 min-w-0 text-left">
                    <p className="font-medium text-sm text-gray-900 dark:text-white">{contact.nickname ?? contact.profile.display_name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                      <Phone className="w-3 h-3" />
                      {contact.profile.phone}
                    </p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${contact.profile.is_online ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-500"}`}>
                    {contact.profile.is_online ? "online" : "offline"}
                  </span>
                </button>
              ))
            )}
          </>
        )}

        {activeTab === "settings" && (
          <SettingsPanel />
        )}
      </div>
    </div>
  );
}

function SettingsPanel() {
  const { profile, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { toast: _toast } = useToast();

  return (
    <div className="p-4 space-y-6">
      <div className="flex flex-col items-center gap-3 py-4">
        <Avatar src={profile?.avatar_url} name={profile?.display_name ?? "Me"} size="xl" />
        <div className="text-center">
          <p className="font-semibold text-gray-900 dark:text-white">{profile?.display_name}</p>
          <p className="text-sm text-gray-500 dark:text-gray-400">{profile?.phone}</p>
        </div>
      </div>

      <div className="space-y-3">
        <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 space-y-3">
          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Profile</p>
          <div>
            <p className="text-xs text-gray-400 mb-1">Display Name</p>
            <p className="text-sm font-medium text-gray-900 dark:text-white">{profile?.display_name}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 mb-1">Email</p>
            <p className="text-sm text-gray-900 dark:text-white">{profile?.email}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 mb-1">Phone</p>
            <p className="text-sm text-gray-900 dark:text-white">{profile?.phone}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 mb-1">About</p>
            <p className="text-sm text-gray-900 dark:text-white">{profile?.about ?? "Hey there!"}</p>
          </div>
        </div>

        <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4">
          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">Appearance</p>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-900 dark:text-white">Dark Mode</span>
            <button
              data-testid="button-theme-toggle-settings"
              onClick={toggleTheme}
              className={`relative w-12 h-6 rounded-full transition-colors ${theme === "dark" ? "bg-[#128C7E]" : "bg-gray-300"}`}
            >
              <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${theme === "dark" ? "translate-x-6" : ""}`} />
            </button>
          </div>
        </div>

        <button
          data-testid="button-signout-settings"
          onClick={signOut}
          className="w-full py-3 rounded-xl border border-red-200 dark:border-red-900 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 text-sm font-medium transition-colors flex items-center justify-center gap-2"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </div>
    </div>
  );
}
