"use client";

interface DeviceCardProps {
    id: string;
    name: string;
    state: "ON" | "OFF";
    onToggle: (id: string, newState: "ON" | "OFF") => void;
    icon: React.ReactNode;
}

export default function DeviceCard({ id, name, state, onToggle, icon }: DeviceCardProps) {
    const isON = state === "ON";

    return (
        <div
            className={`relative p-6 rounded-3xl border transition-all duration-300 flex flex-col justify-center overflow-hidden
        ${isON
                    ? "bg-gray-800 border-green-500/30 shadow-[0_10px_30px_-5px_rgba(34,197,94,0.15)] transform -translate-y-1"
                    : "bg-gray-900 border-gray-800"
                }
      `}
        >
            {/* Background Glow */}
            <div
                className={`absolute inset-0 bg-green-500/10 blur-xl transition-opacity duration-500 rounded-full
          ${isON ? "opacity-100" : "opacity-0"}
        `}
            />

            <div className="relative z-10 flex justify-between items-center">
                <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-2xl flex justify-center items-center text-xl transition-all duration-300
            ${isON ? "bg-green-500/20 text-green-400 shadow-[0_0_15px_rgba(34,197,94,0.2)]" : "bg-gray-800 text-gray-500"}
          `}>
                        {icon}
                    </div>
                    <div>
                        <h2 className="text-lg font-bold text-white mb-0.5">{name}</h2>
                        <p className={`text-xs font-bold uppercase tracking-widest transition-colors duration-300
              ${isON ? "text-green-400" : "text-gray-500"}
            `}>
                            {state}
                        </p>
                    </div>
                </div>

                {/* Custom Toggle Switch */}
                <button
                    onClick={() => onToggle(id, isON ? "OFF" : "ON")}
                    className={`relative w-14 h-8 rounded-full transition-colors duration-300 outline-none focus:ring-2 focus:ring-green-400 focus:ring-offset-2 focus:ring-offset-gray-900
            ${isON ? "bg-green-500" : "bg-gray-700"}
          `}
                >
                    <span
                        className={`absolute top-[4px] left-[4px] bg-white w-6 h-6 rounded-full transition-transform duration-300 shadow-md
              ${isON ? "transform translate-x-[24px]" : ""}
            `}
                    />
                </button>
            </div>
        </div>
    );
}
