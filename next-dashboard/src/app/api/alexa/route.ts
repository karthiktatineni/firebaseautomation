import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";

export async function GET() {
    return NextResponse.json({ status: "Alexa API Endpoint Online. Expecting POST requests." }, { status: 200 });
}

export async function POST(req: Request) {
    try {
        const body = await req.json();

        if (!body || !body.request) {
            console.error("Invalid Alexa request payload");
            throw new Error("Invalid Alexa request");
        }

        if (body.request.type === "LaunchRequest") {
            return NextResponse.json(createAlexaResponse("Welcome to Smart Home. What do you want to control?", false));
        }

        if (body.request.type === "IntentRequest") {
            const intentName = body.request.intent?.name;
            const deviceRaw = body.request.intent?.slots?.device?.value;

            if (intentName === "TurnOnIntent" || intentName === "TurnOffIntent") {
                if (!deviceRaw) {
                    console.error("Device slot missing in IntentRequest");
                    return NextResponse.json(createAlexaResponse("I didn't catch the device name."));
                }

                const device = deviceRaw.toLowerCase();
                let state = intentName === "TurnOnIntent" ? "ON" : "OFF";

                if (!["light", "fan", "relay1", "relay2"].includes(device)) {
                    console.error(`Invalid device requested: ${device}`);
                    return NextResponse.json(createAlexaResponse(`I could not find a device named ${device}.`));
                }

                await adminDb.ref(`devices/${device}/state`).set(state);

                return NextResponse.json(createAlexaResponse(`Turned ${state.toLowerCase()} the ${device}.`));
            }

            console.error(`Unknown intent type: ${intentName}`);
        }

        return NextResponse.json(createAlexaResponse("Sorry, I didn't understand."));
    } catch (error) {
        console.error("Handling error details:", error);
        // Explicitly return a 200 JSON with 'Server error' message to satisfy Alexa gracefully instead of crashing
        return NextResponse.json(createAlexaResponse("Server error"));
    }
}

function createAlexaResponse(speechText: string, shouldEndSession: boolean = true) {
    return {
        version: "1.0",
        response: {
            outputSpeech: {
                type: "PlainText",
                text: speechText,
            },
            shouldEndSession,
        },
    };
}
