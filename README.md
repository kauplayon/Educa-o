# Autoavaliação do Aulão de Linguagens

Aplicação web responsiva para estudantes da 3ª série do Ensino Médio e painel restrito ao professor.

## Funcionalidades
- Autoavaliação por participação, compreensão e resolução de questões.
- Escala de 1 a 5 em Inglês, Literatura e Arte, Gramática e Redação e Educação Física.
- Reflexão sobre dificuldades, estratégias, aprendizados e compromissos.
- Painel protegido por senha, indicadores e exportação CSV.
- Armazenamento centralizado em PostgreSQL.

## Executar localmente
1. Instale Node.js 20 ou superior.
2. Execute `npm install`.
3. Configure as variáveis de ambiente `DATABASE_URL` e `TEACHER_PASSWORD`.
4. Execute `npm start` e acesse `http://localhost:3000`.

## Publicar no Render
1. Crie um banco PostgreSQL e copie a URL de conexão interna.
2. Crie um Web Service conectado a este repositório.
3. O arquivo `render.yaml` configura os comandos de instalação e inicialização.
4. No painel do Render, configure:
   - `DATABASE_URL`: URL interna do PostgreSQL.
   - `TEACHER_PASSWORD`: crie uma senha forte para o painel do professor.
   - `PGSSL`: mantenha `false` ao usar a URL interna do Render.
5. Faça o deploy.

**Atenção:** sem `DATABASE_URL`, o formulário não grava respostas. O banco PostgreSQL é necessário para reunir as respostas de todos os estudantes em um único local. Não coloque senhas ou URLs privadas diretamente nos arquivos do GitHub.

## Privacidade
O nome do estudante é opcional. As respostas são acessíveis pelo painel autenticado do professor. Compartilhe o endereço do site apenas com as turmas envolvidas e evite solicitar dados pessoais desnecessários.
