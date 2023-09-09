import luxon from '../modules/luxon.js';
import db from '../modules/mongodb.js';
import notifyUsers from '../modules/nodemailer.js';

const all = async (req, res) => {
	const { type } = req.body;

	try {
		let allItems;
		if (type === 'change') allItems = await db.Change.find({ section: req.userData.section });
		if (type === 'request') allItems = await db.Request.find({ section: req.userData.section });
		if (type === 'affected') allItems = await db.Affected.find({ section: req.userData.section });
		let filteredItems = filterList(type, allItems);
		let sortedItems = sortList(type, filteredItems, false);
		res.send({ result: sortedItems, newAccessToken: req.newAccessToken });
	} catch (error) {
		console.log(error);
		await db.storeLog('Get all changes', { userId: req.userData.userId, body: req.body }, error);
		res.send({ error: error.toString() });
	}
};

const newOne = async (req, res) => {
	const { type } = req.body;

	let newElement;
	if (type === 'change') {
		const { coverData, returnData, motive } = req.body;
		newElement = db.Change({
			changelog: [luxon.changelog(['Creación'], motive.length ? motive : '', coverData.name)],
			coverData,
			returnData,
			section: req.userData.section,
			motive: motive.length ? motive : null,
			status: 'Solicitado',
		});
	}
	if (type === 'request') {
		const { name, requestData, offerData, comment } = req.body;
		newElement = db.Request({
			section: req.userData.section,
			name,
			requestData,
			offerData,
			comment,
		});
	}
	if (type === 'affected') {
		const { name, affectedData, disaffectedData, bookPage, comment } = req.body;
		newElement = db.Affected({
			section: req.userData.section,
			superior: req.userData.fullName,
			name,
			affectedData,
			disaffectedData,
			bookPage,
			comment: comment.length ? comment : null,
		});
	}

	try {
		let result = await newElement.save();
		let mailId;
		if (type === 'affected')
			mailId = await notifyUsers(
				result,
				true,
				`Se han hecho cambios en su servicio.`,
				req.userData.section,
				'affected',
			);
		res.send({ result, mailId, newAccessToken: req.newAccessToken });
	} catch (error) {
		console.log(error);
		await db.storeLog('Create new item', { userId: req.userData.userId, body: req.body }, error);
		res.send({ error: error.toString() });
	}
};

const edit = async (req, res) => {
	const { changeId, coverName, returnName, comment } = req.body;

	const generateChangelog = () => {
		let changelogDetails = [];
		for (const [key, value] of Object.entries(req.body)) {
			if (!!value.new)
				changelogDetails.push(
					`${key === 'coverName' ? 'Quien cubre' : 'Quien devuelve'}: ${value.previous} --> ${
						value.new
					}`,
				);
		}
		return changelogDetails;
	};

	let changelogItem = luxon.changelog(
		generateChangelog(),
		comment.length ? comment : null,
		req.userData.fullName,
	);

	try {
		let result = await db.Change.findOneAndUpdate(
			{ _id: changeId },
			{
				$push: {
					changelog: changelogItem,
				},
				$set: {
					'coverData.name': coverName.new ?? coverName.previous,
					'returnData.name': returnName.new ?? returnName.previous,
				},
			},
		);
		res.send({ result, newAccessToken: req.newAccessToken });
	} catch (error) {
		console.log(error);
		await db.storeLog('Edit change', { userId: req.userData.userId, body: req.body }, error);
		res.send({ error: error.toString() });
	}
};

const modify = async (req, res) => {
	const { type, itemId, status, comment } = req.body;

	if (
		(!req.userData.superior && type !== 'change' && type !== 'request') ||
		(req.userData.superior && type === 'cancel')
	) {
		return res.send({ error: 'User not valid' });
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
		let mailId;
		if ((type === 'change') & !!status)
			mailId = await notifyUsers(
				result,
				status.new,
				`Su cambio de guardia ha sido ${status ? status.new.toLowerCase() : 'eliminado'}`,
				req.userData.section,
				'change',
			);
		if (type === 'affected' && !status)
			mailId = await notifyUsers(
				result,
				null,
				'Su cambio de servicio ha sido eliminado',
				req.userData.section,
				'affected',
			);
		res.send({ result, changelogItem, mailId, newAccessToken: req.newAccessToken });
	} catch (error) {
		console.log(error);
		await db.storeLog('Modify change', { userId: req.userData.userId, body: req.body }, error);
		res.send({ error: error.toString() });
	}
};

const fetch = async (req, res) => {
	const { type, id } = req.params;
	try {
		let item = type === 'change' ? await db.Change.findById(id) : await db.Affected.findById(id);
		if (!item) return res.status(404).json({ error: 'Item not found' });
		return res.status(200).json(item);
	} catch (error) {
		res.status(500).send({ error: 'An error ocurred', detail: error.toString() });
		await db.storeLog('Fetch', { type, id }, error);
	}
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

const filterList = (type, totalList) => {
	let date = new Date(Date.now());
	let dateToday = new Date(date.getFullYear(), date.getMonth(), date.getDate());
	let upcomingItems = totalList.filter((item) => {
		let datePartC = itemDate(type, 1, item);
		let datePartD = itemDate(type, 2, item);
		let date1 = new Date(datePartC[2], datePartC[1] - 1, datePartC[0]);
		let date2;
		if (datePartD[0] !== '-') date2 = new Date(datePartD[2], datePartD[1] - 1, datePartD[0]);
		if ((!!date2 && date2 >= dateToday && date1 >= dateToday) || date1 >= dateToday) return item;
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

const sortList = (type, itemsList, schedule) => {
	let sortedList = itemsList.sort(
		(item1, item2) => closestDate(type, item1) - closestDate(type, item2),
	);
	let finalList = sortedList;
	if (!schedule) {
		let i = 0;
		finalList = sortedList.map((item) => {
			let newItem = item.toObject();
			newItem.priorityId = (i += 1).toString().padStart(3, '0');
			return newItem;
		});
	}
	return finalList;
};

export default { all, newOne, edit, modify, fetch };
