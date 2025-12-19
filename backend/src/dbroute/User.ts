import { Router } from "express";
import { db } from "../db/index.js";
import { eq } from "drizzle-orm";
import { users } from "../db/schema.js";
import { CreateSession } from "../session/universalSession.js";

const router = Router();

router.post("/register", async (req, res) => {
  try {
    const { clerk_id, name, email } = req.body;

    // ✅ 1. Basic validation
    if (!clerk_id || !name || !email) {
      return res.status(400).json({ message: "All fields are required" });
    }

    // ✅ 2. Check if user already exists
    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.clerk_id, clerk_id))
      .limit(1);

    if (existingUser.length > 0) {
      return res.status(409).json({ message: "User already exists" });
    }

    // ✅ 3. Insert new user
    const [insertedUser] = await db
      .insert(users)
      .values({
        clerk_id,
        name,
        email,
      })
      .returning();

    // ✅ 4. Proper success response
    return res.status(201).json({
      message: "User registered successfully",
      user: insertedUser,
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error" });
  }
});

router.post("/create-session", async(req,res)=>{
  try {
    const { clerk_id, file_id , title } = req.body;
    
    if(!clerk_id || !title || !file_id)
    {
      return res.status(401).json({message : "All fields are required."});
    }

    const session = await CreateSession(clerk_id, file_id , title);
    return res.status(201).json({
      message: "Session created successfully",
      session,
    });
  }
  catch(err)
  {
    console.error(err);
    return res.status(500).json({ message: "Server error" });
  }
})

export default router;
