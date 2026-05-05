import "dotenv-flow/config";
import express from "express";
import ExpressWs from "express-ws";
import * as crypto from "crypto";
import bot from "./bot";
import { TwilioMediaStreamWebsocket } from "./twilio";

const { app } = ExpressWs(express());
app.use(express.urlencoded({ extended: true })).use(express.json());

// ========================================
// Configuration
// ========================================
const XAI_API_KEY = process.env.XAI_API_KEY || "";
const API_URL = process.env.API_URL || "wss://api.x.ai/v1/realtime?model=grok-voice-think-fast-1.0";
// Feature flags
const ENABLE_TOOLS = process.env.ENABLE_TOOLS !== "false"; // Default: enabled

// Clean event logging - just event names, no emojis
function logEvent(callId: string, eventType: string, extra?: string) {
  if (extra) {
    console.log(`[${callId}] ${eventType}`);
    console.log(`  ${extra}`);
  } else {
    console.log(`[${callId}] ${eventType}`);
  }
}

// Helper to generate cryptographically secure IDs
function generateSecureId(prefix: string): string {
  return `${prefix}_${crypto.randomBytes(16).toString('hex')}`;
}

function routeParamString(value: string | string[] | undefined): string {
  if (value === undefined) return "";
  return Array.isArray(value) ? (value[0] ?? "") : value;
}

function logXaiProtocolError(scope: string, callId: string, message: Record<string, unknown>) {
  const err = message.error;
  const detail =
    err && typeof err === "object"
      ? JSON.stringify(err)
      : err != null
        ? String(err)
        : JSON.stringify(message);
  console.error(`[XAI][${scope}][${callId}] error: ${detail}`);
}

// ========================================
// Tool Handlers
// ========================================
async function handleToolCall(name: string, args: Record<string, any>): Promise<string> {
  switch (name) {
    case "submit_deal": {
      const payload = {
        event: "submit_deal",
        timestamp: new Date().toISOString(),
        data: args,
      };
      console.log(`[TOOL] ${JSON.stringify(payload)}`);
      return JSON.stringify({
        ok: true,
        message: "Deal intake submitted to logging pipeline.",
      });
    }
    default:
      return JSON.stringify({ error: `Unknown tool: ${name}` });
  }
}

// ========================================
// Health Check Endpoint
// ========================================
app.get("/health", (req, res) => {
  const health = {
    status: "ok",
    timestamp: new Date().toISOString(),
  };
  res.json(health);
});

// ========================================
// Twilio Voice Webhook Endpoints
// ========================================
app.post("/twiml", async (req, res) => {
  const body = req.body as Record<string, string | undefined>;
  const callSid = body?.CallSid ?? "";
  const from = body?.From ?? "";
  const to = body?.To ?? "";
  console.log(
    `[INBOUND] webhook /twiml: Twilio CallSid=${callSid || "(missing)"} From=${from || "?"} To=${to || "?"}`
  );

  try {
    const callId = generateSecureId('call');

    if (!process.env.HOSTNAME) {
      res.status(500).send("Server misconfigured: HOSTNAME not set");
      return;
    }

    res.status(200);
    res.type("text/xml");

    const hostname = process.env.HOSTNAME.replace(/^https?:\/\//, '');
    const streamUrl = `wss://${hostname}/media-stream/${callId}`;

    console.log(
      `[INBOUND] returning TwiML for internalCallId=${callId} media stream=${streamUrl}`
    );

    const twimlResponse = `\
<Response>
  <Connect>
    <Stream url="${streamUrl}" />
  </Connect>
</Response>
`;
    res.end(twimlResponse);
  } catch (error) {
    console.error("[INBOUND] /twiml failed:", error);
    res.status(500).send();
  }
});

app.post("/call-status", async (req, res) => {
  res.status(200).send();
});

// ========================================
// Twilio Media Stream Websocket Endpoint
// ========================================
app.ws("/media-stream/:callId", async (ws, req) => {
  const callId = routeParamString(req.params.callId);

  console.log(`\n[${callId}] === INBOUND media stream WebSocket open (Twilio connecting) ===`);

  const tw = new TwilioMediaStreamWebsocket(ws);

  // Set up Twilio start event handler IMMEDIATELY (before async operations)
  tw.on("start", (msg) => {
    tw.streamSid = msg.start.streamSid;
    logEvent(callId, 'twilio.start');
    const sid = msg.start.callSid ?? "";
    console.log(
      `[INBOUND][${callId}] Twilio media stream started (CallSid=${sid || "?"} streamSid=${msg.start.streamSid})`
    );
  });

  const WebSocket = require('ws');
  console.log(`[INBOUND][${callId}] opening XAI realtime WebSocket…`);

  const xaiWs = new WebSocket(API_URL, {
    headers: {
      'Authorization': `Bearer ${XAI_API_KEY}`,
      'Content-Type': 'application/json'
    }
  });

  try {
    await new Promise((resolve, reject) => {
      const wsTimeout = setTimeout(() => {
        xaiWs.close();
        reject(new Error("x.ai WebSocket connection timeout"));
      }, 10000);

      xaiWs.on('open', () => {
        clearTimeout(wsTimeout);
        logEvent(callId, 'websocket.open');
        console.log(`[INBOUND][${callId}] XAI WebSocket connected; waiting for conversation/session…`);
        resolve(null);
      });

      xaiWs.on('error', (error: any) => {
        clearTimeout(wsTimeout);
        reject(error);
      });
    });
  } catch (err) {
    console.error(`[INBOUND][${callId}] failed to connect to XAI:`, err);
    ws.close();
    return;
  }

  // Flag to track when session is configured - DO NOT send audio until this is true
  let sessionReady = false;
  let turnCount = 0;
  let turnActive = false; // Track if a turn is in progress
  let hasSentInitialPrompt = false;
  const pendingAudioChunks: string[] = [];
  const MAX_BUFFERED_AUDIO_CHUNKS = 500;
  const processedToolCallIds = new Set<string>();

  const processToolCall = async (functionName: string, functionCallId: string, args: Record<string, any>) => {
    if (!functionCallId || processedToolCallIds.has(functionCallId)) {
      return;
    }
    processedToolCallIds.add(functionCallId);
    console.log(`[${callId}] FUNCTION CALL: ${functionName}(${JSON.stringify(args)})`);
    const result = await handleToolCall(functionName, args);
    console.log(`[${callId}] FUNCTION RESULT: ${result}`);

    const functionResult = {
      type: "conversation.item.create",
      item: {
        type: "function_call_output",
        call_id: functionCallId,
        output: result,
      },
    };
    logEvent(callId, functionResult.type);
    xaiWs.send(JSON.stringify(functionResult));

    const responseCreate = { type: "response.create" };
    logEvent(callId, responseCreate.type);
    xaiWs.send(JSON.stringify(responseCreate));
  };

  // Handle messages from x.ai WebSocket
  xaiWs.on('message', (data: Buffer) => {
    try {
      const message = JSON.parse(data.toString());

      // Log events to console (skip raw audio chunks)
      if (message.type !== 'response.output_audio.delta' && message.type !== 'input_audio_buffer.append') {
        logEvent(callId, message.type);
      }

      if (message.type === 'response.output_audio.delta' && message.delta) {
        // Bot is speaking - sending audio to Twilio (PCMU format)
        const twilioMessage = {
          event: "media" as const,
          media: { payload: message.delta },
          streamSid: tw.streamSid!,
        };
        tw.send(twilioMessage);
      } else if (message.type === 'response.created') {
        // Check if previous turn was interrupted (new response started before previous ended)
        if (turnActive) {
          console.log(`[${callId}] === TURN ${turnCount} INTERRUPTED ===\n`);
        }
        // Mark turn start
        turnCount++;
        turnActive = true;
        console.log(`\n[${callId}] === START TURN ${turnCount} ===`);
      } else if (message.type === 'response.done') {
        // Mark turn end
        turnActive = false;
        console.log(`[${callId}] === END TURN ${turnCount} ===\n`);
      } else if (message.type === 'response.cancelled') {
        // Turn was explicitly cancelled
        turnActive = false;
        console.log(`[${callId}] === TURN ${turnCount} CANCELLED ===\n`);
      } else if (message.type === 'response.output_audio_transcript.delta') {
        // Log bot's speech transcript
        console.log(`[${callId}] Bot: "${message.delta}"`);
      } else if (message.type === 'session.updated') {
        // Session is now configured with correct audio format - safe to send audio
        sessionReady = true;
        console.log(`[INBOUND][${callId}] XAI session.updated — pipeline ready (sending buffered audio if any)`);

        if (pendingAudioChunks.length > 0) {
          for (const audio of pendingAudioChunks) {
            xaiWs.send(JSON.stringify({ type: "input_audio_buffer.append", audio }));
          }
          pendingAudioChunks.length = 0;
        }

        if (!hasSentInitialPrompt) {
          hasSentInitialPrompt = true;
          // Now that session is configured, send initial greeting
          const conversationItem = {
            type: "conversation.item.create",
            item: {
              type: "message",
              role: "user",
              content: [
                {
                  type: "input_text",
                  text: "Say hello, introduce yourself as Dark Alpha Capital's deal intake agent, and ask for the caller's role and company.",
                },
              ],
            },
          };
          logEvent(callId, conversationItem.type);
          xaiWs.send(JSON.stringify(conversationItem));

          const responseCreate = { type: "response.create" };
          logEvent(callId, responseCreate.type);
          xaiWs.send(JSON.stringify(responseCreate));
        }
      } else if (message.type === 'conversation.created') {
        console.log(`  conversation_id: ${message.conversation?.id || 'unknown'}`);
        console.log(`[INBOUND][${callId}] XAI conversation created — sending session.update to model`);

        // Send session configuration
        const sessionConfig = {
          type: 'session.update',
          session: {
            instructions: bot.instructions,
            voice: "Eve",
            audio: {
              input: { format: { type: 'audio/pcmu' } },
              output: { format: { type: 'audio/pcmu' } },
            },
            turn_detection: { type: 'server_vad' },
            input_audio_transcription: { model: "grok-2-audio" },
            ...(ENABLE_TOOLS ? { tools: bot.tools } : {}),
          }
        };
        logEvent(callId, sessionConfig.type);
        xaiWs.send(JSON.stringify(sessionConfig));

      } else if (message.type === 'input_audio_buffer.speech_started') {
        // Clear Twilio's audio buffer (interrupt bot if speaking)
        const clearEvent = { event: "clear" as const, streamSid: tw.streamSid! };
        tw.send(clearEvent);
        if (xaiWs.readyState === 1) {
          xaiWs.send(JSON.stringify({ type: "response.cancel" }));
        }

      } else if (message.type === 'error') {
        logXaiProtocolError("inbound", callId, message as Record<string, unknown>);
      } else if (message.type === 'conversation.item.added') {
        // Silently handle - conversation item added (same as created)
      } else if (message.type === 'response.output_item.added') {
        // Silently handle - output item added to response
      } else if (message.type === 'response.output_item.done') {
        // Check if this is a function call
        if (message.item?.type === 'function_call') {
          let args: Record<string, any> = {};
          try {
            args = JSON.parse(message.item.arguments || "{}");
          } catch (e) {
            args = {};
          }
          processToolCall(message.item.name, message.item.call_id, args);
        }
      } else if (message.type === "response.function_call_arguments.done") {
        let args: Record<string, any> = {};
        try {
          args = JSON.parse(message.arguments || "{}");
        } catch (e) {
          args = {};
        }
        processToolCall(message.name, message.call_id, args);
      } else if (message.type === 'conversation.item.input_audio_transcription.completed') {
        // Log user speech transcription
        if (message.transcript) {
          console.log(`[${callId}] User: "${message.transcript}"`);
        }
      }
      // All other events are just logged by their type (already done above)
    } catch (error) {
      console.error(`[${callId}] Error processing message from x.ai:`, error);
    }
  });

  // Send human speech to x.ai
  tw.on("media", (msg) => {
    try {
      if (msg.media.track === 'inbound') {
        const mulawBase64 = msg.media.payload;

        // DO NOT send audio until session is configured with correct format
        if (!sessionReady) {
          pendingAudioChunks.push(mulawBase64);
          if (pendingAudioChunks.length > MAX_BUFFERED_AUDIO_CHUNKS) {
            pendingAudioChunks.shift();
          }
          return;
        }

        // Send μ-law audio directly to XAI
        const audioMessage = {
          type: "input_audio_buffer.append",
          audio: mulawBase64
        };

        // Check WebSocket state before sending
        if (xaiWs.readyState !== 1) {
          return;
        }

        xaiWs.send(JSON.stringify(audioMessage));
      }
    } catch (error) {
      console.error(`[${callId}] Error processing audio from Twilio:`, error);
    }
  });

  // Handle x.ai WebSocket errors
  xaiWs.on('error', (error: any) => {
    console.error(`[XAI][inbound][${callId}] WebSocket error:`, error?.message || error);
    logEvent(callId, 'websocket.error', error?.message || String(error));
  });

  xaiWs.on('close', (code: number, reason: Buffer) => {
    logEvent(callId, 'websocket.close', `code=${code}`);
  });

  // Handle Twilio WebSocket close
  ws.on("close", () => {
    logEvent(callId, 'twilio.close');
    xaiWs.close();
  });
});

/****************************************************
 Outbound Call Endpoints
****************************************************/

// Outbound agent instructions - this agent makes calls to end users
const OUTBOUND_AGENT_INSTRUCTIONS = `You are an outbound voice agent powered by the Grok Voice Agent API from xAI. You are calling a user to tell them about this exciting new technology.

IMPORTANT: You are making an OUTBOUND call, so YOU must speak first to initiate the conversation.

Start by greeting the user warmly and introducing yourself. Then explain:
- You're calling to share information about the Grok Voice Agent API
- This is a real-time voice AI API that enables natural conversations
- It supports telephony integration with Twilio, WebRTC for browsers, and WebSocket connections
- The API features ultra-low latency, natural turn-taking, and high-quality voice synthesis
- Developers can build voice assistants, customer service agents, and interactive voice applications

Be enthusiastic but not pushy. Answer any questions they have about the technology. Keep responses concise since this is a phone call.

If they're not interested, politely thank them for their time and end the call gracefully.`;

// TwiML endpoint for outbound calls
app.post("/outbound-twiml", (req, res) => {
  const hostname = process.env.HOSTNAME?.replace(/^https?:\/\//, "") || "";

  const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Connect>
    <Stream url="wss://${hostname}/outbound-stream" />
  </Connect>
</Response>`;

  res.type("text/xml");
  res.send(twiml);
});

// WebSocket endpoint for outbound call audio
app.ws("/outbound-stream", (ws: any, req: any) => {
  const WebSocket = require('ws');
  const MAX_TURNS = 3;
  let callSid = "";
  let streamSid = "";
  let xaiWs: any = null;
  let sessionReady = false;
  let turnCount = 0;
  let turnActive = false;

  console.log(`\n[OUTBOUND] === OUTBOUND CALL STARTED ===`);

  // Handle Twilio WebSocket messages
  ws.on("message", async (data: Buffer) => {
    try {
      const msg = JSON.parse(data.toString());

      if (msg.event === "start") {
        callSid = msg.start.callSid;
        streamSid = msg.start.streamSid;
        console.log(`[OUTBOUND] [${callSid}] twilio.start`);

        // Connect to XAI
        xaiWs = new WebSocket(API_URL, {
          headers: {
            Authorization: `Bearer ${XAI_API_KEY}`,
          },
        });

        xaiWs.on("error", (err: unknown) => {
          console.error(`[XAI][outbound][${callSid}] WebSocket error:`, err);
        });

        xaiWs.on("open", () => {
          console.log(`[OUTBOUND] [${callSid}] XAI WebSocket connected`);

          // Send session configuration
          const sessionConfig = {
            type: "session.update",
            session: {
              instructions: OUTBOUND_AGENT_INSTRUCTIONS,
              voice: "rex",
              audio: {
                input: { format: { type: "audio/pcmu" } },
                output: { format: { type: "audio/pcmu" } },
              },
              turn_detection: { type: "server_vad" },
            },
          };
          console.log(`[OUTBOUND] [${callSid}] session.update`);
          xaiWs.send(JSON.stringify(sessionConfig));
        });

        xaiWs.on("message", (xaiData: Buffer) => {
          try {
            const message = JSON.parse(xaiData.toString());

            // Log event type (skip audio chunks)
            if (message.type !== "response.output_audio.delta") {
              console.log(`[OUTBOUND] [${callSid}] ${message.type}`);
            }

            if (message.type === "session.updated") {
              sessionReady = true;
              console.log(`[OUTBOUND] [${callSid}] XAI session.updated — pipeline ready`);

              // Trigger the agent to speak first (outbound call)
              const responseCreate = { type: "response.create" };
              xaiWs.send(JSON.stringify(responseCreate));
              console.log(`[OUTBOUND] [${callSid}] Agent speaking first...`);
            } else if (message.type === "response.created") {
              if (turnActive) {
                console.log(`[OUTBOUND] [${callSid}] === TURN ${turnCount} INTERRUPTED ===\n`);
              }
              turnCount++;
              turnActive = true;
              console.log(`\n[OUTBOUND] [${callSid}] === START TURN ${turnCount} ===`);
            } else if (message.type === "response.output_audio.delta" && message.delta) {
              // Send bot audio to Twilio
              const twilioMessage = {
                event: "media",
                streamSid,
                media: { payload: message.delta },
              };
              ws.send(JSON.stringify(twilioMessage));
            } else if (message.type === "response.output_audio_transcript.delta") {
              if (message.delta) {
                console.log(`[OUTBOUND] [${callSid}] Caller: "${message.delta}"`);
              }
            } else if (message.type === "conversation.item.input_audio_transcription.completed") {
              if (message.transcript) {
                console.log(`[OUTBOUND] [${callSid}] Remote: "${message.transcript}"`);
              }
            } else if (message.type === "response.done") {
              turnActive = false;
              console.log(`[OUTBOUND] [${callSid}] === END TURN ${turnCount} ===\n`);

              // End call after MAX_TURNS
              if (turnCount >= MAX_TURNS) {
                console.log(`[OUTBOUND] [${callSid}] Max turns reached, ending in 10s...`);
                setTimeout(() => {
                  console.log(`[OUTBOUND] [${callSid}] Ending call now`);
                  if (xaiWs) xaiWs.close();
                  ws.close();
                }, 10000);
              }
            } else if (message.type === "error") {
              logXaiProtocolError("outbound", callSid || "?", message as Record<string, unknown>);
            }
          } catch (e) {
            // Ignore parse errors
          }
        });

        xaiWs.on("close", () => {
          console.log(`[OUTBOUND] [${callSid}] websocket.close`);
        });

      } else if (msg.event === "media" && msg.media?.track === "inbound") {
        // Forward audio from the remote party to XAI
        if (xaiWs && sessionReady && xaiWs.readyState === WebSocket.OPEN) {
          const audioMessage = {
            type: "input_audio_buffer.append",
            audio: msg.media.payload,
          };
          xaiWs.send(JSON.stringify(audioMessage));
        }
      } else if (msg.event === "stop") {
        console.log(`[OUTBOUND] [${callSid}] twilio.stop`);
        if (xaiWs) xaiWs.close();
      }
    } catch (e) {
      // Ignore errors
    }
  });

  ws.on("close", () => {
    console.log(`[OUTBOUND] twilio.close`);
    if (xaiWs) xaiWs.close();
  });
});

/****************************************************
 Start Server
****************************************************/
const port = process.env.PORT || "3000";
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
  console.log(`Tool calling: ${ENABLE_TOOLS ? "ENABLED" : "DISABLED"}`);
});
