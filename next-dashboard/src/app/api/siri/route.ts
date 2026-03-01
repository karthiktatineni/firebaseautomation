import { NextResponse } from "next/server";
import admin from "firebase-admin";

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert({
            projectId: process.env.FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
        }),
        databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL || process.env.FIREBASE_DATABASE_URL,
    });
}

export async function POST(req: Request) {
    try {
        const { device, state } = await req.json();

        const map: Record<string, string> = {
            fan: "fan",
            light1: "light1",
            light2: "light2",
            plug: "plug",
        };

        if (!map[device]) {
            return NextResponse.json({ status: "Invalid device" }, { status: 400 });
        }

        await admin
            .database()
            .ref(`devices/${map[device]}/state`)
            .set(state);

        return NextResponse.json({ status: "Success" });
    } catch (err) {
        console.error("Siri API error:", err);
        return NextResponse.json({ status: "Error" }, { status: 500 });
    }
}
