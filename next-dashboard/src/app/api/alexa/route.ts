import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";

export async function POST(req: Request) {
    try {
        const body = await req.json();

        const request = body.request;

        // Skill Launch Request
        if (request.type === "LaunchRequest") {
            return NextResponse.json(createAlexaResponse("Welcome to My Smart Home. Which device would you like to control?"));
        }

        if (request.type === "IntentRequest") {
            const intentName = request.intent.name;

            if (intentName === "TurnOnIntent" || intentName === "TurnOffIntent") {
                const slots = request.intent.slots;
                if (!slots || !slots.device || !slots.device.value) {
                    return NextResponse.json(createAlexaResponse("I didn't catch the device name."));
                }

                const deviceName = slots.device.value.toLowerCase().replace(" ", "");

                // Map common spoken name to our db keys
                const validDevices = ["light", "fan", "relay1", "relay2"];
                let dbKey = validDevices.includes(deviceName) ? deviceName : null;

                if (!dbKey) {
                    if (deviceName.includes("light")) dbKey = "light";
                    else if (deviceName.includes("fan")) dbKey = "fan";
                    else if (deviceName.includes("relay one") || deviceName.includes("first relay")) dbKey = "relay1";
                    else if (deviceName.includes("relay two") || deviceName.includes("second relay")) dbKey = "relay2";
                }

                if (!dbKey) {
                    return NextResponse.json(createAlexaResponse(`I could not find a device named ${deviceName}.`));
                }

                const state = intentName === "TurnOnIntent" ? "ON" : "OFF";

                // Update Firebase
                await adminDb.ref(`devices/${dbKey}/state`).set(state);

                return NextResponse.json(createAlexaResponse(`Turned ${state.toLowerCase()} the ${dbKey}.`));
            }
        }

        return NextResponse.json(createAlexaResponse("Invalid request."));

    } catch (error) {
        console.error("Alexa API Error:", error);
        return NextResponse.json(createAlexaResponse("There was an error communicating with the smart home system."), { status: 500 });
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
