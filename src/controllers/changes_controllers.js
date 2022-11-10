import luxon from '../modules/luxon.js';
import db from '../modules/mongodb.js';

const all = async (req, res) => {
	const filterChanges = (totalChanges) => {
		let date = new Date(Date.now());
		let dateToday = new Date(date.getFullYear(), date.getMonth(), date.getDate());
		let upcomingChanges = totalChanges.filter((ch) => {
			let datePartC = ch.coverData.date.split('/');
			let datePartD = ch.returnData.date.split('/');
			let dateCover = new Date(datePartC[2], datePartC[1] - 1, datePartC[0]);
			let dateReturn = new Date(datePartD[2], datePartD[1] - 1, datePartD[0]);
			if (dateReturn >= dateToday && dateCover >= dateToday) return ch;
		});
		return upcomingChanges;
	};

	const closestDate = (ch) => {
		let coverParts = ch.toObject().coverData.date.split('/');
		let returnParts = ch.toObject().returnData.date.split('/');
		let dateCover = new Date(coverParts[2], coverParts[1] - 1, coverParts[0]);
		let dateReturn = new Date(returnParts[2], returnParts[1] - 1, returnParts[0]);
		return dateCover.getTime() > dateReturn.getTime() ? dateReturn : dateCover;
	};

	const sortChanges = (changesList) => {
		let sortedList = changesList.sort((ch1, ch2) => closestDate(ch1) - closestDate(ch2));
		let i = 0;
		let finalList = sortedList.map((item) => {
			let newItem = item.toObject();
			newItem.priorityId = (i += 1).toString().padStart(3, '0');
			return newItem;
		});
		return finalList;
	};

	try {
		const totalChanges = await db.Change.find({ section: req.userData.section });
		const filteredChanges = filterChanges(totalChanges);
		const sortedChanges = sortChanges(filteredChanges);
		res.send(sortedChanges);
	} catch (error) {
		res.send({ mensaje: error });
	}
};

const newOne = async (req, res) => {
	const { coverData, returnData } = req.body;

	const newChange = new db.Change({
		history: [luxon.timeStamp(`Cambio creado por ${coverData.name}`)],
		coverData,
		returnData,
		section: req.userData.section,
		status: 'Solicitado',
	});

	try {
		let result = await newChange.save();
		res.send(result);
	} catch (error) {
		res.send({ error: error });
	}
};

const cancel = async (req, res) => {
	const { changeId } = req.body;

	if (req.userData.superior) return res.send({ error: 'Error' });

	try {
		let result = await db.Change.findOneAndUpdate(
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
	if (action === 'approve') actionDB = 'Aprobado';
	if (action === 'notapprove') actionDB = 'No aprobado';
	if (action === 'void') actionDB = 'Anulado';

	try {
		let result = await db.Change.findOneAndUpdate(
			{ _id: changeId },
			{ $set: { status: actionDB } },
		);
		res.send(result);
	} catch (error) {
		res.send({ error: error });
	}
};

const search = async (section, coverFilter, coverData, returnFilter, returnData) => {
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
