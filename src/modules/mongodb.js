import mongoose from 'mongoose';
import vars from '../modules/crypto-js.js';
const Schema = mongoose.Schema;

mongoose
	.connect(
		`mongodb+srv://${vars.MDB_USER}:${vars.MDB_PASSWORD}@cluster0.h8zq9.mongodb.net/gestion_personal_911`,
		{
			useNewUrlParser: true,
			useUnifiedTopology: true,
		},
	)
	.then(() => console.log('Connected to MongoDB...'))
	.catch((error) => console.error('Could not connect to MongoDB', error));

const stringType = { type: String, required: true };

const user = new Schema({
	username: stringType,
	lastName: stringType,
	firstName: stringType,
	ni: { type: Number, required: true },
	section: stringType,
	guardId: stringType,
	email: stringType,
	password: stringType,
	superior: { type: Boolean, required: true },
	changes: [],
});

const change = new Schema({
	section: stringType,
	changelog: [],
	coverData: {
		name: stringType,
		date: stringType,
		shift: stringType,
		day: stringType,
		guardId: stringType,
	},
	returnData: {
		name: stringType,
		date: stringType,
		shift: stringType,
		day: stringType,
		guardId: stringType,
	},
	status: stringType,
}).index({ createdAt: 1 }, { expireAfterSeconds: 5184000 });

const request = new Schema({
	name: stringType,
	requestData: {
		date: stringType,
		shift: stringType,
		day: stringType,
		guardId: stringType,
	},
	offerData: {
		date: stringType,
		shift: stringType,
		day: stringType,
		guardId: stringType,
	},
	section: stringType,
}).index({ createdAt: 1 }, { expireAfterSeconds: 5184000 });

const affected = new Schema({
	name: stringType,
	affectedData: {
		date: stringType,
		shift: stringType,
		day: stringType,
		guardId: stringType,
	},
	disaffectedData: {
		date: stringType,
		shift: stringType,
		day: stringType,
		guardId: stringType,
	},
	bookPage: stringType,
	section: stringType,
}).index({ createdAt: 1 }, { expireAfterSeconds: 5184000 });

const User = mongoose.model('user', user);
const Change = mongoose.model('change', change);
const Request = mongoose.model('request', request);
const Affected = mongoose.model('affected', affected);

export default { User, Change, Request, Affected };
