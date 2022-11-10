import express, { json } from 'express';
const app = express();
import cors from 'cors';
import dotenv from 'dotenv/config';
import './src/modules/mongodb.js';

app.use(json());
app.use(cors({ origin: true }));

import userRoutes from './src/routes/users_routes.js';
import spreadsheetRoutes from './src/routes/spreadsheet_routes.js';
import changesRoutes from './src/routes/changes_routes.js';

app.use('/api/user', userRoutes);
app.use('/api/spreadsheet', spreadsheetRoutes);
app.use('/api/changes', changesRoutes);

const port = process.env.PORT || 5000;
app.listen(port, () => console.log(`Listening on port ${port}`));
