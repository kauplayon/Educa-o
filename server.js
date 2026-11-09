const express = require("express");
const path = require("path");
const crypto = require("crypto");
const { Pool } = require("pg");

const app = express();
const PORT = process.env.PORT || 3000;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.PGSSL === "true" ? { rejectUnauthorized: false } : false
});

app.use(express.json({ limit: "100kb" }));
app.use(express.static(path.join(__dirname, "public")));

const sessions = new Map();
const TOKEN_TTL = 8 * 60 * 60 * 1000;

async function initializeDatabase() {
  if (!process.env.DATABASE_URL) {
    console.warn("DATABASE_URL não configurada. A API de respostas ficará indisponível.");
    return;
  }
  await pool.query(`
    CREATE TABLE IF NOT EXISTS avaliacoes (
      id BIGSERIAL PRIMARY KEY,
      turma TEXT NOT NULL,
      nome TEXT,
      respostas JSONB NOT NULL,
      criada_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  console.log("Banco de dados preparado.");
}

function requireTeacher(req, res, next) {
  const token = (req.headers.authorization || "").replace(/^Bearer\s+/i, "");
  const expiresAt = sessions.get(token);
  if (!token || !expiresAt || expiresAt < Date.now()) {
    sessions.delete(token);
    return res.status(401).json({ error: "Acesso restrito ao professor." });
  }
  next();
}

app.get("/api/health", (_req, res) => res.json({ status: "ok" }));

app.post("/api/avaliacoes", async (req, res) => {
  try {
    if (!process.env.DATABASE_URL) return res.status(503).json({ error: "Banco de dados ainda não configurado." });
    const { turma, nome, respostas } = req.body || {};
    const turmaValida = typeof turma === "string" && ["3A", "3B"].includes(turma.trim());
    const nomeValido = typeof nome === "string" && nome.trim().length >= 3;
    if (!turmaValida || !nomeValido || !respostas || typeof respostas !== "object" || Array.isArray(respostas)) {
      return res.status(400).json({ error: "Informe seu nome completo, selecione 3A ou 3B e responda à avaliação." });
    }
    await pool.query(
      "INSERT INTO avaliacoes (turma, nome, respostas) VALUES ($1, $2, $3)",
      [turma.trim(), nome.trim().slice(0, 100), respostas]
    );
    res.status(201).json({ message: "Avaliação registrada com sucesso." });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Não foi possível registrar a avaliação." });
  }
});

app.post("/api/login", (req, res) => {
  const configuredPassword = process.env.TEACHER_PASSWORD;
  const password = req.body && req.body.password;
  if (!configuredPassword) return res.status(503).json({ error: "Defina TEACHER_PASSWORD nas variáveis do serviço." });
  if (typeof password !== "string" || password.length > 200) return res.status(400).json({ error: "Senha inválida." });
  const expected = Buffer.from(configuredPassword);
  const received = Buffer.from(password);
  const valid = expected.length === received.length && crypto.timingSafeEqual(expected, received);
  if (!valid) return res.status(401).json({ error: "Senha incorreta." });
  const token = crypto.randomBytes(32).toString("hex");
  sessions.set(token, Date.now() + TOKEN_TTL);
  res.json({ token, expiresIn: TOKEN_TTL });
});

app.get("/api/avaliacoes", requireTeacher, async (_req, res) => {
  try {
    const result = await pool.query(
      "SELECT id, turma, nome, respostas, criada_em FROM avaliacoes ORDER BY criada_em DESC LIMIT 1000"
    );
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Não foi possível carregar as respostas." });
  }
});

app.get("*", (_req, res) => res.sendFile(path.join(__dirname, "public", "index.html")));

initializeDatabase().catch(error => {
  console.error("Falha ao iniciar o banco de dados:", error);
  process.exit(1);
});

app.listen(PORT, () => console.log(`Aplicação disponível na porta ${PORT}`));
