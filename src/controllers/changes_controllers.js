import changesModels from '../models/change.js';

const selectModel = (section) => {
	let consultChanges;
	if (section == 'Monitoreo') consultChanges = changesModels.Monitoring;
	if (section == 'Teléfono') consultChanges = changesModels.Phone;
	return consultChanges;
};

const all = async (req, res) => {
	let consultChanges = selectModel(req.userData.section);

	const filterChanges = (totalChanges) => {
		let upcomingChanges = [];
		let date = new Date(Date.now());
		let dateToday = new Date(date.getFullYear(), date.getMonth(), date.getDate());
		totalChanges.forEach((ch) => {
			let datePartC = ch.coverResult.date.split('/');
			let datePartD = ch.returnResult.date.split('/');
			let dateCover = new Date(datePartC[2], datePartC[1] - 1, datePartC[0]);
			let dateReturn = new Date(datePartD[2], datePartD[1] - 1, datePartD[0]);
			if (dateReturn >= dateToday && dateCover >= dateToday) {
				upcomingChanges.push(ch);
			}
		});
		return upcomingChanges;
	};

	try {
		const totalChanges = await consultChanges.find({});
		const filteredChanges = filterChanges(totalChanges);
		res.send(filteredChanges);
	} catch (error) {
		res.send({ mensaje: error });
	}
};

const newOne = async (req, res) => {
	const { startDate, startDay, returnName, coverName, returnResult, coverResult } = req.body;

	let ChangeModel = selectModel(req.userData.section);

	const newChange = new ChangeModel({
		startDate,
		startDay,
		returnName,
		coverName,
		returnResult,
		coverResult,
		status: 'Solicitado',
	});

	try {
		let result = await newChange.save();
		console.log(result);
		res.send(result);
	} catch (error) {
		res.send({ error: error });
	}
};

const cancel = async (req, res) => {
	const { changeId } = req.body;

	if (req.userData.superior) return res.send({ error: 'Error' });

	let ChangeModel = selectModel(req.userData.section);

	try {
		let result = await ChangeModel.findOneAndUpdate(
			{ _id: changeId },
			{ $set: { status: 'Cancelado' } },
		);
		res.send(result);
	} catch (error) {
		res.send({ error: error });
	}
};

const modify = async (req, res) => {
	const { action, changeId, fullName } = req.body;

	if (!req.userData.superior) return res.send({ error: 'Error' });

	let actionDB;
	if (action === 'aprobar') actionDB = 'Aprobado';
	if (action === 'noaprobar') actionDB = 'No aprobado';
	if (action === 'anular') actionDB = 'Anulado';

	let ChangeModel = selectModel(req.userData.section);

	try {
		let result = await ChangeModel.findOneAndUpdate(
			{ _id: changeId },
			{ $set: { status: `${actionDB} por ${fullName}` } },
		);
		res.send(result);
	} catch (error) {
		res.send({ error: error });
	}
};

const search = async (section, coverFilter, coverData, returnFilter, returnData) => {
	let changeModel = selectModel(section);

	const changesCover = await changeModel.find({
		[coverFilter]: coverData,
		status: /^Aprobado/,
	});

	const changesReturn = await changeModel.find({
		[returnFilter]: returnData,
		status: /^Aprobado/,
	});

	return { changesCover, changesReturn };
};

export default { all, newOne, cancel, modify, search };
