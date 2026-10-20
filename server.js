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
  { parentId: 1, driver: 'D-1001', name: 'Alice Johnson', profession: 'Engineer' },
  { parentId: 2, driver: 'D-1002', name: 'Bob Smith', profession: 'Teacher' },
  { parentId: 3, driver: 'D-1003', name: 'Carol White', profession: 'Doctor' },
  { parentId: 4, driver: 'D-1004', name: 'David Brown', profession: 'Designer' },
  { parentId: 5, driver: 'D-1005', name: 'Eva Martinez', profession: 'Accountant' },
  { parentId: 6, driver: 'D-1006', name: 'Frank Lee', profession: 'Architect' },
];

const children = [
  { childId: 1, name: 'Jamie Johnson', school: 'North School', course: 'Grade 4' },
  { childId: 2, name: 'Taylor Smith', school: 'Central School', course: 'Grade 5' },
  { childId: 3, name: 'Morgan White', school: 'West School', course: 'Grade 3' },
];

// Two parents are associated with each sample child.
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

const findParent = (id) => parents.find((parent) => parent.parentId === id);
const findChild = (id) => children.find((p) => p.childId === id);

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
      title: 'Parent/Child API',
      version: '1.0.0',
      description: 'Express in-memory version of the ACME REST API'
    },
    servers: [{ url: 'http://localhost:3000' }],
    components: {
      schemas: {
        Parent: {
          type: 'object',
          properties: {
            parentId: { type: 'integer' },
            driver: { type: 'string' },
            name: { type: 'string' },
            profession: { type: 'string' }
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
//           parent ENDPOINTS
// ==========================================
// Note: fixed paths (/count, /is-registered) are registered before
// /parents/:parentId so they are not captured by the parameter route.

/**
 * @swagger
 * /parents/count:
 *   get:
 *     summary: Count parents
 *     tags: [parents]
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
 *     summary: Check if parent driver is registered
 *     tags: [parents]
 *     parameters:
 *       - in: query
 *         name: driver
 *         schema:
 *           type: string
 *         required: true
 *     responses:
 *       200:
 *         description: Boolean result
 */
app.get('/parents/is-registered', (req, res) => {
  const { driver } = req.query;
  res.status(200).json(parents.some((a) => a.driver === driver));
});

/**
 * @swagger
 * /parents:
 *   post:
 *     summary: Add a new parent
 *     tags: [parents]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Parent'
 *     responses:
 *       201:
 *         description: parent created
 *       400:
 *         description: parent already registered
 */
app.post('/parents', (req, res) => {
  const { driver, name, profession } = req.body;

  if (!driver || !name || !profession) {
    return res.status(400).send('driver, name and profession are required.');
  }
  if (parents.some((a) => a.driver === driver)) {
    return res.status(400).send(`parent with driver ${driver} is already registered.`);
  }

  parents.push({ parentId: nextParentId++, driver, name, profession });
  res.status(201).end();
});

/**
 * @swagger
 * /parents/{parentId}:
 *   put:
 *     summary: Update an existing parent
 *     tags: [parents]
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
 *         description: parent updated
 *       400:
 *         description: Bad request
 */
app.put('/parents/:parentId', (req, res) => {
  const parentId = parseInt(req.params.parentId, 10);
  const { parentId: bodyId, driver, name, profession } = req.body;

  if (!driver || !name || !profession) {
    return res.status(400).send('driver, name and profession are required.');
  }
  if (bodyId !== parentId) {
    return res.status(400).send('Path ID and Body ID do not match.');
  }
  if (parents.some((a) => a.driver === driver && a.parentId !== parentId)) {
    return res.status(400).send('Driver already in use by another parent.');
  }

  const parent = findParent(parentId);
  if (!parent) return res.status(400).send('parent ID not found.');

  parent.name = name;
  parent.driver = driver;
  parent.profession = profession;
  res.status(200).end();
});

/**
 * @swagger
 * /parents/{parentId}:
 *   delete:
 *     summary: Delete an parent
 *     tags: [parents]
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
  const idx = parents.findIndex((a) => a.parentId === parentId);
  if (idx !== -1) parents.splice(idx, 1);
  parentChildren = parentChildren.filter((l) => l.parentId !== parentId);
  res.status(204).end();
});

/**
 * @swagger
 * /parents/{parentId}:
 *   get:
 *     summary: Get an parent by ID (includes their children)
 *     tags: [parents]
 *     parameters:
 *       - in: path
 *         name: parentId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: parent found
 *       404:
 *         description: parent not found
 */
app.get('/parents/:parentId', (req, res) => {
  const parentId = parseInt(req.params.parentId, 10);
  const parent = findParent(parentId);
  if (!parent) return res.status(404).end();

  const parentchildList = parentChildren
    .filter((l) => l.parentId === parentId)
    .map((l) => findChild(l.childId))
    .filter(Boolean);

  res.status(200).json({ ...parent, children: parentchildList });
});

/**
 * @swagger
 * /parents:
 *   get:
 *     summary: Get all parents ordered by name
 *     tags: [parents]
 *     responses:
 *       200:
 *         description: List of parents
 */
app.get('/parents', (req, res) => {
  const sorted = [...parents].sort((a, b) => a.name.localeCompare(b.name));
  res.status(200).json(sorted);
});

// ==========================================
//           child ENDPOINTS
// ==========================================

/**
 * @swagger
 * /children/count:
 *   get:
 *     summary: Count children
 *     tags: [children]
 *     responses:
 *       200:
 *         description: Number of children
 */
app.get('/children/count', (req, res) => {
  res.status(200).json(children.length);
});

/**
 * @swagger
 * @swagger
 * /children:
 *   post:
 *     summary: Add a new child
 *     tags: [children]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Child'
 *     responses:
 *       201:
 *         description: child created
 *       400:
 *         description: Invalid child data
 */
app.post('/children', (req, res) => {
  const { school, name, course } = req.body;

  if (!name || !school || !course) {
    return res.status(400).send('name, school and course are required.');
  }

  children.push({ childId: nextChildId++, name, school, course });
  res.status(201).end();
});

/**
 * @swagger
 * /children/{childId}:
 *   put:
 *     summary: Update an existing child
 *     tags: [children]
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
 *         description: child updated
 *       400:
 *         description: Bad request
 */
app.put('/children/:childId', (req, res) => {
  const childId = parseInt(req.params.childId, 10);
  const { childId: bodyId, school, name, course } = req.body;

  if (!name || !school || !course) {
    return res.status(400).send('name, school and course are required.');
  }
  if (bodyId !== childId) {
    return res.status(400).send('Path ID and Body ID do not match.');
  }
  const child = findChild(childId);
  if (!child) return res.status(400).send('child ID not found.');

  child.school = school;
  child.name = name;
  child.course = course;
  res.status(200).end();
});

/**
 * @swagger
 * /children/{childId}:
 *   delete:
 *     summary: Delete a child
 *     tags: [children]
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
  const idx = children.findIndex((p) => p.childId === childId);
  if (idx !== -1) children.splice(idx, 1);
  parentChildren = parentChildren.filter((l) => l.childId !== childId);
  res.status(204).end();
});

/**
 * @swagger
 * /children/{childId}:
 *   get:
 *     summary: Get a child by ID (includes its parents)
 *     tags: [children]
 *     parameters:
 *       - in: path
 *         name: childId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: child found
 *       404:
 *         description: child not found
 */
app.get('/children/:childId', (req, res) => {
  const childId = parseInt(req.params.childId, 10);
  const child = findChild(childId);
  if (!child) return res.status(404).end();

  const childparents = parentChildren
    .filter((l) => l.childId === childId)
    .map((l) => findParent(l.parentId))
    .filter(Boolean);

  res.status(200).json({ ...child, parents: childparents });
});

/**
 * @swagger
 * /children:
 *   get:
 *     summary: Get all children ordered by name
 *     tags: [children]
 *     responses:
 *       200:
 *         description: List of children
 */
app.get('/children', (req, res) => {
  const sorted = [...children].sort((a, b) => a.name.localeCompare(b.name));
  res.status(200).json(sorted);
});

/**
// ==========================================
//   LINK / UNLINK parent <-> child
// ==========================================

function handleLink(req, res) {
  const parentId = parseInt(req.params.parentId, 10);
  const childId = parseInt(req.params.childId, 10);
  if (!findParent(parentId) || !findChild(childId)) {
    return res.status(404).send('parent or child not found.');
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
 *     summary: Link child to parent
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
 *         description: parent or child not found
 *   delete:
 *     summary: Unlink child from parent
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
 *     summary: Link parent to child
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
 *         description: parent or child not found
 *   delete:
 *     summary: Unlink parent from child
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
