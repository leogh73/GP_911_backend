import express from 'express';
const app = express();
import cors from 'cors';
import dotenv from 'dotenv/config';
import cookieParser from 'cookie-parser';

app.use(express.json());
app.use(cors({ origin: true, credentials: true }));
app.use(cookieParser());

import userRoutes from './src/routes/user_routes.js';
import spreadsheetRoutes from './src/routes/spreadsheet_routes.js';
import itemRoutes from './src/routes/item_routes.js';

app.use((req, res, next) => {
	if (req.method !== 'POST') return res.status(405).send('Not allowed.');
	next();
});

app.use('/api/user', userRoutes);
app.use('/api/spreadsheet', spreadsheetRoutes);
app.use('/api/item', itemRoutes);

const port = process.env.PORT || 5000;
app.listen(port, () => console.log(`Listening on port ${port}`));
