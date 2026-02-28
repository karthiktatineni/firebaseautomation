import { NextResponse } from "next/server";
import admin from "firebase-admin";

function getEnv(name: string) {
    const v = process.env[name];
    if (!v) throw new Error(`Missing env: ${name}`);
    return v;
}

// Initialize Firebase Admin once
if (!admin.apps.length) {
    const projectId = getEnv("FIREBASE_PROJECT_ID");
    const clientEmail = getEnv("FIREBASE_CLIENT_EMAIL");
    const privateKey = getEnv("FIREBASE_PRIVATE_KEY").replace(/\\n/g, "\n");

    // IMPORTANT: Use your Realtime Database URL here
    // Example: https://home-7d635-default-rtdb.firebaseio.com
    const databaseURL =
        process.env.FIREBASE_DATABASE_URL || process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL;

    if (!databaseURL) throw new Error("Missing env: FIREBASE_DATABASE_URL (or NEXT_PUBLIC_FIREBASE_DATABASE_URL)");

    admin.initializeApp({
        credential: admin.credential.cert({ projectId, clientEmail, privateKey }),
        databaseURL,
    });
}

const ALLOWED_DEVICES = new Set(["light one", "light two", "fan", "plug"]);

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
            const deviceRaw = body?.request?.intent?.slots?.device?.value;

            if (!deviceRaw) {
                console.log("Slot missing. Full body:", JSON.stringify(body));
                return NextResponse.json(buildResponse("Which device?", false));
            }

            const device = String(deviceRaw).trim().toLowerCase();

            if (!ALLOWED_DEVICES.has(device)) {
                console.log("Invalid device:", device);
                return NextResponse.json(buildResponse("Invalid device name", true));
            }

            let state = null;
            if (intentName === "TurnOnIntent") state = "ON";
            if (intentName === "TurnOffIntent") state = "OFF";

            if (!state) {
                console.log("Unknown intent:", intentName);
                return NextResponse.json(buildResponse("Unknown command", true));
            }

            // ✅ WRITE TO FIREBASE
            const path = `devices/${device}/state`;
            console.log("Writing Firebase:", path, state);

            await admin.database().ref(path).set(state);

            console.log("Firebase write OK:", path, state);

            return NextResponse.json(buildResponse(`${device} turned ${state}`, true));
        }

        return NextResponse.json(buildResponse("Unsupported request", true));
    } catch (err) {
        console.error("Alexa API error:", err);
        return NextResponse.json(buildResponse("Server error", true));
    }
}

function buildResponse(text: string, shouldEndSession = true) {
    return {
        version: "1.0",
        response: {
            outputSpeech: { type: "PlainText", text },
            shouldEndSession,
        },
    };
}
