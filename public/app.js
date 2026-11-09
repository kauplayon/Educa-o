const form = document.getElementById("evaluationForm");
const formMessage = document.getElementById("formMessage");
const ratingNames = ["ingles", "literaturaArte", "gramaticaRedacao", "educacaoFisica"];
const ratings = {};

document.querySelectorAll(".rating").forEach(group => {
  const name = group.dataset.name;
  ratings[name] = 0;
  for (let value = 1; value <= 5; value++) {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = value;
    button.setAttribute("aria-label", `Nota ${value}`);
    button.setAttribute("aria-pressed", "false");
    button.addEventListener("click", () => {
      ratings[name] = value;
      group.querySelectorAll("button").forEach((item, index) => {
        const selected = index < value;
        item.classList.toggle("selected", selected);
        item.setAttribute("aria-pressed", String(index + 1 === value));
      });
    });
    group.appendChild(button);
  }
});

document.querySelectorAll(".tab").forEach(tab => {
  tab.addEventListener("click", () => {
    document.querySelectorAll(".tab").forEach(item => item.classList.toggle("active", item === tab));
    document.getElementById("studentPanel").classList.toggle("hidden", tab.dataset.tab !== "student");
    document.getElementById("teacherPanel").classList.toggle("hidden", tab.dataset.tab !== "teacher");
  });
});

form.addEventListener("submit", async event => {
  event.preventDefault();
  formMessage.textContent = "";
  formMessage.className = "message";
  const missing = ratingNames.filter(name => !ratings[name]);
  if (missing.length) {
    formMessage.textContent = "Selecione uma nota de 1 a 5 para cada área antes de enviar.";
    formMessage.classList.add("error");
    document.querySelector(`.rating[data-name="${missing[0]}"]`).scrollIntoView({ behavior: "smooth", block: "center" });
    return;
  }
  const data = new FormData(form);
  const payload = {
    turma: data.get("turma"),
    nome: data.get("nome"),
    respostas: {
      participacao: data.get("participacao"),
      compreensao: data.get("compreensao"),
      questoes: data.get("questoes"),
      notas: { ...ratings },
      dificuldade: data.get("dificuldade"),
      estrategia: data.get("estrategia"),
      aprendizado: data.get("aprendizado"),
      retomar: data.get("retomar"),
      compromisso: data.get("compromisso")
    }
  };
  const submitButton = form.querySelector('button[type="submit"]');
  submitButton.disabled = true;
  submitButton.textContent = "Enviando...";
  try {
    const response = await fetch("/api/avaliacoes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Não foi possível enviar.");
    form.reset();
    ratingNames.forEach(name => {
      ratings[name] = 0;
      document.querySelectorAll(`.rating[data-name="${name}"] button`).forEach(button => {
        button.classList.remove("selected");
        button.setAttribute("aria-pressed", "false");
      });
    });
    formMessage.textContent = "Sua autoavaliação foi enviada. Obrigado por participar!";
    formMessage.classList.add("success");
    formMessage.scrollIntoView({ behavior: "smooth", block: "center" });
  } catch (error) {
    formMessage.textContent = error.message.includes("Banco de dados") || error.message.includes("Failed to fetch")
      ? "O formulário está pronto, mas o armazenamento ainda precisa ser configurado pelo professor."
      : error.message;
    formMessage.classList.add("error");
  } finally {
    submitButton.disabled = false;
    submitButton.innerHTML = 'Enviar autoavaliação <span>→</span>';
  }
});

let teacherToken = "";
const loginBox = document.getElementById("loginBox");
const dashboard = document.getElementById("dashboard");
const loginMessage = document.getElementById("loginMessage");
let cachedResponses = [];

document.getElementById("loginButton").addEventListener("click", async () => {
  loginMessage.textContent = "";
  try {
    const response = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: document.getElementById("teacherPassword").value })
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Não foi possível entrar.");
    teacherToken = result.token;
    loginBox.classList.add("hidden");
    dashboard.classList.remove("hidden");
    await loadResponses();
  } catch (error) {
    loginMessage.textContent = error.message;
    loginMessage.className = "message error";
  }
});

async function loadResponses() {
  const response = await fetch("/api/avaliacoes", { headers: { Authorization: `Bearer ${teacherToken}` } });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || "Falha ao carregar.");
  cachedResponses = result;
  document.getElementById("totalCount").textContent = result.length;
  document.getElementById("classCount").textContent = new Set(result.map(item => item.turma)).size;
  const allScores = result.flatMap(item => Object.values(item.respostas.notas || {}).filter(Number.isFinite));
  document.getElementById("averageScore").textContent = allScores.length
    ? (allScores.reduce((sum, score) => sum + score, 0) / allScores.length).toFixed(1).replace(".", ",") + "/5"
    : "—";
  const tbody = document.getElementById("responsesBody");
  tbody.innerHTML = "";
  if (!result.length) {
    tbody.innerHTML = '<tr><td colspan="5">Ainda não há respostas registradas.</td></tr>';
    return;
  }
  result.forEach(item => {
    const row = document.createElement("tr");
    const date = new Date(item.criada_em).toLocaleString("pt-BR");
    [date, item.turma, item.nome || "Anônimo", item.respostas.dificuldade || "—", item.respostas.participacao || "—"].forEach(value => {
      const cell = document.createElement("td");
      cell.textContent = value;
      row.appendChild(cell);
    });
    tbody.appendChild(row);
  });
}

document.getElementById("logoutButton").addEventListener("click", () => {
  teacherToken = "";
  dashboard.classList.add("hidden");
  loginBox.classList.remove("hidden");
  document.getElementById("teacherPassword").value = "";
});

document.getElementById("exportButton").addEventListener("click", () => {
  const headers = ["Data", "Turma", "Nome", "Participação", "Compreensão", "Questões", "Inglês", "Literatura e Arte", "Gramática e Redação", "Educação Física", "Dificuldade", "Estratégia", "Aprendizado", "Retomar", "Compromisso"];
  const rows = cachedResponses.map(item => {
    const r = item.respostas;
    return [new Date(item.criada_em).toLocaleString("pt-BR"), item.turma, item.nome || "Anônimo", r.participacao, r.compreensao, r.questoes, r.notas?.ingles, r.notas?.literaturaArte, r.notas?.gramaticaRedacao, r.notas?.educacaoFisica, r.dificuldade, r.estrategia, r.aprendizado, r.retomar, r.compromisso];
  });
  const csv = [headers, ...rows].map(row => row.map(value => `"${String(value ?? "").replace(/"/g, '""')}"`).join(";")).join("\r\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "autoavaliacao-aulao-linguagens.csv";
  link.click();
  URL.revokeObjectURL(url);
});
