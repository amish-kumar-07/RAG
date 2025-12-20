import { Router } from "express";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { getContext } from "./getFileInfomation.js";
import { last10Conversation , conversationsToString } from "./lastConversation.js";
import { conversations } from "../db/schema.js";

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

    if (!context) {
      return res.status(404).json({ error: "No context found" });
    }

    const last10Conv = await last10Conversation(session_id);
    const conversationHistory = conversationsToString(last10Conv);

    const finalPrompt = buildFinalPrompt({
      prompt,
      conversationHistory,
      contextText: context,
    });

    const llmanswer = await generateText(finalPrompt);

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

export default conversation;