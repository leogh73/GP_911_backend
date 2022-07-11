import mongoose from 'mongoose';
const Schema = mongoose.Schema;

const monitoringChange = new Schema({
	startDate: { type: String, required: true },
	startDay: { type: String, required: true },
	returnName: { type: String, required: true },
	coverName: { type: String, required: true },
	returnResult: {
		date: { type: String, required: true },
		day: { type: String, required: true },
		shift: { type: String, required: true },
		guardId: { type: String, required: true },
	},
	coverResult: {
		date: { type: String, required: true },
		day: { type: String, required: true },
		shift: { type: String, required: true },
		guardId: { type: String, required: true },
	},
	status: { type: String, required: true },
}).index({ createdAt: 1 }, { expireAfterSeconds: 5184000 });

const phoneChange = new Schema({
	startDate: { type: String, required: true },
	startDay: { type: String, required: true },
	returnName: { type: String, required: true },
	coverName: { type: String, required: true },
	returnResult: {
		date: { type: String, required: true },
		day: { type: String, required: true },
		shift: { type: String, required: true },
		guardId: { type: String, required: true },
	},
	coverResult: {
		date: { type: String, required: true },
		day: { type: String, required: true },
		shift: { type: String, required: true },
		guardId: { type: String, required: true },
	},
	status: { type: String, required: true },
}).index({ createdAt: 1 }, { expireAfterSeconds: 5184000 });

const Monitoring = mongoose.model('monitoring_changes', monitoringChange);
const Phone = mongoose.model('phone_changes', phoneChange);

export default { Monitoring, Phone };
