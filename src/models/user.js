import mongoose from 'mongoose';
const Schema = mongoose.Schema;

const monitoringUser = new Schema({
	username: { type: String, required: true },
	lastName: { type: String, required: true },
	firstName: { type: String, required: true },
	ni: { type: Number, required: true },
	section: { type: String, required: true },
	guardId: { type: String },
	email: { type: String, required: true },
	password: { type: String, required: true },
	superior: { type: Boolean, required: true },
	changes: [],
});

const phoneUser = new Schema({
	username: { type: String, required: true },
	lastName: { type: String, required: true },
	firstName: { type: String, required: true },
	ni: { type: Number, required: true },
	section: { type: String, required: true },
	guardId: { type: String },
	email: { type: String, required: true },
	password: { type: String, required: true },
	superior: { type: Boolean, required: true },
	changes: [],
});

const Monitoring = mongoose.model('monitoring_users', monitoringUser);
const Phone = mongoose.model('phone_users', phoneUser);

export default { Monitoring, Phone };
