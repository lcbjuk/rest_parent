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
const parents = [
  { parentId: 1, name: 'Alice Johnson', profession: 'Nurse',      driver: true },
  { parentId: 2, name: 'Bob Smith',     profession: 'Engineer',   driver: false },
  { parentId: 3, name: 'Carol White',   profession: 'Teacher',    driver: true },
  { parentId: 4, name: 'David Brown',   profession: 'Accountant', driver: true },
  { parentId: 5, name: 'Eva Martinez',  profession: 'Architect',  driver: false },
  { parentId: 6, name: 'Frank Lee',     profession: 'Chef',       driver: true },
];

const children = [
  { childId: 1, name: 'Emma Johnson-Smith', school: 'Lincoln Elementary', course: 'Grade 3' },
  { childId: 2, name: 'Liam White-Brown',   school: 'Roosevelt Middle',   course: 'Grade 7' },
  { childId: 3, name: 'Mia Martinez-Lee',   school: 'Central High',       course: 'Biology' },
];

// parent_children: 2 parents per child
// Child 1 -> Alice (1), Bob (2)
// Child 2 -> Carol (3), David (4)
// Child 3 -> Eva (5), Frank (6)
let parentChildren = [
  { parentId: 1, childId: 1 },
  { parentId: 2, childId: 1 },
  { parentId: 3, childId: 2 },
  { parentId: 4, childId: 2 },
  { parentId: 5, childId: 3 },
  { parentId: 6, childId: 3 },
];

let nextParentId = 7;
let nextChildId = 4;

const findParent = (id) => parents.find((p) => p.parentId === id);
const findChild = (id) => children.find((c) => c.childId === id);

function link(parentId, childId) {
  const exists = parentChildren.some(
    (l) => l.parentId === parentId && l.childId === childId
  );
  if (!exists) parentChildren.push({ parentId, childId });
}

function unlink(parentId, childId) {
  parentChildren = parentChildren.filter(
    (l) => !(l.parentId === parentId && l.childId === childId)
  );
}

// ==========================================
//           SWAGGER SETUP
// ==========================================
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'ACME Parent/Child API',
      version: '1.0.0',
      description: 'Express in-memory version of the ACME REST API'
    },
    servers: [{ url: 'https://rest-parent.onrender.com' }],
    components: {
      schemas: {
        Parent: {
          type: 'object',
          properties: {
            parentId: { type: 'integer' },
            name: { type: 'string' },
            profession: { type: 'string' },
            driver: { type: 'boolean' }
          }
        },
        Child: {
          type: 'object',
          properties: {
            childId: { type: 'integer' },
            name: { type: 'string' },
            school: { type: 'string' },
            course: { type: 'string' }
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
//           PARENT ENDPOINTS
// ==========================================
// Note: fixed paths (/count, /is-registered, /drivers) are registered before
// /parents/:parentId so they are not captured by the parameter route.

/**
 * @swagger
 * /parents/count:
 *   get:
 *     summary: Count Parents
 *     tags: [Parents]
 *     responses:
 *       200:
 *         description: Number of parents
 */
app.get('/parents/count', (req, res) => {
  res.status(200).json(parents.length);
});

/**
 * @swagger
 * /parents/is-registered:
 *   get:
 *     summary: Check if Parent name is registered
 *     tags: [Parents]
 *     parameters:
 *       - in: query
 *         name: name
 *         schema:
 *           type: string
 *         required: true
 *     responses:
 *       200:
 *         description: Boolean result
 */
app.get('/parents/is-registered', (req, res) => {
  const { name } = req.query;
  res.status(200).json(parents.some((p) => p.name === name));
});

/**
 * @swagger
 * /parents/drivers:
 *   get:
 *     summary: Get all Parents who are drivers, ordered by name
 *     tags: [Parents]
 *     responses:
 *       200:
 *         description: List of driver parents
 */
app.get('/parents/drivers', (req, res) => {
  const drivers = parents
    .filter((p) => p.driver)
    .sort((a, b) => a.name.localeCompare(b.name));
  res.status(200).json(drivers);
});

/**
 * @swagger
 * /parents:
 *   post:
 *     summary: Add a new Parent
 *     tags: [Parents]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Parent'
 *     responses:
 *       201:
 *         description: Parent created
 *       400:
 *         description: Parent already registered
 */
app.post('/parents', (req, res) => {
  const { name, profession, driver } = req.body;

  if (!name) {
    return res.status(400).send('name is required.');
  }
  if (parents.some((p) => p.name === name)) {
    return res.status(400).send(`Parent ${name} is already registered.`);
  }

  parents.push({
    parentId: nextParentId++,
    name,
    profession: profession ?? null,
    driver: Boolean(driver)
  });
  res.status(201).end();
});

/**
 * @swagger
 * /parents/{parentId}:
 *   put:
 *     summary: Update an existing Parent
 *     tags: [Parents]
 *     parameters:
 *       - in: path
 *         name: parentId
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Parent'
 *     responses:
 *       200:
 *         description: Parent updated
 *       400:
 *         description: Bad request
 */
app.put('/parents/:parentId', (req, res) => {
  const parentId = parseInt(req.params.parentId, 10);
  const { parentId: bodyId, name, profession, driver } = req.body;

  if (bodyId !== parentId) {
    return res.status(400).send('Path ID and Body ID do not match.');
  }
  if (parents.some((p) => p.name === name && p.parentId !== parentId)) {
    return res.status(400).send('Name already in use by another parent.');
  }

  const parent = findParent(parentId);
  if (!parent) return res.status(400).send('Parent ID not found.');

  parent.name = name;
  parent.profession = profession;
  parent.driver = Boolean(driver);
  res.status(200).end();
});

/**
 * @swagger
 * /parents/{parentId}:
 *   delete:
 *     summary: Delete a Parent
 *     tags: [Parents]
 *     parameters:
 *       - in: path
 *         name: parentId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       204:
 *         description: No content
 */
app.delete('/parents/:parentId', (req, res) => {
  const parentId = parseInt(req.params.parentId, 10);
  const idx = parents.findIndex((p) => p.parentId === parentId);
  if (idx !== -1) parents.splice(idx, 1);
  parentChildren = parentChildren.filter((l) => l.parentId !== parentId);
  res.status(204).end();
});

/**
 * @swagger
 * /parents/{parentId}:
 *   get:
 *     summary: Get a Parent by ID (includes their children)
 *     tags: [Parents]
 *     parameters:
 *       - in: path
 *         name: parentId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Parent found
 *       404:
 *         description: Parent not found
 */
app.get('/parents/:parentId', (req, res) => {
  const parentId = parseInt(req.params.parentId, 10);
  const parent = findParent(parentId);
  if (!parent) return res.status(404).end();

  const parentChildList = parentChildren
    .filter((l) => l.parentId === parentId)
    .map((l) => findChild(l.childId))
    .filter(Boolean);

  res.status(200).json({ ...parent, children: parentChildList });
});

/**
 * @swagger
 * /parents:
 *   get:
 *     summary: Get all Parents ordered by name
 *     tags: [Parents]
 *     responses:
 *       200:
 *         description: List of parents
 */
app.get('/parents', (req, res) => {
  const sorted = [...parents].sort((a, b) => a.name.localeCompare(b.name));
  res.status(200).json(sorted);
});

// ==========================================
//           CHILD ENDPOINTS
// ==========================================

/**
 * @swagger
 * /children/count:
 *   get:
 *     summary: Count Children
 *     tags: [Children]
 *     responses:
 *       200:
 *         description: Number of children
 */
app.get('/children/count', (req, res) => {
  res.status(200).json(children.length);
});

/**
 * @swagger
 * /children/is-registered:
 *   get:
 *     summary: Check if Child name is registered
 *     tags: [Children]
 *     parameters:
 *       - in: query
 *         name: name
 *         schema:
 *           type: string
 *         required: true
 *     responses:
 *       200:
 *         description: Boolean result
 */
app.get('/children/is-registered', (req, res) => {
  const { name } = req.query;
  res.status(200).json(children.some((c) => c.name === name));
});

/**
 * @swagger
 * /children:
 *   post:
 *     summary: Add a new Child
 *     tags: [Children]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Child'
 *     responses:
 *       201:
 *         description: Child created
 *       400:
 *         description: Child already registered
 */
app.post('/children', (req, res) => {
  const { name, school, course } = req.body;

  if (!name || !school) {
    return res.status(400).send('name and school are required.');
  }
  if (children.some((c) => c.name === name)) {
    return res.status(400).send(`Child ${name} is already registered.`);
  }

  children.push({ childId: nextChildId++, name, school, course: course ?? null });
  res.status(201).end();
});

/**
 * @swagger
 * /children/{childId}:
 *   put:
 *     summary: Update an existing Child
 *     tags: [Children]
 *     parameters:
 *       - in: path
 *         name: childId
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Child'
 *     responses:
 *       200:
 *         description: Child updated
 *       400:
 *         description: Bad request
 */
app.put('/children/:childId', (req, res) => {
  const childId = parseInt(req.params.childId, 10);
  const { childId: bodyId, name, school, course } = req.body;

  if (bodyId !== childId) {
    return res.status(400).send('Path ID and Body ID do not match.');
  }
  if (children.some((c) => c.name === name && c.childId !== childId)) {
    return res.status(400).send('Name already in use by another child.');
  }

  const child = findChild(childId);
  if (!child) return res.status(400).send('Child ID not found.');

  child.name = name;
  child.school = school;
  child.course = course;
  res.status(200).end();
});

/**
 * @swagger
 * /children/{childId}:
 *   delete:
 *     summary: Delete a Child
 *     tags: [Children]
 *     parameters:
 *       - in: path
 *         name: childId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       204:
 *         description: No content
 */
app.delete('/children/:childId', (req, res) => {
  const childId = parseInt(req.params.childId, 10);
  const idx = children.findIndex((c) => c.childId === childId);
  if (idx !== -1) children.splice(idx, 1);
  parentChildren = parentChildren.filter((l) => l.childId !== childId);
  res.status(204).end();
});

/**
 * @swagger
 * /children/{childId}:
 *   get:
 *     summary: Get a Child by ID (includes their parents)
 *     tags: [Children]
 *     parameters:
 *       - in: path
 *         name: childId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Child found
 *       404:
 *         description: Child not found
 */
app.get('/children/:childId', (req, res) => {
  const childId = parseInt(req.params.childId, 10);
  const child = findChild(childId);
  if (!child) return res.status(404).end();

  const childParents = parentChildren
    .filter((l) => l.childId === childId)
    .map((l) => findParent(l.parentId))
    .filter(Boolean);

  res.status(200).json({ ...child, parents: childParents });
});

/**
 * @swagger
 * /children:
 *   get:
 *     summary: Get all Children ordered by name
 *     tags: [Children]
 *     responses:
 *       200:
 *         description: List of children
 */
app.get('/children', (req, res) => {
  const sorted = [...children].sort((a, b) => a.name.localeCompare(b.name));
  res.status(200).json(sorted);
});

// ==========================================
//   LINK / UNLINK PARENT <-> CHILD
// ==========================================

function handleLink(req, res) {
  const parentId = parseInt(req.params.parentId, 10);
  const childId = parseInt(req.params.childId, 10);
  if (!findParent(parentId) || !findChild(childId)) {
    return res.status(404).send('Parent or Child not found.');
  }
  link(parentId, childId);
  res.status(204).end();
}

function handleUnlink(req, res) {
  const parentId = parseInt(req.params.parentId, 10);
  const childId = parseInt(req.params.childId, 10);
  unlink(parentId, childId);
  res.status(204).end();
}

/**
 * @swagger
 * /parents/{parentId}/children/{childId}:
 *   put:
 *     summary: Link Child to Parent
 *     tags: [Links]
 *     parameters:
 *       - in: path
 *         name: parentId
 *         required: true
 *         schema:
 *           type: integer
 *       - in: path
 *         name: childId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       204:
 *         description: Linked
 *       404:
 *         description: Parent or Child not found
 *   delete:
 *     summary: Unlink Child from Parent
 *     tags: [Links]
 *     parameters:
 *       - in: path
 *         name: parentId
 *         required: true
 *         schema:
 *           type: integer
 *       - in: path
 *         name: childId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       204:
 *         description: Unlinked
 */
app.put('/parents/:parentId/children/:childId', handleLink);
app.delete('/parents/:parentId/children/:childId', handleUnlink);

/**
 * @swagger
 * /children/{childId}/parents/{parentId}:
 *   put:
 *     summary: Link Parent to Child
 *     tags: [Links]
 *     parameters:
 *       - in: path
 *         name: childId
 *         required: true
 *         schema:
 *           type: integer
 *       - in: path
 *         name: parentId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       204:
 *         description: Linked
 *       404:
 *         description: Parent or Child not found
 *   delete:
 *     summary: Unlink Parent from Child
 *     tags: [Links]
 *     parameters:
 *       - in: path
 *         name: childId
 *         required: true
 *         schema:
 *           type: integer
 *       - in: path
 *         name: parentId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       204:
 *         description: Unlinked
 */
app.put('/children/:childId/parents/:parentId', handleLink);
app.delete('/children/:childId/parents/:parentId', handleUnlink);

// ==========================================
//             START SERVER
// ==========================================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`ACME API (in-memory) listening at http://localhost:${PORT}`);
  console.log(`Swagger UI at http://localhost:${PORT}/api-docs`);
});
