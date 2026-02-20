require("dotenv").config();
const express = require("express");
const cors = require("cors");
const fs = require("fs");
const { GoogleGenerativeAI } = require("@google/generative-ai");

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static("public"));

// ==============================
// Load Knowledge TXT
// ==============================
const knowledgeText = fs.readFileSync("./data/knowledge.txt", "utf-8");

// ==============================
// Setup Gemini
// ==============================
if (!process.env.GEMINI_API_KEY) {
  console.error("❌ API key tidak ditemukan. Cek file .env kamu.");
  process.exit(1);
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({
  model: "models/gemini-2.5-flash",
});

// ==============================
// Memory (per session, max 10 turns)
// ==============================
let conversationHistory = [];

// ==============================
// Simple keyword search on knowledge.txt
// ==============================
function searchKnowledge(query) {
  const q = query.toLowerCase().replace(/[^\w\s]/gi, "");
  const words = q.split(/\s+/).filter((w) => w.length > 2);

  const lines = knowledgeText.split("\n").filter((line) => line.trim() !== "");

  const matched = lines.filter((line) => {
    const lower = line.toLowerCase();
    return words.some((word) => lower.includes(word));
  });

  // Return matched lines, or full knowledge if nothing found
  return matched.length > 0 ? matched.join("\n") : knowledgeText;
}

// ==============================
// Build Prompt
// ==============================
function buildPrompt(question) {
  const context = searchKnowledge(question);

  const historyText = conversationHistory
    .map((msg) => `${msg.role}: ${msg.text}`)
    .join("\n");

  return `
Kamu adalah chatbot We Bare Bears yang ramah dan menyenangkan. 🐻🐼🐻‍❄️

ATURAN:
- Jawab HANYA berdasarkan informasi di bawah ini.
- Jika informasi tidak tersedia, katakan: "Maaf, informasi tersebut tidak tersedia dalam knowledge saya."
- Gunakan bahasa yang santai dan menyenangkan sesuai tema We Bare Bears.

=== KNOWLEDGE ===
${context}

=== RIWAYAT PERCAKAPAN ===
${historyText || "(belum ada percakapan sebelumnya)"}

=== PERTANYAAN PENGGUNA ===
${question}

=== JAWABAN ===
`;
}

// ==============================
// API Endpoint
// ==============================
app.post("/chat", async (req, res) => {
  const userMessage = req.body.message;

  if (!userMessage || userMessage.trim() === "") {
    return res.status(400).json({ error: "Pesan tidak boleh kosong." });
  }

  const prompt = buildPrompt(userMessage);

  try {
    const result = await model.generateContent(prompt);
    const response = result.response.text();

    conversationHistory.push({ role: "User", text: userMessage });
    conversationHistory.push({ role: "Bot", text: response });

    // Keep only last 10 messages (5 turns)
    if (conversationHistory.length > 10) {
      conversationHistory = conversationHistory.slice(-10);
    }

    res.json({ reply: response });
  } catch (error) {
    console.error("Gemini error:", error.message);
    res.status(500).json({
      reply: "Waduh, ada kesalahan dari server. Coba lagi ya! 🐾",
    });
  }
});

// ==============================
// Run Server
// ==============================
app.listen(3000, () => {
  console.log("✅ Server berjalan di http://localhost:3000");
  console.log("📚 Knowledge loaded:", knowledgeText.length, "karakter");
});