# 📄 RAG File Q&A System – Architecture & Workflow

## Overview

This project implements a **Retrieval-Augmented Generation (RAG)** system where:

1. Users upload a file (PDF, DOCX, TXT, etc.)
2. The file is stored in object storage (Supabase / S3)
3. Text is extracted, chunked, embedded, and stored
4. Users can ask questions about the uploaded file
5. Answers are generated using retrieved chunks + LLM

The system is designed with **clear separation of concerns** between:

* File storage
* Extraction & embedding
* Chat / query handling
* Frontend navigation

---

## High-Level Workflow

```
User
 ↓
Upload File (Frontend)
 ↓
POST /upload
 ↓
Store file in Supabase/S3
 ↓
POST /extract
 ↓
Text Extraction + Chunking + Embeddings
 ↓
Store extraction result (id)
 ↓
Navigate to Chat Page
 ↓
User asks questions
 ↓
RAG retrieval + LLM response
```

---

## Core Concepts

### Key Identifiers

| Identifier                | Purpose                             |
| ------------------------- | ----------------------------------- |
| `file_id`                 | Identifies the uploaded raw file    |
| `extraction_id` (or `id`) | Identifies extracted + chunked data |
| `session_id` (optional)   | Identifies a chat session           |

> **Important:**
> The `extraction_id` is the primary ID used by the chat system.

---

## Backend API Design

### 1️⃣ Extract API

#### Endpoint

```http
POST /extract
```

#### Request Body

```json
{
  "file_id": "uuid",
  "publicUrl": "https://storage.url/file.pdf",
  "fileType": "application/pdf"
}
```

#### Backend Logic

* Fetch file from storage
* Extract raw text
* Split text into chunks
* Generate embeddings
* Store metadata + chunks in DB
* Return the extraction record

#### Implementation

```ts
app.post("/extract", async (req, res) => {
  try {
    const { file_id, publicUrl, fileType } = req.body;

    if (!file_id || !publicUrl || !fileType) {
      return res.status(400).json({
        error: "file_id, publicUrl, and fileType are required",
      });
    }

    const result = await extractAndStore(file_id, publicUrl, fileType);

    return res.status(201).json({
      success: true,
      data: result,
    });

  } catch (err: any) {
    return res.status(500).json({
      error: err.message || "Failed to extract text from file",
    });
  }
});
```

---

### 2️⃣ Extract API Response

```json
{
  "success": true,
  "data": {
    "id": "cce79fce-ba4d-42c4-ba05-de812dc54eca",
    "file_id": "2b059c2f-3261-4519-bdf8-f52a2a1c270d",
    "totalChunks": 2,
    "totalCharacters": 1383,
    "metadata": {
      "totalChunks": 2,
      "totalCharacters": 1383,
      "fileType": "application/pdf",
      "extractedAt": "2025-12-19T05:31:31.968Z"
    }
  }
}
```

### Why `id` is inside `data`

* Keeps API responses consistent
* Avoids duplicated fields
* Scales better as response grows

---

## Frontend Workflow

### File Upload → Extraction → Navigation

```ts
const response = await fetch("/extract", {
  method: "POST",
  body: JSON.stringify(payload),
});

const json = await response.json();

// ✅ Correct access
const extractionId = json.data.id;

// Navigate to chat
router.push(`/chat/${extractionId}`);
```

---

## TypeScript Issue Explained

### ❌ Error

```ts
Property 'id' does not exist on type '{ success: boolean; data: {...} }'
```

### ❌ Cause

You tried to access:

```ts
response.id
```

But the API returns:

```ts
response.data.id
```

### ✅ Correct Fix

```ts
response.data.id
```

---

## Recommended Frontend Type

```ts
type ExtractResponse = {
  success: boolean;
  data: {
    id: string;
    file_id: string;
    totalChunks: number;
    totalCharacters: number;
    metadata: {
      totalChunks: number;
      totalCharacters: number;
      fileType: string;
      extractedAt: string;
    };
  };
};
```

Usage:

```ts
const response: ExtractResponse = await res.json();
router.push(`/chat/${response.data.id}`);
```

---

## Chat Page Architecture

### URL

```
/chat/[extractionId]
```

### Chat Page Responsibilities

* Read `extractionId` from route params
* Maintain chat messages
* Send user queries to `/chat/query`
* Display streaming or static answers

---

## Query Flow (RAG)

```
User Question
 ↓
POST /chat/query
 ↓
Fetch chunks using extractionId
 ↓
Vector similarity search
 ↓
Top-K relevant chunks
 ↓
Prompt = Context + Question
 ↓
LLM generates answer
 ↓
Return response
```

---

## RAG Query API (Example)

```http
POST /chat/query
```

```json
{
  "extraction_id": "cce79fce-ba4d-42c4-ba05-de812dc54eca",
  "question": "What is the eligibility criteria?"
}
```

---

## Text-Based Architecture Diagram

```
┌───────────────┐
│   Frontend    │
│ (Next.js)     │
└───────┬───────┘
        │ Upload
        ▼
┌───────────────┐
│  File Store   │
│ Supabase / S3 │
└───────┬───────┘
        │ publicUrl
        ▼
┌───────────────┐
│ /extract API  │
│ Text Extract  │
│ Chunk + Embed │
└───────┬───────┘
        │ extraction_id
        ▼
┌───────────────┐
│   Chat Page   │
│ /chat/:id     │
└───────┬───────┘
        │ question
        ▼
┌───────────────┐
│  RAG Engine   │
│ Vector Search │
│ LLM Response  │
└───────────────┘
```

---

## Best Practices Followed

* ✅ Strong typing with TypeScript
* ✅ Clear API contracts
* ✅ Single source of truth (`data.id`)
* ✅ Scalable RAG design
* ✅ Clean navigation using route params

---

## Next Logical Enhancements

* Chat sessions per file
* Streaming LLM responses
* Multi-file RAG support
* Citation highlighting per chunk
* Access control per user

---

## Conclusion

This design ensures:

* Clean frontend–backend integration
* Predictable navigation
* Scalable RAG workflows
* Minimal TypeScript friction
