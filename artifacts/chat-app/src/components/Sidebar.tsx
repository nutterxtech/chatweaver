import { useState } from "react";
import { MessageCircle, Users, Settings, Search, Plus, Moon, Sun, LogOut, X, Phone, UserPlus, Check } from "lucide-react";
import { Avatar } from "./Avatar";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { useConversations } from "@/hooks/useConversations";
import { useContacts } from "@/hooks/useContacts";
import { formatDistanceToNow } from "date-fns";

type Panel = "chats" | "contacts" | "settings";

interface SidebarProps {
  selectedConversationId: string | null;
  onSelectConversation: (id: string) => void;
}

export function Sidebar({ selectedConversationId, onSelectConversation }: SidebarProps) {
  const { dbUser, signOut } = useAuth();
  const { conversations, loading: convsLoading } = useConversations();
  const { contacts, loading: contactsLoading, addContact, startConversation } = useContacts();
  const { theme, toggleTheme } = useTheme();

  const [panel, setPanel] = useState<Panel>("chats");
  const [search, setSearch] = useState("");
  const [addContactQuery, setAddContactQuery] = useState("");
  const [addContactLoading, setAddContactLoading] = useState(false);
  const [addContactMsg, setAddContactMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const filteredConvs = conversations.filter(c => {
    if (!search) return true;
    const name = c.is_group ? c.group_name : c.other_user?.name;
    return name?.toLowerCase().includes(search.toLowerCase());
  });

  const filteredContacts = contacts.filter(c =>
    !search || c.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleAddContact = async () => {
    if (!addContactQuery.trim()) return;
    setAddContactLoading(true);
    setAddContactMsg(null);
    const result = await addContact(addContactQuery.trim());
    setAddContactLoading(false);
    if (result.error) {
      setAddContactMsg({ type: "err", text: result.error });
    } else {
      setAddContactMsg({ type: "ok", text: `${result.user?.name} added!` });
      setAddContactQuery("");
    }
  };

  const handleContactClick = async (contactId: string) => {
    const convId = await startConversation(contactId);
    if (convId) onSelectConversation(convId);
    setPanel("chats");
  };

  const isOnline = (lastSeen: string) => {
    if (!lastSeen) return false;
    const diff = Date.now() - new Date(lastSeen).getTime();
    return diff < 5 * 60 * 1000;
  };

  return (
    <div className="flex h-full">
      {/* Icon rail */}
      <div className="flex flex-col items-center w-14 bg-[#128C7E] dark:bg-gray-900 py-3 gap-1">
        <div className="mb-3">
          <Avatar
            src={dbUser?.profile_picture}
            name={dbUser?.name ?? "U"}
            size="sm"
            online={true}
          />
        </div>
        <NavBtn active={panel === "chats"} onClick={() => setPanel("chats")} title="Chats">
          <MessageCircle className="w-5 h-5" />
        </NavBtn>
        <NavBtn active={panel === "contacts"} onClick={() => setPanel("contacts")} title="Contacts">
          <Users className="w-5 h-5" />
        </NavBtn>
        <div className="flex-1" />
        <NavBtn active={false} onClick={toggleTheme} title="Toggle theme">
          {theme === "dark" ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </NavBtn>
        <NavBtn active={panel === "settings"} onClick={() => setPanel("settings")} title="Settings">
          <Settings className="w-5 h-5" />
        </NavBtn>
        <NavBtn active={false} onClick={signOut} title="Sign out">
          <LogOut className="w-5 h-5" />
        </NavBtn>
      </div>

      {/* Panel */}
      <div className="flex flex-col flex-1 min-w-0 bg-white dark:bg-gray-850 border-r border-gray-200 dark:border-gray-800">
        {/* Header */}
        <div className="px-4 pt-4 pb-2">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-bold text-gray-900 dark:text-white capitalize">{panel}</h2>
            {panel === "contacts" && (
              <button
                onClick={() => { setAddContactQuery(""); setAddContactMsg(null); }}
                className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300"
                title="Add contact"
              >
                <UserPlus className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Add contact form */}
          {panel === "contacts" && (
            <div className="mb-2">
              <div className="flex gap-2">
                <input
                  value={addContactQuery}
                  onChange={e => { setAddContactQuery(e.target.value); setAddContactMsg(null); }}
                  onKeyDown={e => e.key === "Enter" && handleAddContact()}
                  placeholder="Phone or email to add..."
                  className="flex-1 text-xs px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#128C7E]"
                />
                <button
                  onClick={handleAddContact}
                  disabled={addContactLoading || !addContactQuery.trim()}
                  className="px-3 py-2 bg-[#128C7E] text-white rounded-lg text-xs font-medium hover:bg-[#0f7066] disabled:opacity-50"
                >
                  {addContactLoading ? "..." : <Plus className="w-3.5 h-3.5" />}
                </button>
              </div>
              {addContactMsg && (
                <p className={`text-xs mt-1 ${addContactMsg.type === "ok" ? "text-green-600" : "text-red-500"}`}>
                  {addContactMsg.text}
                </p>
              )}
            </div>
          )}

          {/* Search */}
          {panel !== "settings" && (
            <div className="relative">
              <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-gray-400" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder={panel === "chats" ? "Search chats..." : "Search contacts..."}
                className="w-full pl-9 pr-8 py-2 text-sm rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-[#128C7E] border-none"
              />
              {search && (
                <button onClick={() => setSearch("")} className="absolute right-3 top-2.5 text-gray-400">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          )}
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {panel === "chats" && (
            convsLoading ? (
              <LoadingList />
            ) : filteredConvs.length === 0 ? (
              <div className="p-6 text-center text-gray-400 text-sm">
                {search ? "No results" : "No chats yet.\nAdd a contact to start chatting."}
              </div>
            ) : (
              filteredConvs.map(conv => {
                const name = conv.is_group ? (conv.group_name ?? "Group") : (conv.other_user?.name ?? "Unknown");
                const pic = conv.is_group ? conv.group_photo : conv.other_user?.profile_picture;
                const online = !conv.is_group && isOnline(conv.other_user?.last_seen ?? "");
                return (
                  <button
                    key={conv.id}
                    onClick={() => onSelectConversation(conv.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-left ${selectedConversationId === conv.id ? "bg-gray-100 dark:bg-gray-800" : ""}`}
                  >
                    <Avatar src={pic} name={name} size="md" online={!conv.is_group ? online : undefined} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-gray-900 dark:text-white text-sm truncate">{name}</span>
                        {conv.last_message_at && (
                          <span className="text-xs text-gray-400 ml-2 flex-shrink-0">
                            {formatDistanceToNow(new Date(conv.last_message_at), { addSuffix: false })}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center justify-between mt-0.5">
                        <span className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-[160px]">
                          {conv.last_message ?? "Start a conversation"}
                        </span>
                        {conv.unread_count > 0 && (
                          <span className="ml-2 flex-shrink-0 w-5 h-5 rounded-full bg-[#25D366] flex items-center justify-center text-white text-[10px] font-bold">
                            {conv.unread_count}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })
            )
          )}

          {panel === "contacts" && (
            contactsLoading ? (
              <LoadingList />
            ) : filteredContacts.length === 0 ? (
              <div className="p-6 text-center text-gray-400 text-sm">
                {search ? "No results" : "No contacts yet.\nAdd someone by phone or email above."}
              </div>
            ) : (
              filteredContacts.map(contact => (
                <button
                  key={contact.id}
                  onClick={() => handleContactClick(contact.id)}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-left"
                >
                  <Avatar
                    src={contact.profile_picture}
                    name={contact.name}
                    size="md"
                    online={isOnline(contact.last_seen)}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 dark:text-white text-sm">{contact.name}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <Phone className="w-3 h-3 text-gray-400" />
                      <p className="text-xs text-gray-500 dark:text-gray-400">{contact.phone}</p>
                    </div>
                  </div>
                  {isOnline(contact.last_seen) && (
                    <span className="text-xs text-green-500 flex-shrink-0">online</span>
                  )}
                </button>
              ))
            )
          )}

          {panel === "settings" && dbUser && (
            <div className="p-4 space-y-5">
              <div className="flex flex-col items-center gap-3 py-4">
                <Avatar src={dbUser.profile_picture} name={dbUser.name} size="xl" online={true} />
                <div className="text-center">
                  <p className="font-bold text-gray-900 dark:text-white">{dbUser.name}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">@{dbUser.username}</p>
                  {dbUser.is_verified && (
                    <span className="inline-flex items-center gap-1 mt-1 text-xs text-[#128C7E]">
                      <Check className="w-3 h-3" /> Verified
                    </span>
                  )}
                </div>
              </div>
              <SettingRow label="Email" value={dbUser.email} />
              <SettingRow label="Phone" value={dbUser.phone} />
              <SettingRow label="Status" value={dbUser.status ?? "Hey there!"} />
              <SettingRow label="Username" value={`@${dbUser.username}`} />
              <SettingRow label="Friends" value={`${dbUser.friends?.length ?? 0} contacts`} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function NavBtn({ active, onClick, children, title }: { active: boolean; onClick: () => void; children: React.ReactNode; title: string }) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors ${active ? "bg-white/20 text-white" : "text-white/60 hover:bg-white/10 hover:text-white"}`}
    >
      {children}
    </button>
  );
}

function SettingRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5 py-2 border-b border-gray-100 dark:border-gray-800 last:border-0">
      <span className="text-xs text-gray-400 uppercase tracking-wide">{label}</span>
      <span className="text-sm text-gray-800 dark:text-gray-200 font-medium">{value}</span>
    </div>
  );
}

function LoadingList() {
  return (
    <div className="space-y-1 p-2">
      {[...Array(6)].map((_, i) => (
        <div key={i} className="flex items-center gap-3 px-2 py-2.5 animate-pulse">
          <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 flex-shrink-0" />
          <div className="flex-1 space-y-1.5">
            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
            <div className="h-2.5 bg-gray-100 dark:bg-gray-800 rounded w-3/4" />
          </div>
        </div>
      ))}
    </div>
  );
}
