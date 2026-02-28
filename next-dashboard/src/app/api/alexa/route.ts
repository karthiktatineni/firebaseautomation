import { NextResponse } from "next/server";

export async function POST(req: Request) {
    try {
        const body = await req.json();

        if (!body?.request?.type) {
            throw new Error("Invalid Alexa request");
        }

        // Launch request
        if (body.request.type === "LaunchRequest") {
            return NextResponse.json({
                version: "1.0",
                response: {
                    outputSpeech: {
                        type: "PlainText",
                        text: "Welcome to Smart Home"
                    },
                    shouldEndSession: false
                }
            });
        }

        // Intent request
        if (body.request.type === "IntentRequest") {

            const intentName = body.request.intent?.name;
            const device = body.request.intent?.slots?.device?.value;

            if (!device) {
                throw new Error("Device slot missing");
            }

            let state = "";

            if (intentName === "TurnOnIntent") state = "ON";
            if (intentName === "TurnOffIntent") state = "OFF";

            return NextResponse.json({
                version: "1.0",
                response: {
                    outputSpeech: {
                        type: "PlainText",
                        text: `${device} turned ${state}`
                    },
                    shouldEndSession: true
                }
            });
        }

        throw new Error("Unknown request type");

    } catch (error) {
        console.error("Alexa Error:", error);

        return NextResponse.json({
            version: "1.0",
            response: {
                outputSpeech: {
                    type: "PlainText",
                    text: "Server error"
                },
                shouldEndSession: true
            }
        });
    }
}
