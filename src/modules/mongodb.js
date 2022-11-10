import mongoose from 'mongoose';
const Schema = mongoose.Schema;

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

const user = new Schema({
	username: { type: String, required: true },
	lastName: { type: String, required: true },
	firstName: { type: String, required: true },
	ni: { type: Number, required: true },
	section: { type: String, required: true },
	guardId: { type: String, required: true },
	email: { type: String, required: true },
	password: { type: String, required: true },
	superior: { type: Boolean, required: true },
	changes: [],
});

const change = new Schema({
	section: { type: String, required: true },
	history: [],
	coverData: {
		name: { type: String, required: true },
		date: { type: String, required: true },
		shift: { type: String, required: true },
		day: { type: String, required: true },
		guardId: { type: String, required: true },
	},
	returnData: {
		name: { type: String, required: true },
		date: { type: String, required: true },
		shift: { type: String, required: true },
		day: { type: String, required: true },
		guardId: { type: String, required: true },
	},
	status: { type: String, required: true },
}).index({ createdAt: 1 }, { expireAfterSeconds: 5184000 });

const User = mongoose.model('user', user);
const Change = mongoose.model('change', change);

export default { User, Change };
