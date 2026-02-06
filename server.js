import express from "express";
import pg from "pg";

const app = express();
app.use(express.json());

// Render vai te dar essa variável no painel (Environment)
const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("Faltou DATABASE_URL nas variáveis de ambiente.");
  process.exit(1);
}

const { Pool } = pg;
const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: DATABASE_URL.includes("localhost") ? false : { rejectUnauthorized: false }
});

// Cria a “tabela” se ainda não existir
async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS contacts (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      phone TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
}
initDb().catch((e) => console.error("Erro initDb:", e));

// Rota de teste
app.get("/", (req, res) => res.json({ ok: true, service: "meu-backend" }));

// Salvar contato
app.post("/contacts", async (req, res) => {
  const { name, phone } = req.body || {};

  if (!name || !phone) {
    return res.status(400).json({ error: "Envie name e phone" });
  }

  // regra simples: limpa espaços
  const cleanName = String(name).trim();
  const cleanPhone = String(phone).trim();

  const result = await pool.query(
    "INSERT INTO contacts (name, phone) VALUES ($1, $2) RETURNING id, name, phone, created_at",
    [cleanName, cleanPhone]
  );

  res.status(201).json(result.rows[0]);
});

// Listar contatos (por enquanto aberto só pra testar)
app.get("/contacts", async (req, res) => {
  const result = await pool.query(
    "SELECT id, name, phone, created_at FROM contacts ORDER BY created_at DESC LIMIT 50"
  );
  res.json(result.rows);
});

const port = process.env.PORT || 10000;
app.listen(port, () => console.log("Backend rodando na porta", port));
