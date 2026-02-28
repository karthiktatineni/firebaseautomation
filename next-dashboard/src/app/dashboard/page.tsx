"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { ref, onValue, set } from "firebase/database";
import { auth, db } from "@/lib/firebase/client";
import DeviceCard from "@/components/DeviceCard";

// Fallback Icons (SVG primitives)
const LightIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.9 1.3 1.5 1.5 2.5" /><path d="M9 18h6" /><path d="M10 22h4" /></svg>
);
const FanIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.827 16.379a6.082 6.082 0 0 1-8.618-7.002l5.412 1.45a6.082 6.082 0 0 1 7.002-8.618l-1.45 5.412a6.082 6.082 0 0 1 8.618 7.002l-5.412-1.45a6.082 6.082 0 0 1-7.002 8.618l1.45-5.412Z" /><circle cx="12" cy="12" r="2" /></svg>
);
const PlugIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22v-5" /><path d="M9 8V2" /><path d="M15 8V2" /><path d="M18 8v5a4 4 0 0 1-4 4h-4a4 4 0 0 1-4-4V8Z" /></svg>
);

interface DevicesState {
    light1: "ON" | "OFF";
    light2: "ON" | "OFF";
    fan: "ON" | "OFF";
    plug: "ON" | "OFF";
}

export default function Dashboard() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [devices, setDevices] = useState<DevicesState | null>(null);

    useEffect(() => {
        const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
            // NOTE: Uncomment redirect for production
            // if (!user) router.push("/login");

            const devicesRef = ref(db, "devices");
            const unsubscribeDb = onValue(devicesRef, (snapshot) => {
                const data = snapshot.val();
                if (data) {
                    setDevices({
                        light1: data.light1?.state || "OFF",
                        light2: data.light2?.state || "OFF",
                        fan: data.fan?.state || "OFF",
                        plug: data.plug?.state || "OFF",
                    });
                }
                setLoading(false);
            });
            return () => unsubscribeDb();

        });

        return () => unsubscribeAuth();
    }, [router]);

    const handleToggle = async (id: string, newState: "ON" | "OFF") => {
        setDevices((prev) => prev ? { ...prev, [id]: newState } : null);

        try {
            if (typeof window !== 'undefined' && window.navigator && window.navigator.vibrate) {
                window.navigator.vibrate(50);
            }
            await set(ref(db, `devices/${id}/state`), newState);
        } catch (error) {
            console.error("Failed to update Firebase:", error);
            setDevices((prev) => prev ? { ...prev, [id]: newState === "ON" ? "OFF" : "ON" } : null);
        }
    };

    const handleToggleAll = async (newState: "ON" | "OFF") => {
        // Optimistic UI update
        const newDevicesState = {
            light1: newState,
            light2: newState,
            fan: newState,
            plug: newState,
        };

        setDevices(newDevicesState);

        try {
            if (typeof window !== 'undefined' && window.navigator && window.navigator.vibrate) {
                window.navigator.vibrate(50);
            }

            // Push each change individually
            const keys = ["light1", "light2", "fan", "plug"];
            await Promise.all(
                keys.map((id) => set(ref(db, `devices/${id}/state`), newState))
            );
        } catch (error) {
            console.error("Failed to update Firebase toggles:", error);
            // Re-fetch triggers will naturally clean up mismatches on next DB onValue ping anyway
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center">
                <div className="w-10 h-10 border-4 border-green-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-black text-white p-6 md:p-12 relative overflow-hidden">
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-500/10 blur-[120px] rounded-full pointer-events-none" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-green-500/10 blur-[120px] rounded-full pointer-events-none" />

            <div className="max-w-4xl mx-auto relative z-10">
                <header className="flex justify-between items-end mb-12 flex-wrap gap-4">
                    <div>
                        <h1 className="text-4xl font-bold tracking-tight mb-2">Smart Home</h1>
                        <p className="text-gray-400">Control your devices from anywhere.</p>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2 bg-gray-900 border border-gray-800 px-4 py-2 rounded-full">
                            <span className="w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse shadow-[0_0_8px_#22c55e]"></span>
                            <span className="text-sm font-medium text-gray-300 tracking-wide">Live Dashboard</span>
                        </div>
                        <button
                            onClick={() => signOut(auth).then(() => router.push("/login"))}
                            className="px-4 py-2 bg-gray-900 border border-gray-800 rounded-full hover:bg-gray-800 transition-colors text-sm font-medium focus:ring-2 focus:ring-green-500 outline-none"
                        >
                            Sign out
                        </button>
                    </div>
                </header>

                <div className="flex gap-4 mb-8">
                    <button
                        onClick={() => handleToggleAll("ON")}
                        className="flex-1 bg-green-500/20 hover:bg-green-500/30 text-green-400 border border-green-500/30 py-3 rounded-2xl font-semibold transition-all shadow-[0_0_20px_rgba(34,197,94,0.1)] hover:shadow-[0_0_25px_rgba(34,197,94,0.2)]"
                    >
                        Turn All ON
                    </button>
                    <button
                        onClick={() => handleToggleAll("OFF")}
                        className="flex-1 bg-gray-800 hover:bg-gray-700 text-gray-300 border border-gray-700 py-3 rounded-2xl font-semibold transition-all"
                    >
                        Turn All OFF
                    </button>
                </div>

                <main className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <DeviceCard id="light1" name="Light 1" state={devices?.light1 || "OFF"} onToggle={handleToggle} icon={<LightIcon />} />
                    <DeviceCard id="light2" name="Light 2" state={devices?.light2 || "OFF"} onToggle={handleToggle} icon={<LightIcon />} />
                    <DeviceCard id="fan" name="Ceiling Fan" state={devices?.fan || "OFF"} onToggle={handleToggle} icon={<FanIcon />} />
                    <DeviceCard id="plug" name="Smart Plug" state={devices?.plug || "OFF"} onToggle={handleToggle} icon={<PlugIcon />} />
                </main>
            </div>
        </div>
    );
}
