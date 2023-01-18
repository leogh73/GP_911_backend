import listControllers from './list_controllers.js';
import { consultSpreadsheet } from '../modules/googleSheets.js';

const guardDay = async (req, res) => {
	const { date } = req.body;
	try {
		const { values } = (
			await consultSpreadsheet(false, 'Buscador!B3', date, 'Buscador!C2:F11', 'COLUMNS')
		).data;
		// const { changesCover, changesReturn } = await changesControllers.search(
		// 	req.userData.section,
		// 	'coverData.date',
		// 	date,
		// 	'returnData.date',
		// 	date,
		// );
		let dayGuard = loadDayGuards(values);
		res.send(dayGuard);
	} catch (error) {
		console.log(error);
		res.send({ mensaje: 'No se pudo realizar la consulta.' });
	}
};

const guardToday = async (req, res) => {
	try {
		const read = await consultSpreadsheet(true, null, null, 'Hoy!C2:F11', 'COLUMNS');
		const date = new Date(Date.now()).toLocaleString('es-AR').split(' ')[0];
		const { changesCover, changesReturn } = await searchChanges(
			req.userData.section,
			'resultCover.date',
			date,
			'resultReturn.date',
			date,
		);

		let dayGuard = loadDayGuards(changesCover, changesReturn, read);

		res.send(dayGuard);
	} catch (error) {
		console.log(error);
		res.send({ mensaje: 'No se pudo realizar la consulta.' });
	}
};

const guardMonthOwn = async (section, guardId, fullName) => {
	// const { changesCover, changesReturn } = await searchChanges(
	// 	section,
	// 	'coverName',
	// 	fullName,
	// 	'returnName',
	// 	fullName,
	// );

	// console.log(changesCover, changesReturn);

	const generateGuardData = (data) => {
		let guardsData = {
			guardsList: [],
			guardsResume: [],
		};

		data.forEach((d) => {
			let dayGuard = {};
			dayGuard.date = d[0];
			dayGuard.day = d[4];
			if (d[1] === guardId) dayGuard.shift = '6 a 14 hs.';
			if (d[2] === guardId) dayGuard.shift = '14 a 22 hs.';
			if (d[3] === guardId) dayGuard.shift = '22 a 6 hs.';
			dayGuard.resume = `${d[0]} - ${d[4]} - ${dayGuard.shift}`;
			guardsData.guardsResume.push(dayGuard.resume);
			guardsData.guardsList.push(dayGuard);
		});

		return guardsData;
	};

	try {
		const consult = await consultSpreadsheet(
			false,
			'Buscador!B15',
			guardId,
			'Buscador!B25:F40',
			'ROWS',
		);
		const result = generateGuardData(consult.data.values);
		return result;
	} catch (error) {
		console.log(error);
		res.send({ mensaje: 'No se pudo realizar la consulta.' });
	}
};

const guardMonthTotal = async (req, res) => {
	const { date } = req.body;

	try {
		const consult = await consultSpreadsheet(
			false,
			'Buscador!B3',
			date,
			'Buscador!B44:F74',
			'ROWS',
		);
		res.send(consult.data.values);
	} catch (error) {
		console.log(error);
		res.send({ mensaje: 'No se pudo realizar la consulta.' });
	}
};

const loadStaff = (changesCover, changesReturn, data) => {
	let guardStaff = [];
	for (let i = 3; i < data.length; i++) {
		let name = data[i];
		let newName = name;
		if (changesCover.length && changesCover[0].returnName === name) {
			newName = changesCover[0].coverName;
		}
		if (changesReturn.length && changesReturn[0].coverName === name) {
			newName = changesReturn[0].returnName;
		}
		guardStaff.push(newName);
	}
	return guardStaff;
};

const loadDayGuards = (read) => {
	return [
		{
			shift: '6 a 14 hs.',
			guardId: read[0][1],
		},
		{
			shift: '14 a 22 hs.',
			guardId: read[1][1],
		},
		{
			shift: '22 a 6 hs.',
			guardId: read[2][1],
		},
	];
};

const allUsers = async (req, res) => {
	try {
		const consult = await consultSpreadsheet(true, null, null, 'Personal!A2:F7', 'COLUMNS');
		const userList = consult.data.values.flat().sort();
		res.send(userList);
	} catch (error) {
		console.log(error);
		res.send({ mensaje: 'No se pudo realizar la consulta.' });
	}
};

export default { guardDay, guardToday, guardMonthOwn, guardMonthTotal, allUsers };
