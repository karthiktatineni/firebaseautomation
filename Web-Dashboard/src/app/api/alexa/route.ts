import { NextResponse } from "next/server";
import admin from "firebase-admin";

// ---------- Firebase Admin init (once) ----------
function mustEnv(name: string): string {
    const v = process.env[name];
    if (!v) throw new Error(`Missing env: ${name}`);
    return v;
}

if (!admin.apps.length) {
    const projectId = mustEnv("FIREBASE_PROJECT_ID");
    const clientEmail = mustEnv("FIREBASE_CLIENT_EMAIL");
    const privateKey = mustEnv("FIREBASE_PRIVATE_KEY").replace(/\\n/g, "\n");
    const databaseURL =
        process.env.FIREBASE_DATABASE_URL || process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL;

    if (!databaseURL) throw new Error("Missing env: FIREBASE_DATABASE_URL");

    admin.initializeApp({
        credential: admin.credential.cert({ projectId, clientEmail, privateKey }),
        databaseURL,
    });
}

// ---------- Device mapping to your RTDB keys ----------
const DEVICE_TO_KEY: Record<string, string> = {
    fan: "fan",
    plug: "plug",
    "light one": "light1",
    "light 1": "light1",
    light1: "light1",
    "light two": "light2",
    "light 2": "light2",
    light2: "light2",
};

// ---------- Helpers ----------
function buildResponse(text: string, shouldEndSession = true) {
    return {
        version: "1.0",
        response: {
            outputSpeech: { type: "PlainText", text },
            shouldEndSession,
        },
    };
}

// Prefer canonical resolved slot value (e.g., "light one") over raw ("light 1")
function getCanonicalSlotValue(slot: any) {
    if (!slot) return null;

    // Try new slotValue structure first (some requests include it)
    const slotValue = slot.slotValue?.resolutions?.resolutionsPerAuthority?.[0]?.values?.[0]?.value?.name;
    if (slotValue) return String(slotValue);

    // Try classic resolutions
    const resName =
        slot.resolutions?.resolutionsPerAuthority?.[0]?.values?.[0]?.value?.name;
    if (resName) return String(resName);

    // Fallback to raw
    if (slot.value) return String(slot.value);

    return null;
}

function normalizeDevice(s: string) {
    return String(s)
        .trim()
        .toLowerCase()
        .replace(/\s+/g, " "); // collapse multiple spaces
}

export async function POST(req: Request) {
    try {
        const body: any = await req.json();
        const type = body?.request?.type;

        // Launch
        if (type === "LaunchRequest") {
            return NextResponse.json(buildResponse("Welcome to Smart Home", false));
        }

        // Intent
        if (type === "IntentRequest") {
            const intentName = body?.request?.intent?.name;
            const slot = body?.request?.intent?.slots?.device;

            const rawOrCanonical = getCanonicalSlotValue(slot);
            if (!rawOrCanonical) {
                return NextResponse.json(buildResponse("Please tell me which device", false));
            }

            const deviceSpoken = normalizeDevice(rawOrCanonical);

            // Map to DB device key
            const deviceKey = DEVICE_TO_KEY[deviceSpoken];

            if (!deviceKey) {
                // Debug log so you can see what Alexa sent
                console.log("Unknown device slot:", {
                    raw: slot?.value,
                    canonical: rawOrCanonical,
                    normalized: deviceSpoken,
                });
                return NextResponse.json(buildResponse("Invalid device name", true));
            }

            const state =
                intentName === "TurnOnIntent" ? "ON" :
                    intentName === "TurnOffIntent" ? "OFF" :
                        null;

            if (!state) return NextResponse.json(buildResponse("Unknown command", true));

            // ✅ Write to your Firebase structure
            await admin.database().ref(`devices/${deviceKey}/state`).set(state);

            // Friendly response
            const speakName =
                deviceKey === "light1" ? "light one" :
                    deviceKey === "light2" ? "light two" :
                        deviceKey;

            return NextResponse.json(buildResponse(`${speakName} turned ${state}`, true));
        }

        return NextResponse.json(buildResponse("Unsupported request", true));
    } catch (err) {
        console.error("Alexa API error:", err);
        return NextResponse.json(buildResponse("Server error", true));
    }
}
