import mongoose from 'mongoose';
import luxon from '../modules/luxon.js';
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

const userSchema = new Schema({
	username: stringType,
	lastName: stringType,
	firstName: stringType,
	ni: { type: Number, required: true },
	hierarchy: stringType,
	section: stringType,
	guardId: stringType,
	email: stringType,
	password: stringType,
	superior: { type: Boolean, required: true },
	admin: { type: Boolean, required: true },
	changelog: [],
});

const changeSchema = new Schema({
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

const requestSchema = new Schema({
	name: stringType,
	requestData: {
		date: stringType,
		shift: stringType,
		day: stringType,
		guardId: stringType,
	},
	offerData: {
		date: { type: String, required: false },
		shift: { type: String, required: false },
		day: { type: String, required: false },
		guardId: { type: String, required: false },
	},
	comment: { type: String, required: false },
	section: stringType,
}).index({ createdAt: 1 }, { expireAfterSeconds: 5184000 });

const affectedSchema = new Schema({
	superior: stringType,
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
	comment: { type: String, required: false },
}).index({ createdAt: 1 }, { expireAfterSeconds: 5184000 });

const logSchema = new Schema({
	actionName: { type: String, required: true },
	actionDetail: { type: Object, required: true },
	errorMessage: { type: String, required: true },
	date: { type: String, required: true },
	time: { type: String, required: true },
});

const oauth2Schema = new Schema({
	tokens: { type: Object, required: true },
});

const User = mongoose.model('user', userSchema);
const Change = mongoose.model('change', changeSchema);
const Request = mongoose.model('request', requestSchema);
const Affected = mongoose.model('affected', affectedSchema);
const Oauth2 = mongoose.model('oauth', oauth2Schema);
const Log = mongoose.model('log', logSchema);

const storeLog = async (actionName, actionDetail, errorMessage) => {
	let message = luxon.errorMessage();
	return await new Log({
		actionName,
		actionDetail,
		errorMessage,
		date: message.date,
		time: message.time,
	}).save();
};

export default { User, Change, Request, Affected, Oauth2, storeLog };
