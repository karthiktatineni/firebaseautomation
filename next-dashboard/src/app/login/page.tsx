"use client";

import { useState } from "react";
import { signInWithEmailAndPassword, setPersistence, browserLocalPersistence } from "firebase/auth";
import { auth } from "@/lib/firebase/client";
import { useRouter } from "next/navigation";

export default function Login() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const router = useRouter();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        try {
            await setPersistence(auth, browserLocalPersistence);
            await signInWithEmailAndPassword(auth, email, password);
            router.push("/dashboard");
        } catch (err: any) {
            setError(err.message || "Failed to login");
        }
    };

    return (
        <div className="min-h-screen bg-black flex flex-col justify-center items-center p-6 relative overflow-hidden">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-green-500/10 blur-[100px] rounded-full pointer-events-none" />

            <div className="w-full max-w-md bg-gray-900/80 backdrop-blur-xl border border-gray-800 p-8 rounded-3xl shadow-2xl relative z-10">
                <h1 className="text-3xl font-bold text-white mb-2 text-center">Welcome Back</h1>
                <p className="text-gray-400 mb-8 text-center text-sm">Sign in to control your smart home.</p>

                {error && (
                    <div className="bg-red-500/10 border border-red-500/50 text-red-500 p-3 rounded-xl mb-6 text-sm">
                        {error}
                    </div>
                )}

                <form onSubmit={handleLogin} className="space-y-5">
                    <div>
                        <label className="block text-gray-400 text-sm font-medium mb-1.5 ml-1">Email</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full bg-gray-800/50 border border-gray-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 transition-all placeholder:text-gray-600"
                            placeholder="you@home.com"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-gray-400 text-sm font-medium mb-1.5 ml-1">Password</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full bg-gray-800/50 border border-gray-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 transition-all placeholder:text-gray-600"
                            placeholder="••••••••"
                            required
                        />
                    </div>
                    <button
                        type="submit"
                        className="w-full bg-green-500 hover:bg-green-400 text-black font-semibold py-3 px-4 rounded-xl transition-all shadow-[0_0_20px_rgba(34,197,94,0.3)] hover:shadow-[0_0_30px_rgba(34,197,94,0.5)] active:scale-95 mt-2"
                    >
                        Sign In
                    </button>
                </form>
            </div>
        </div>
    );
}
