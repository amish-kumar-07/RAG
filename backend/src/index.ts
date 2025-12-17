import express from "express";
import cors from "cors";
import multer from "multer";
import { v4 as uuidv4 } from "uuid";
import router from "./dbroute/User.js";
import { getSupabaseClient } from "./superbase/utility.js";
const app = express();
const PORT = 4000;

app.use(express.json());
app.use(cors({ origin: "*" }));

const upload = multer({
  storage: multer.memoryStorage(), // ✅ REQUIRED
  limits: { fileSize: 15 * 1024 * 1024 }, // 15MB (matches bucket)
});

app.use("/", router);

app.post("/upload", upload.single("file"), async (req, res) => {
  try {
    console.log("FILE:", req.file);
    console.log("BODY:", req.body);
    const supabase = getSupabaseClient();

    const { clerkId } = req.body;

    if (!clerkId) {
      return res.status(400).json({ error: "clerkId is required" });
    }

    if (!req.file) {
      return res.status(400).json({ error: "No file provided" });
    }

    const filePath = `${clerkId}/${Date.now()}-${req.file.originalname}`;

    // ✅ STEP 1: ACTUAL UPLOAD
    const { error: uploadError } = await supabase.storage
      .from("fileStore") // ✅ exact bucket name
      .upload(filePath, req.file.buffer, {
        contentType: req.file.mimetype,
        upsert: false,
      });

    if (uploadError) {
      console.error(uploadError);
      return res.status(500).json({ error: "Upload failed" });
    }

    // ✅ STEP 2: GET PUBLIC URL
    const { data } = supabase.storage
      .from("fileStore")
      .getPublicUrl(filePath);

    res.json({
      message: "Uploaded successfully",
      publicUrl: data.publicUrl,
      path: filePath,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});


app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
