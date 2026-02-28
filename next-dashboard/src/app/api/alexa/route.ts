import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";

export async function GET() {
    return NextResponse.json({ status: "Alexa API Endpoint Online. Expecting POST requests." }, { status: 200 });
}

export async function POST(req: Request) {
    try {
        const body = await req.json();

        if (body.request.type === "LaunchRequest") {
            return NextResponse.json(createAlexaResponse("Welcome to Smart Home"));
        }

        if (body.request.type === "IntentRequest") {
            const intentName = body.request.intent.name;
            const device = body.request.intent.slots.device.value.toLowerCase();

            let state = "";

            if (intentName === "TurnOnIntent") state = "ON";
            if (intentName === "TurnOffIntent") state = "OFF";

            if (!["light", "fan", "relay1", "relay2"].includes(device)) {
                return NextResponse.json(createAlexaResponse("Invalid device"));
            }

            await adminDb.ref(`devices/${device}/state`).set(state);

            return NextResponse.json(createAlexaResponse(`${device} turned ${state}`));
        }

        return NextResponse.json(createAlexaResponse("Sorry, I didn't understand."));
    } catch (error) {
        return NextResponse.json(createAlexaResponse("Server error"), { status: 500 });
    }
}

function createAlexaResponse(speechText: string) {
    return {
        version: "1.0",
        response: {
            outputSpeech: {
                type: "PlainText",
                text: speechText,
            },
            shouldEndSession: true,
        },
    };
}
