import luxon from '../modules/luxon.js';
import mongodb from '../modules/mongodb.js';
import db from '../modules/mongodb.js';

const all = async (req, res) => {
	let date = new Date(Date.now());
	let dateToday = new Date(date.getFullYear(), date.getMonth(), date.getDate());

	const filterList = (type, totalList) => {
		let upcomingItems = totalList.filter((item) => {
			let datePartC = itemDate(type, 1, item);
			let datePartD = itemDate(type, 2, item);
			let date1 = new Date(datePartC[2], datePartC[1] - 1, datePartC[0]);
			let date2 = new Date(datePartD[2], datePartD[1] - 1, datePartD[0]);
			if (date2 >= dateToday && date1 >= dateToday) return item;
		});
		return upcomingItems;
	};

	const closestDate = (type, item) => {
		let dateParts1 = itemDate(type, 1, item.toObject());
		let dateParts2 = itemDate(type, 2, item.toObject());
		let date1 = new Date(dateParts1[2], dateParts1[1] - 1, dateParts1[0]);
		let date2 = new Date(dateParts2[2], dateParts2[1] - 1, dateParts2[0]);
		return date1.getTime() > date2.getTime() ? date2 : date1;
	};

	const sortList = (type, itemsList) => {
		let sortedList = itemsList.sort(
			(item1, item2) => closestDate(type, item1) - closestDate(type, item2),
		);
		let i = 0;
		let finalList = sortedList.map((item) => {
			let newItem = item.toObject();
			newItem.priorityId = (i += 1).toString().padStart(3, '0');
			return newItem;
		});
		return finalList;
	};

	const { type } = req.body;

	try {
		let allItems;
		if (type === 'change') allItems = await db.Change.find({ section: req.userData.section });
		if (type === 'request') allItems = await db.Request.find({ section: req.userData.section });
		if (type === 'affected') allItems = await db.Affected.find({ section: req.userData.section });
		let filteredItems = filterList(type, allItems);
		let sortedItems = sortList(type, filteredItems);
		res.send(sortedItems);
	} catch (error) {
		console.log(error);
		res.status(500).send({ error: error.toString() });
	}
};

const newOne = async (req, res) => {
	const { type } = req.body;

	let newElement;
	if (type === 'change') {
		const { coverData, returnData } = req.body;
		newElement = mongodb.Change({
			changelog: [luxon.changelog(['Creación'], coverData.name)],
			coverData,
			returnData,
			section: req.userData.section,
			status: 'Solicitado',
		});
	}
	if (type === 'request') {
		const { name, requestData, offerData } = req.body;
		newElement = mongodb.Request({ name, requestData, offerData });
	}
	if (type === 'affected') {
		const { name, affectedData, disaffectedData, bookPage } = req.body;
		newElement = mongodb.Affected({ name, affectedData, disaffectedData, bookPage });
	}

	try {
		let result = await newElement.save();
		res.send(result);
	} catch (error) {
		console.log(error);
		res.send({ error: error.toString() });
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
		console.log(error);

		res.send({ error: error.toString() });
	}
};

const edit = async (req, res) => {
	const { changeId, coverName, returnName, comment } = req.body;

	let result;
	let userName = req.userData.fullName;

	try {
		if (!coverName.new) {
			let changelogItem = luxon.changelog(
				[`Quien devuelve: '${returnName.previous}' --> '${returnName.new}'`],
				comment.length ? comment : null,
				userName,
			);
			result = await db.Change.findOneAndUpdate(
				{ _id: changeId },
				{
					$push: {
						changelog: changelogItem,
					},
					$set: { 'returnData.name': returnName.new },
				},
			);
		}
		if (!returnName.new) {
			let changelogItem = luxon.changelog(
				[`Quien cubre: '${coverName.previous}' --> '${coverName.new}'`],
				comment.length ? comment : null,
				userName,
			);
			result = await db.Change.findOneAndUpdate(
				{ _id: changeId },
				{
					$push: {
						changelog: changelogItem,
					},
					$set: { 'coverData.name': coverName.new },
				},
			);
		}
		if (coverName.new && returnName.new) {
			let changelogItem = luxon.changelog(
				[
					`Quien cubre: '${coverName.previous}' --> '${coverName.new}'`,
					`Quien devuelve: '${returnName.previous}' --> '${returnName.new}'`,
				],
				comment.length ? comment : null,
				userName,
			);
			result = await db.Change.findOneAndUpdate(
				{ _id: changeId },
				{
					$push: {
						changelog: changelogItem,
					},
					$set: { 'coverData.name': coverName.new, 'returnData.name': returnName.new },
				},
			);
		}
		res.send(result);
	} catch (error) {
		console.log(error);
		res.send({ error: error.toString() });
	}
};

const modify = async (req, res) => {
	const { type, itemId, status, comment } = req.body;

	if (
		(!req.userData.superior && type !== ('change' || 'request')) ||
		(req.userData.superior && type === 'cancel')
	) {
		console.log('ERROR!!');
		return res.send({ error: 'Error' });
	}

	let model;
	if (type === 'change') model = db.Change;
	if (type === 'request') model = db.Request;
	if (type === 'affected') model = db.Affected;

	let changelogItem = status
		? luxon.changelog(
				[`Estado: '${status.previous}' --> '${status.new}'`],
				comment.length ? comment : null,
				req.userData.fullName,
		  )
		: null;

	try {
		let result = status
			? await model.findOneAndUpdate(
					{ _id: itemId },
					{
						$push: {
							changelog: changelogItem,
						},
						$set: { status: status.new },
					},
			  )
			: await model.findOneAndDelete({ _id: itemId });
		res.send({ result, changelogItem });
	} catch (error) {
		console.log(error);
		res.send({ error: error.toString() });
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

const itemDate = (type, number, itemData) => {
	if (type === 'change')
		return number === 1 ? itemData.coverData.date.split('/') : itemData.returnData.date.split('/');
	if (type === 'request')
		return number === 1
			? itemData.requestData.date.split('/')
			: itemData.offerData.date.split('/');
	if (type === 'affected')
		return number === 1
			? itemData.affectedData.date.split('/')
			: itemData.disaffectedData.date.split('/');
};

export default { all, newOne, edit, cancel, modify, search };
