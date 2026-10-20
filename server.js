// npm install express swagger-ui-express swagger-jsdoc cors

const express = require('express');
const swaggerUi = require('swagger-ui-express');
const swaggerJSDoc = require('swagger-jsdoc');
const cors = require('cors');

const app = express();

app.use(cors());
app.use(express.json());

// ==========================================
//   IN-MEMORY STORE (resets on restart)
// ==========================================
const authors = [
  { authorId: 1, name: 'Alice Johnson', email: 'alice@acme.com' },
  { authorId: 2, name: 'Bob Smith',     email: 'bob@acme.com' },
  { authorId: 3, name: 'Carol White',   email: 'carol@acme.com' },
  { authorId: 4, name: 'David Brown',   email: 'david@acme.com' },
  { authorId: 5, name: 'Eva Martinez',  email: 'eva@acme.com' },
  { authorId: 6, name: 'Frank Lee',     email: 'frank@acme.com' },
];

const papers = [
  { paperId: 1, entryId: 'arxiv-001', title: 'Deep Learning Fundamentals',        abstract: 'An overview of deep learning techniques.' },
  { paperId: 2, entryId: 'arxiv-002', title: 'Quantum Computing Advances',        abstract: 'Recent progress in quantum hardware and algorithms.' },
  { paperId: 3, entryId: 'arxiv-003', title: 'Climate Modeling with Neural Nets', abstract: 'Applying ML to climate prediction models.' },
];

// author_papers: 2 authors per paper
// Paper 1 -> Alice (1), Bob (2)
// Paper 2 -> Carol (3), David (4)
// Paper 3 -> Eva (5), Frank (6)
let authorPapers = [
  { authorId: 1, paperId: 1 },
  { authorId: 2, paperId: 1 },
  { authorId: 3, paperId: 2 },
  { authorId: 4, paperId: 2 },
  { authorId: 5, paperId: 3 },
  { authorId: 6, paperId: 3 },
];

let nextAuthorId = 7;
let nextPaperId = 4;

const findAuthor = (id) => authors.find((a) => a.authorId === id);
const findPaper = (id) => papers.find((p) => p.paperId === id);

function link(authorId, paperId) {
  const exists = authorPapers.some(
    (l) => l.authorId === authorId && l.paperId === paperId
  );
  if (!exists) authorPapers.push({ authorId, paperId });
}

function unlink(authorId, paperId) {
  authorPapers = authorPapers.filter(
    (l) => !(l.authorId === authorId && l.paperId === paperId)
  );
}

// ==========================================
//           SWAGGER SETUP
// ==========================================
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'ACME Author/Paper API',
      version: '1.0.0',
      description: 'Express in-memory version of the ACME REST API'
    },
    servers: [{ url: 'https://rest-papers.onrender.com' }],
    components: {
      schemas: {
        Author: {
          type: 'object',
          properties: {
            authorId: { type: 'integer' },
            name: { type: 'string' },
            email: { type: 'string' }
          }
        },
        Paper: {
          type: 'object',
          properties: {
            paperId: { type: 'integer' },
            entryId: { type: 'string' },
            title: { type: 'string' },
            abstract: { type: 'string' }
          }
        }
      }
    }
  },
  apis: [__filename]
};

const swaggerSpec = swaggerJSDoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// ==========================================
//           AUTHOR ENDPOINTS
// ==========================================
// Note: fixed paths (/count, /is-registered) are registered before
// /authors/:authorId so they are not captured by the parameter route.

/**
 * @swagger
 * /authors/count:
 *   get:
 *     summary: Count Authors
 *     tags: [Authors]
 *     responses:
 *       200:
 *         description: Number of authors
 */
app.get('/authors/count', (req, res) => {
  res.status(200).json(authors.length);
});

/**
 * @swagger
 * /authors/is-registered:
 *   get:
 *     summary: Check if Author email is registered
 *     tags: [Authors]
 *     parameters:
 *       - in: query
 *         name: email
 *         schema:
 *           type: string
 *         required: true
 *     responses:
 *       200:
 *         description: Boolean result
 */
app.get('/authors/is-registered', (req, res) => {
  const { email } = req.query;
  res.status(200).json(authors.some((a) => a.email === email));
});

/**
 * @swagger
 * /authors:
 *   post:
 *     summary: Add a new Author
 *     tags: [Authors]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Author'
 *     responses:
 *       201:
 *         description: Author created
 *       400:
 *         description: Author already registered
 */
app.post('/authors', (req, res) => {
  const { name, email } = req.body;

  if (!name || !email) {
    return res.status(400).send('name and email are required.');
  }
  if (authors.some((a) => a.email === email)) {
    return res.status(400).send(`Author with email ${email} is already registered.`);
  }

  authors.push({ authorId: nextAuthorId++, name, email });
  res.status(201).end();
});

/**
 * @swagger
 * /authors/{authorId}:
 *   put:
 *     summary: Update an existing Author
 *     tags: [Authors]
 *     parameters:
 *       - in: path
 *         name: authorId
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Author'
 *     responses:
 *       200:
 *         description: Author updated
 *       400:
 *         description: Bad request
 */
app.put('/authors/:authorId', (req, res) => {
  const authorId = parseInt(req.params.authorId, 10);
  const { authorId: bodyId, name, email } = req.body;

  if (bodyId !== authorId) {
    return res.status(400).send('Path ID and Body ID do not match.');
  }
  if (authors.some((a) => a.email === email && a.authorId !== authorId)) {
    return res.status(400).send('Email already in use by another author.');
  }

  const author = findAuthor(authorId);
  if (!author) return res.status(400).send('Author ID not found.');

  author.name = name;
  author.email = email;
  res.status(200).end();
});

/**
 * @swagger
 * /authors/{authorId}:
 *   delete:
 *     summary: Delete an Author
 *     tags: [Authors]
 *     parameters:
 *       - in: path
 *         name: authorId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       204:
 *         description: No content
 */
app.delete('/authors/:authorId', (req, res) => {
  const authorId = parseInt(req.params.authorId, 10);
  const idx = authors.findIndex((a) => a.authorId === authorId);
  if (idx !== -1) authors.splice(idx, 1);
  authorPapers = authorPapers.filter((l) => l.authorId !== authorId);
  res.status(204).end();
});

/**
 * @swagger
 * /authors/{authorId}:
 *   get:
 *     summary: Get an Author by ID (includes their papers)
 *     tags: [Authors]
 *     parameters:
 *       - in: path
 *         name: authorId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Author found
 *       404:
 *         description: Author not found
 */
app.get('/authors/:authorId', (req, res) => {
  const authorId = parseInt(req.params.authorId, 10);
  const author = findAuthor(authorId);
  if (!author) return res.status(404).end();

  const authorPaperList = authorPapers
    .filter((l) => l.authorId === authorId)
    .map((l) => findPaper(l.paperId))
    .filter(Boolean);

  res.status(200).json({ ...author, papers: authorPaperList });
});

/**
 * @swagger
 * /authors:
 *   get:
 *     summary: Get all Authors ordered by name
 *     tags: [Authors]
 *     responses:
 *       200:
 *         description: List of authors
 */
app.get('/authors', (req, res) => {
  const sorted = [...authors].sort((a, b) => a.name.localeCompare(b.name));
  res.status(200).json(sorted);
});

// ==========================================
//           PAPER ENDPOINTS
// ==========================================

/**
 * @swagger
 * /papers/count:
 *   get:
 *     summary: Count Papers
 *     tags: [Papers]
 *     responses:
 *       200:
 *         description: Number of papers
 */
app.get('/papers/count', (req, res) => {
  res.status(200).json(papers.length);
});

/**
 * @swagger
 * /papers/is-existing:
 *   get:
 *     summary: Check if Paper entryId exists
 *     tags: [Papers]
 *     parameters:
 *       - in: query
 *         name: entryId
 *         schema:
 *           type: string
 *         required: true
 *     responses:
 *       200:
 *         description: Boolean result
 */
app.get('/papers/is-existing', (req, res) => {
  const { entryId } = req.query;
  res.status(200).json(papers.some((p) => p.entryId === entryId));
});

/**
 * @swagger
 * /papers:
 *   post:
 *     summary: Add a new Paper
 *     tags: [Papers]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Paper'
 *     responses:
 *       201:
 *         description: Paper created
 *       400:
 *         description: Paper already exists
 */
app.post('/papers', (req, res) => {
  const { entryId, title, abstract } = req.body;

  if (!entryId || !title) {
    return res.status(400).send('entryId and title are required.');
  }
  if (papers.some((p) => p.entryId === entryId)) {
    return res.status(400).send(`Paper with entryId ${entryId} already exists.`);
  }

  papers.push({ paperId: nextPaperId++, entryId, title, abstract: abstract ?? null });
  res.status(201).end();
});

/**
 * @swagger
 * /papers/{paperId}:
 *   put:
 *     summary: Update an existing Paper
 *     tags: [Papers]
 *     parameters:
 *       - in: path
 *         name: paperId
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Paper'
 *     responses:
 *       200:
 *         description: Paper updated
 *       400:
 *         description: Bad request
 */
app.put('/papers/:paperId', (req, res) => {
  const paperId = parseInt(req.params.paperId, 10);
  const { paperId: bodyId, entryId, title, abstract } = req.body;

  if (bodyId !== paperId) {
    return res.status(400).send('Path ID and Body ID do not match.');
  }
  if (papers.some((p) => p.entryId === entryId && p.paperId !== paperId)) {
    return res.status(400).send('EntryID already in use by another paper.');
  }

  const paper = findPaper(paperId);
  if (!paper) return res.status(400).send('Paper ID not found.');

  paper.entryId = entryId;
  paper.title = title;
  paper.abstract = abstract;
  res.status(200).end();
});

/**
 * @swagger
 * /papers/{paperId}:
 *   delete:
 *     summary: Delete a Paper
 *     tags: [Papers]
 *     parameters:
 *       - in: path
 *         name: paperId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       204:
 *         description: No content
 */
app.delete('/papers/:paperId', (req, res) => {
  const paperId = parseInt(req.params.paperId, 10);
  const idx = papers.findIndex((p) => p.paperId === paperId);
  if (idx !== -1) papers.splice(idx, 1);
  authorPapers = authorPapers.filter((l) => l.paperId !== paperId);
  res.status(204).end();
});

/**
 * @swagger
 * /papers/{paperId}:
 *   get:
 *     summary: Get a Paper by ID (includes its authors)
 *     tags: [Papers]
 *     parameters:
 *       - in: path
 *         name: paperId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Paper found
 *       404:
 *         description: Paper not found
 */
app.get('/papers/:paperId', (req, res) => {
  const paperId = parseInt(req.params.paperId, 10);
  const paper = findPaper(paperId);
  if (!paper) return res.status(404).end();

  const paperAuthors = authorPapers
    .filter((l) => l.paperId === paperId)
    .map((l) => findAuthor(l.authorId))
    .filter(Boolean);

  res.status(200).json({ ...paper, authors: paperAuthors });
});

/**
 * @swagger
 * /papers:
 *   get:
 *     summary: Get all Papers ordered by title
 *     tags: [Papers]
 *     responses:
 *       200:
 *         description: List of papers
 */
app.get('/papers', (req, res) => {
  const sorted = [...papers].sort((a, b) => a.title.localeCompare(b.title));
  res.status(200).json(sorted);
});

/**
 * @swagger
 * /keywords:
 *   get:
 *     summary: Extract keywords from abstracts (stub)
 *     tags: [Papers]
 *     responses:
 *       200:
 *         description: DONE
 */
app.get('/keywords', (req, res) => {
  res.status(200).send('DONE!');
});

/**
 * @swagger
 * /pdf/{paperId}:
 *   get:
 *     summary: Download Paper PDF (stub)
 *     tags: [Papers]
 *     parameters:
 *       - in: path
 *         name: paperId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Email sent
 */
app.get('/pdf/:paperId', (req, res) => {
  const paperId = parseInt(req.params.paperId, 10);
  const pdfName = `paper-${paperId}.pdf`;
  res.status(200).send(`Check your email for PDF ${pdfName}`);
});

// ==========================================
//   LINK / UNLINK AUTHOR <-> PAPER
// ==========================================

function handleLink(req, res) {
  const authorId = parseInt(req.params.authorId, 10);
  const paperId = parseInt(req.params.paperId, 10);
  if (!findAuthor(authorId) || !findPaper(paperId)) {
    return res.status(404).send('Author or Paper not found.');
  }
  link(authorId, paperId);
  res.status(204).end();
}

function handleUnlink(req, res) {
  const authorId = parseInt(req.params.authorId, 10);
  const paperId = parseInt(req.params.paperId, 10);
  unlink(authorId, paperId);
  res.status(204).end();
}

/**
 * @swagger
 * /authors/{authorId}/papers/{paperId}:
 *   put:
 *     summary: Link Paper to Author
 *     tags: [Links]
 *     parameters:
 *       - in: path
 *         name: authorId
 *         required: true
 *         schema:
 *           type: integer
 *       - in: path
 *         name: paperId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       204:
 *         description: Linked
 *       404:
 *         description: Author or Paper not found
 *   delete:
 *     summary: Unlink Paper from Author
 *     tags: [Links]
 *     parameters:
 *       - in: path
 *         name: authorId
 *         required: true
 *         schema:
 *           type: integer
 *       - in: path
 *         name: paperId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       204:
 *         description: Unlinked
 */
app.put('/authors/:authorId/papers/:paperId', handleLink);
app.delete('/authors/:authorId/papers/:paperId', handleUnlink);

/**
 * @swagger
 * /papers/{paperId}/authors/{authorId}:
 *   put:
 *     summary: Link Author to Paper
 *     tags: [Links]
 *     parameters:
 *       - in: path
 *         name: paperId
 *         required: true
 *         schema:
 *           type: integer
 *       - in: path
 *         name: authorId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       204:
 *         description: Linked
 *       404:
 *         description: Author or Paper not found
 *   delete:
 *     summary: Unlink Author from Paper
 *     tags: [Links]
 *     parameters:
 *       - in: path
 *         name: paperId
 *         required: true
 *         schema:
 *           type: integer
 *       - in: path
 *         name: authorId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       204:
 *         description: Unlinked
 */
app.put('/papers/:paperId/authors/:authorId', handleLink);
app.delete('/papers/:paperId/authors/:authorId', handleUnlink);

// ==========================================
//             START SERVER
// ==========================================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`ACME API (in-memory) listening at http://localhost:${PORT}`);
  console.log(`Swagger UI at http://localhost:${PORT}/api-docs`);
});
