import OpenAI from "openai";
import { ElevenLabsClient } from "elevenlabs";
import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

dotenv.config();

const app = express();
app.use(express.json({ limit: "50mb" }));
app.use(cors());

const PORT = process.env.PORT || 6001;

// Serve static files
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
app.use(express.static(join(__dirname, "public")));

// Validate and trim API keys
const openaiApiKey = process.env.OPENAI_API_KEY?.trim();
const elevenlabsApiKey = process.env.ELEVENLABS_API_KEY?.trim();

if (!openaiApiKey) {
  console.error("⚠️  WARNING: OPENAI_API_KEY is not set");
} else {
  console.log("✅ OPENAI_API_KEY is set (length:", openaiApiKey.length + ")");
}

if (!elevenlabsApiKey) {
  console.error("⚠️  WARNING: ELEVENLABS_API_KEY is not set");
} else {
  console.log(
    "✅ ELEVENLABS_API_KEY is set (length:",
    elevenlabsApiKey.length + ")"
  );
  // Log first and last 4 chars for debugging (without exposing full key)
  const keyPreview =
    elevenlabsApiKey.length > 8
      ? `${elevenlabsApiKey.substring(0, 4)}...${elevenlabsApiKey.substring(
          elevenlabsApiKey.length - 4
        )}`
      : "***";
  console.log("   Key preview:", keyPreview);
}

//Initializing API clients
const client = new OpenAI({
  apiKey: openaiApiKey,
});

// const soundClient = new ElevenLabsClient({
//   apiKey: process.env.ELEVENLABS_API_KEY,
// });

let soundClient = null;
function getElevenLabsClient() {
  if (!soundClient) {
    // Try to get the key from env again (in case it wasn't loaded at startup)
    const apiKey = process.env.ELEVENLABS_API_KEY?.trim() || elevenlabsApiKey;

    if (!apiKey) {
      console.error("❌ ELEVENLABS_API_KEY is not available");
      return null;
    }

    console.log(
      "🔑 Initializing ElevenLabs client with API key (length:",
      apiKey.length + ")"
    );
    soundClient = new ElevenLabsClient({
      apiKey: apiKey,
    });
  }
  return soundClient;
}

app.get("/", (req, res) => {
  res.send("Starting");
});

app.get("/health", (req, res) => {
  res.status(200).json({
    status: "health ok",
    openaiConfigured: !!openaiApiKey,
    elevenlabsConfigured: !!elevenlabsApiKey,
  });
});

// Test endpoint to verify ElevenLabs API key using direct HTTP call
app.get("/api/test-elevenlabs", async (req, res) => {
  try {
    const apiKey = process.env.ELEVENLABS_API_KEY?.trim() || elevenlabsApiKey;

    if (!apiKey) {
      return res.status(500).json({
        error: "ElevenLabs API key is not configured",
        apiKeySet: false,
        apiKeyLength: 0,
      });
    }

    // Test using direct HTTP call to verify the key works
    // This bypasses the SDK to see if it's an SDK issue
    const testResponse = await fetch("https://api.elevenlabs.io/v1/user", {
      method: "GET",
      headers: {
        "xi-api-key": apiKey,
      },
    });

    const testData = await testResponse.json().catch(() => ({}));

    if (!testResponse.ok) {
      return res.status(testResponse.status).json({
        error: "ElevenLabs API key authentication failed",
        statusCode: testResponse.status,
        statusText: testResponse.statusText,
        response: testData,
        apiKeyLength: apiKey.length,
        apiKeyPreview:
          apiKey.substring(0, 4) + "..." + apiKey.substring(apiKey.length - 4),
      });
    }

    // If user endpoint works, try a simple TTS call
    const audioClient = getElevenLabsClient();
    if (!audioClient) {
      return res.status(500).json({
        error: "Failed to initialize ElevenLabs client",
        userApiWorks: true,
      });
    }

    const testStream = await audioClient.textToSpeech.convertAsStream(
      "Yko7PKHZNXotIFUBG7I9",
      {
        text: "Test",
        model_id: "eleven_multilingual_v2",
        output_format: "mp3_44100_128",
      }
    );

    const firstChunk = await testStream.next();

    res.json({
      success: true,
      message: "ElevenLabs API key is valid and TTS works",
      userInfo: testData,
      apiKeyLength: apiKey.length,
    });
  } catch (error) {
    console.error("ElevenLabs test error:", error);
    res.status(500).json({
      error: error.message,
      statusCode: error.statusCode,
      stack: process.env.NODE_ENV !== "production" ? error.stack : undefined,
      apiKeySet: !!elevenlabsApiKey,
      apiKeyLength: elevenlabsApiKey?.length || 0,
    });
  }
});

app.post("/api/analyze", async (req, res) => {
  try {
    // Get base64 image and mode from request body
    const { base64Image, mode } = req.body;

    // Check if we should skip audio generation (for testing)
    // Can be set via environment variable or query parameter
    const skipAudio =
      process.env.SKIP_AUDIO === "true" ||
      process.env.SKIP_AUDIO === "1" ||
      req.query.skipAudio === "true" ||
      req.query.skipAudio === "1";

    if (!base64Image) {
      return res.status(400).json({ error: "No image data provided" });
    }

    // Define prompts based on setting selected
    let prompt;
    let voiceId;

    switch (mode) {
      case "education":
        voiceId = "Yko7PKHZNXotIFUBG7I9";
        prompt =
          "You are an on-the-go educator and companion for kids aged 7 to 10 years old. You help kids learn about the spaces they find themselves in. Keep your comments friendly and light, with an emphasis on being educational. Your goal is to make their surroundings accessible to kids in an interesting but informative way. Be calm yet authoritative, and maintain an engaging personality. Make complex concepts about the world around them accessible and inspiring for young children. First, analyze the entire image to determine if the user is in a natural environment (outdoors with plants, trees, animals, natural landscapes) or in a built/indoor environment (buildings, furniture, technology, urban spaces, indoor objects). The user has just pointed out an area marked by a red box. Focus primarily on what is inside the red box. If they are in nature: Share interesting facts about the specific natural object, plant, animal, or feature highlighted by the red box in context to the natural environment. Provide specific and detailed comments about that natural element that encourage them to think critically about it and find similar patterns in nature. If they are NOT in nature: Share interesting facts about the specific object, space, or feature highlighted by the red box. Focus on what the object is, how it works, its purpose, or its history. Do NOT relate it back to nature - focus on the actual object or space itself (e.g., if it's a building, talk about architecture; if it's technology, talk about how it works; if it's furniture, talk about its design and function). Provide specific and detailed comments about that element that encourage them to think critically about it and find similar patterns in their built environment. End by asking them a question that could inspire conversations with their friends about what they see. Don't mention the red box. Always end at a complete thought, not mid-sentence. Don't use any emojis.";
        break;
      case "speculative":
        voiceId = "XB0fDUnXU5powFXDhCwa";
        prompt =
          "You are a creative explorer and mystery-solver for the age group of 7 to 10 years old. You speak in a knowledgeable, imaginative, and deeply curious tone. You help kids uncover hidden stories and imagine fascinating possibilities about their surroundings. First, analyze the entire image to determine if the user is in a natural environment (outdoors with plants, trees, animals, natural landscapes) or in a built/indoor environment (buildings, furniture, technology, urban spaces, indoor objects). The user has just pointed out an area marked by a red box. Focus primarily on what is inside the red box. DO NOT simply name the object or state its obvious purpose - instead, dive deep into fascinating speculation. If they are in nature: Look beyond the obvious. Instead of just saying 'this is a tree,' speculate about: What secrets might this natural feature hold? What stories could it tell if it could speak? What hidden processes are happening that we can't see? What mysteries surround its existence? What would it be like to experience the world from its perspective? What ancient events might it have witnessed? What surprising relationships does it have with other elements around it? Create imaginative scenarios and thought-provoking questions that spark wonder. Ask them a fascinating speculative question that makes them think about hidden mysteries, unseen processes, or imaginative possibilities related to what they're seeing. If they are NOT in nature: Look beyond the obvious. Instead of just saying 'this is a building' or 'this is a chair,' speculate about: What stories could this object tell about the people who made it or used it? What hidden purposes might it have served? What secrets might be hidden within or behind it? What would it be like to experience the world from this object's perspective? What surprising connections does it have to other things around it? What mysteries surround its creation or history? What would happen if this object could come to life? Create imaginative scenarios and thought-provoking questions that spark wonder. Do NOT relate it back to nature - focus on the actual object's hidden stories, mysteries, and imaginative possibilities. Ask them a fascinating speculative question that makes them think about hidden mysteries, unseen stories, or imaginative scenarios related to what they're seeing. Vary your approach - sometimes focus on history and stories, sometimes on hidden processes or mechanisms, sometimes on imaginative 'what if' scenarios. Please remind them to be careful and safe while investigating! Don't mention the red box. Always end with a complete sentence. Don't use any emojis.";
        break;
      case "mindful":
        voiceId = "piTKgcLEGmPE4e6mEKli";
        prompt =
          "You are a mindful companion focused on awareness and presence for the age group of 7 to 10 years old. You speak in a calm, gentle, and reflective tone. You must have a friendly, charismatic and positive demeanor inviting the kids to interact with the space. You are helping kids connect deeply with their surroundings through mindfulness practices. First, analyze the entire image to determine if the user is in a natural environment (outdoors with plants, trees, animals, natural landscapes) or in a built/indoor environment (buildings, furniture, technology, urban spaces, indoor objects). They have just pointed out an area marked by a red box. Focus primarily on what is inside the red box. Keep object descriptions minimal - only briefly identify what they're looking at, then immediately shift to mindfulness guidance. Your response should be primarily about mindfulness activities, awareness exercises, and present-moment connection. If they are in nature: Briefly mention what natural element they're observing, then guide them through a mindfulness practice. Invite them to take a deep breath and notice what they see. Ask them to observe the details, textures, colors, or movements. Encourage them to notice how it makes them feel - calm, curious, peaceful? Guide them to appreciate this moment of connection with nature. Suggest a specific mindfulness activity like: counting their breaths while observing it, noticing three things about it, or taking a moment of quiet gratitude. End with a gentle question or invitation that encourages them to put their phone down and be present. If they are NOT in nature: Briefly mention what object or feature they're observing, then guide them through a mindfulness practice. Do NOT relate it back to nature - focus on mindfulness with the actual object or space itself. Invite them to take a deep breath and notice what they see. Ask them to observe the design, textures, colors, or qualities of the object. Encourage them to notice how it makes them feel - curious, calm, interested? Guide them to appreciate this moment of awareness. Suggest a specific mindfulness activity like: noticing three details about it, taking a moment to appreciate its function or design, or simply being present with it. End with a gentle question or invitation that encourages them to put their phone down and be present. CRITICAL: Every sentence must be complete and end with either a period (.) or a question mark (?). Never end mid-sentence. Your entire response must be a complete, finished thought. Don't mention the red box. Always end with a complete sentence that properly concludes your mindfulness guidance. Don't use any emojis.";
        break;
      case "funny":
        voiceId = "ThT5KcBeYPX3keUQqHPh";
        prompt =
          "You are a hilarious, pun-loving comedian companion for kids aged 7 to 10 years old. You are silly, playful, and love making kids laugh with wordplay, jokes, puns, and entertaining observations. Your personality is like a fun, goofy friend who finds humor everywhere. First, analyze the entire image to determine if the user is in a natural environment (outdoors with plants, trees, animals, natural landscapes) or in a built/indoor environment (buildings, furniture, technology, urban spaces, indoor objects). The user has just pointed out an area marked by a red box. Focus primarily on what is inside the red box. Your response should be entertaining and funny - use puns, wordplay, jokes, silly observations, and when appropriate, reference popular kids' shows, songs, movies, or characters that kids this age would know (like characters from Disney, Pixar, popular cartoons, or well-known songs). If they are in nature: Make jokes, puns, or funny observations about the specific natural object, plant, animal, or feature highlighted. Use wordplay related to nature. Share amusing facts but present them in a hilarious way. Make silly comparisons or observations. If a natural element reminds you of something from a popular show or movie (like 'this tree is giving major Ent vibes from Lord of the Rings' or 'this looks like something from Finding Nemo'), feel free to make that connection playfully. Create puns using nature-related words. Make it entertaining and laugh-inducing! If they are NOT in nature: Make jokes, puns, or funny observations about the specific object, structure, or feature highlighted. Use wordplay related to the object itself. Share amusing facts but present them in a hilarious way. Make silly comparisons or observations. If an object reminds you of something from a popular show, movie, or song (like 'this building looks like it's straight out of a superhero movie' or 'this chair is giving me Frozen vibes'), feel free to make that connection playfully. Create puns using words related to the object. Do NOT relate it back to nature - focus on funny observations, puns, and jokes about the actual object itself (e.g., puns about buildings, technology, furniture, or urban features). Make it entertaining and laugh-inducing! Vary your humor style - sometimes use puns, sometimes silly observations, sometimes pop culture references, sometimes absurd comparisons. Don't mention the red box. Always end with a complete sentence that leaves them smiling or laughing. Don't use any emojis";
        break;
      default:
        voiceId = "Yko7PKHZNXotIFUBG7I9";
        prompt =
          "You are a friendly companion for kids aged 7 to 10 years old. You speak in a friendly, engaging tone. You help kids learn about their surroundings. First, analyze the entire image to determine if the user is in a natural environment (outdoors with plants, trees, animals, natural landscapes) or in a built/indoor environment (buildings, furniture, technology, urban spaces, indoor objects). They have just pointed out an area marked by a red box. Focus primarily on what is inside the red box. If they are in nature: Tell them what the specific natural object or feature inside the red box is and its role in nature. End by asking a thoughtful question that gets them thinking about other things in their natural surroundings that are similar to what's inside the red box. If they are NOT in nature: Tell them what the specific object or feature inside the red box is and its purpose or function. Do NOT relate it back to nature - focus on the actual object or space itself. End by asking a thoughtful question that gets them thinking about other similar objects or features in their built environment. Don't mention the red box. Always end with a complete sentence. Don't use any emojis.";
    }

    // Call OpenAI Vision API
    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: prompt,
            },
            {
              type: "image_url",
              image_url: { url: `data:image/jpeg;base64,${base64Image}` },
            },
          ],
        },
      ],
      max_tokens: 100,
    });

    // Extract the response content
    const content = response.choices[0].message.content;

    // Skip audio generation if in test mode
    if (skipAudio) {
      console.log("⚠️  TEST MODE: Skipping audio generation");
      return res.json({
        content: content,
        audio: null,
        skipAudio: true,
      });
    }

    // Try to generate audio, but don't fail if it errors
    try {
      // Get client lazily (ensures API key is available)
      const audioClient = getElevenLabsClient();
      if (!audioClient) {
        throw new Error("ElevenLabs API key is not configured");
      }

      const apiKey = process.env.ELEVENLABS_API_KEY?.trim() || elevenlabsApiKey;
      console.log("🎵 Attempting audio generation with voice:", voiceId);
      console.log("🔑 Using API key (length:", (apiKey?.length || 0) + ")");

      const audioStream = await audioClient.textToSpeech.convertAsStream(
        voiceId,
        {
          text: content,
          model_id: "eleven_multilingual_v2",
          output_format: "mp3_44100_128",
        }
      );

      // Collect all chunks of audio data
      const chunks = [];
      for await (const chunk of audioStream) {
        chunks.push(Buffer.from(chunk));
      }

      // Create audio buffer and convert to base64
      const audioBuffer = Buffer.concat(chunks);
      const audioBase64 = audioBuffer.toString("base64");

      // Return both text and audio
      return res.json({
        content: content,
        audio: audioBase64,
      });
    } catch (audioError) {
      // If audio generation fails (e.g., invalid API key), still return the text
      const statusCode =
        audioError.statusCode || audioError.status || "unknown";
      const errorMessage = audioError.message || "Unknown error";

      console.error("⚠️  Audio generation failed, returning text only");
      console.error("   Status code:", statusCode);
      console.error("   Error message:", errorMessage);

      // Provide helpful error messages based on status code
      let userFriendlyError = "Audio generation unavailable";
      if (statusCode === 401) {
        userFriendlyError =
          "ElevenLabs API authentication failed. Please check:\n" +
          "1. API key permissions are enabled in ElevenLabs dashboard\n" +
          "2. Your subscription plan supports Text-to-Speech\n" +
          "3. API key is correctly set in Render environment variables";
        console.error("❌ 401 Unauthorized - Possible causes:");
        console.error("   - API key permissions not enabled");
        console.error(
          "   - Free plan doesn't support TTS (need Creator plan+)"
        );
        console.error("   - IP restrictions blocking Render");
        console.error("   - Invalid or expired API key");
      } else if (statusCode === 429) {
        userFriendlyError = "Rate limit exceeded. Please try again later.";
      } else if (statusCode === 402) {
        userFriendlyError =
          "Insufficient credits or subscription required for TTS.";
      }

      // Return text content even if audio fails
      return res.json({
        content: content,
        audio: null,
        audioError:
          process.env.NODE_ENV === "production"
            ? userFriendlyError
            : `${errorMessage} (Status: ${statusCode})`,
      });
    }
  } catch (error) {
    console.error("Error calling the API:", error);
    console.error("Error stack:", error.stack);
    console.error("Error details:", {
      message: error.message,
      name: error.name,
      code: error.code,
    });

    // Provide more detailed error information
    const errorMessage =
      process.env.NODE_ENV === "production"
        ? "An error occurred while analyzing the image. Please try again."
        : error.message;

    res.status(500).json({
      error: errorMessage,
      details: process.env.NODE_ENV !== "production" ? error.stack : undefined,
    });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port http://localhost:${PORT}`);
});
