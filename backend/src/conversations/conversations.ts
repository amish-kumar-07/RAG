import { Router } from "express";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { getContext } from "./getFileInfomation.js";
import { last10Conversation , conversationsToString } from "./lastConversation.js";
import { saveConversation , getConversations } from "./saveConversation.js";
import { getSessionInfo } from "./getSession.js";
import { db } from "../db/index.js";
import { ragSessions } from "../db/schema.js";
import { eq , desc } from "drizzle-orm";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
const conversation = Router();

export async function generateText(prompt: string) {
  const model = genAI.getGenerativeModel({  model: "gemini-2.5-flash" });

  const result = await model.generateContent(prompt);
  return result.response.text();
}


type PromptInput = {
  prompt: string;
  conversationHistory: string;
  contextText: string;
};

export function buildFinalPrompt({
  prompt,
  conversationHistory,
  contextText,
}: PromptInput): string {
  return `
You are a precise and helpful AI assistant.

RULES:
- Answer ONLY using the provided document context and conversation history.
- If the answer is not present in the context, say:
  "The document does not contain enough information to answer this."
- Do NOT hallucinate.
- Be concise and technically accurate.

--------------------
DOCUMENT CONTEXT:
${contextText || "N/A"}
--------------------

CONVERSATION HISTORY:
${conversationHistory || "N/A"}
--------------------

USER QUESTION:
${prompt}

ANSWER:
`;
}

conversation.post("/generate", async (req, res) => {
  try {
    const { prompt, session_id, fileInformation_id } = req.body;

    if (!prompt || !session_id || !fileInformation_id) {
      return res.status(400).json({
        error: "prompt, session_id, and fileInformation_id are required",
      });
    }

    const context = await getContext(fileInformation_id);
    console.log("Context : ",context?.full_content);

    if (!context) {
      return res.status(404).json({ error: "No context found" });
    }

    const last10Conv = await last10Conversation(session_id);
    const conversationHistory = conversationsToString(last10Conv);
    console.log("Last 10 conversation : ",last10Conv);

    const finalPrompt = buildFinalPrompt({
      prompt,
      conversationHistory,
      contextText: context?.full_content,
    });

    console.log("Final Prompt : ",finalPrompt);

    const llmanswer = await generateText(finalPrompt);
    console.log("LLM Response : ",llmanswer);

    const userDataSave = await saveConversation(session_id,"user",prompt);
    console.log("User Response : ",userDataSave);

    if(!userDataSave)
    {
      return res.status(401).json({message : "Error in storing data in db"}); 
    }

    const llmresponseSave = await saveConversation(session_id,"assistant",llmanswer);
    console.log("LLM Response : ",llmresponseSave);
    if(!llmresponseSave)
    {
      return res.status(401).json({message : "Error in storing data in db"}); 
    }
   
    return res.status(201).json({
      message: "Final Output",
      llmanswer,
    });
  } catch (err) {
    console.log(err);
    return res
      .status(500)
      .json({ error: "Server side error while generation" });
  }
});

conversation.get("/message", async (req, res) => {
  try {
    const { session_id } = req.query;

    // Validate session_id
    if (!session_id || typeof session_id !== "string") {
      return res.status(400).json({ 
        error: "session_id is required as a query parameter" 
      });
    }

    // Get all conversations for this session
    const messages = await getConversations(session_id);

    // Check if any messages exist
    if (!messages || messages.length === 0) {
      return res.status(200).json({ 
        message: "No conversations found for this session",
        data: [] 
      });
    }

    // Return the messages
    return res.status(200).json({
      message: "Conversations retrieved successfully",
      count: messages.length,
      data: messages
    });

  } catch (err) {
    console.error("Error fetching messages:", err);
    return res.status(500).json({ error: "Server side error!!" });
  }
});

conversation.post("/chat", async (req, res) => {
  try {
    const { prompt, session_id } = req.body;
    
    const data = await getSessionInfo(session_id);
    const fileInformation_id = data?.fileInformation;
    
    if (!prompt || !session_id || !fileInformation_id) {
      return res.status(400).json({
        error: "prompt, session_id, and fileInformation_id are required",
      });
    }
    
    const context = await getContext(fileInformation_id);

    if (!context) {
      return res.status(404).json({ error: "No context found" });
    }

    const last10Conv = await last10Conversation(session_id);
    const conversationHistory = conversationsToString(last10Conv);

    const finalPrompt = buildFinalPrompt({
      prompt,
      conversationHistory,
      contextText: context?.full_content,
    });

    const llmanswer = await generateText(finalPrompt);
    
    // Save user message
    const userDataSave = await saveConversation(session_id, "user", prompt);

    if (!userDataSave) {
      return res.status(500).json({ error: "Error storing user message in database" }); 
    }

    // Save assistant message
    const llmresponseSave = await saveConversation(session_id, "assistant", llmanswer);
    
    if (!llmresponseSave) {
      return res.status(500).json({ error: "Error storing assistant message in database" }); 
    }

    // ✅ FIXED: Return the correct shape matching APIMessage
    return res.status(201).json({
      id: llmresponseSave.id || Date.now().toString(), // Use actual DB ID or timestamp
      role: "assistant",
      content: llmanswer,
      created_at: llmresponseSave.created_at || new Date().toISOString(),
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ 
      error: "Server side error while generation" 
    });
  }
});

conversation.get("/sessions", async (req, res) => {
  try {
    const { clerk_id } = req.query;

    // Validate clerk_id
    if (!clerk_id || typeof clerk_id !== "string") {
      return res.status(400).json({ 
        error: "clerk_id is required as a query parameter" 
      });
    }

    // Get all sessions for this user using Drizzle ORM
    const sessions = await db
      .select({
        id: ragSessions.id,
        title: ragSessions.title,
        created_at: ragSessions.created_at,
      })
      .from(ragSessions)
      .where(eq(ragSessions.clerk_id, clerk_id))
      .orderBy(desc(ragSessions.created_at)); // Most recent first

    // Check if any sessions exist
    if (!sessions || sessions.length === 0) {
      return res.status(200).json({ 
        message: "No sessions found for this user",
        sessions: [] 
      });
    }

    return res.status(200).json({
      message: "Sessions retrieved successfully",
      count: sessions.length,
      sessions: sessions
    });

  } catch (err) {
    console.error("Error fetching sessions:", err);
    return res.status(500).json({ 
      error: "Server side error while fetching sessions" 
    });
  }
});

export default conversation;