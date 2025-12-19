import express from "express";
import cors from "cors";
import multer from "multer";
import router from "./dbroute/User.js";
import { getSupabaseClient } from "./superbase/utility.js";
import { createFileMetaDate } from "./session/fileSession.js";
import { extractAndStore} from "./session/chunksStore.js";

const app = express();
const PORT = 4000;

app.use(express.json());
app.use(cors({ origin: "*" }));

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 }, // 15MB
});
const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
  "application/msword", // .doc
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // .docx
];


app.use("/", router);

app.post("/upload", upload.single("file"), async (req, res) => {
  try {
    const supabase = getSupabaseClient();
    const { clerkId } = req.body;
    const file = req.file;

    if (!clerkId) {
      return res.status(400).json({ error: "clerkId is required" });
    }

    if (!file) {
      return res.status(400).json({ error: "No file provided" });
    }

    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      return res.status(400).json({
        error: "Only PDF, image, and Word documents are allowed",
      });
    }

    const filePath = `${clerkId}/${Date.now()}-${file.originalname}`;

    // ✅ Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from("fileStore")
      .upload(filePath, file.buffer, {
        contentType: file.mimetype,
        upsert: false,
      });

    if (uploadError) {
      console.error(uploadError);
      return res.status(500).json({ error: "Upload failed" });
    }

    // ✅ Get public URL
    const { data } = supabase.storage.from("fileStore").getPublicUrl(filePath);

    // ✅ Correct metadata extraction
    const fileSize = file.size.toString(); // bytes
    const fileType = file.mimetype;
    const originalName = file.originalname;

    // ✅ Correct argument order
    const savedFileId = await createFileMetaDate(
      clerkId,
      originalName,
      fileType,
      fileSize,
      data.publicUrl
    );

    res.json({
      message: "Uploaded successfully",
      fileId: savedFileId,
      publicUrl: data.publicUrl,
      path: filePath,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// Main extraction route
app.post("/extract", async (req, res) => {
  try {
    const { file_id, publicUrl, fileType } = req.body;

    if (!file_id || !publicUrl || !fileType) {
      return res.status(400).json({ 
        error: "file_id, publicUrl, and fileType are required" 
      });
    }

    console.log("📄 Starting extraction for file:", file_id); // ✅ Debug log

    const result = await extractAndStore(file_id, publicUrl, fileType);

    console.log("✅ Extraction successful:", result); // ✅ Debug log

    return res.status(201).json({
      message: "Text extracted and stored successfully",
      id: result.data.id,          // ✅ exposed explicitly 
      success: true,
      data: result, 
    });

  } catch (err: any) {
    console.error("❌ Extraction route error:", err); // ✅ Debug log
    return res.status(500).json({ 
      error: err.message || "Failed to extract text from file" 
    });
  }
});


app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
