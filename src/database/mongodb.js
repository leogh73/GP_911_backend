import mongoose from 'mongoose';

mongoose
	.connect(
		`mongodb+srv://${process.env.MDB_USER}:${process.env.MDB_PASSWORD}@cluster0.h8zq9.mongodb.net/gestion_personal_911`,
		{
			useNewUrlParser: true,
			useUnifiedTopology: true,
		},
	)
	.then(() => console.log('Connected to MongoDB...'))
	.catch((error) => console.error('Could not connect to MongoDB', error));
