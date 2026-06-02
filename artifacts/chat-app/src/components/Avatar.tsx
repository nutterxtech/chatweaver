interface AvatarProps {
  src?: string | null;
  name: string;
  size?: "sm" | "md" | "lg" | "xl";
  online?: boolean;
  className?: string;
}

const sizeMap = { sm: "w-8 h-8 text-xs", md: "w-10 h-10 text-sm", lg: "w-12 h-12 text-base", xl: "w-16 h-16 text-xl" };
const dotMap = { sm: "w-2 h-2 border", md: "w-2.5 h-2.5 border", lg: "w-3 h-3 border-2", xl: "w-4 h-4 border-2" };

function getInitials(name: string) {
  return name.split(" ").map(n => n[0]).slice(0, 2).join("").toUpperCase();
}

function getColor(name: string) {
  const colors = ["bg-[#128C7E]", "bg-[#075E54]", "bg-purple-500", "bg-blue-500", "bg-pink-500", "bg-orange-500", "bg-indigo-500", "bg-teal-500"];
  return colors[name.charCodeAt(0) % colors.length];
}

export function Avatar({ src, name, size = "md", online, className = "" }: AvatarProps) {
  return (
    <div className={`relative flex-shrink-0 ${className}`}>
      {src ? (
        <img src={src} alt={name} className={`${sizeMap[size]} rounded-full object-cover`} onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
      ) : (
        <div className={`${sizeMap[size]} ${getColor(name)} rounded-full flex items-center justify-center text-white font-semibold select-none`}>
          {getInitials(name)}
        </div>
      )}
      {online !== undefined && (
        <span className={`absolute bottom-0 right-0 ${dotMap[size]} rounded-full border-white dark:border-gray-900 ${online ? "bg-green-500" : "bg-gray-400"}`} />
      )}
    </div>
  );
}
