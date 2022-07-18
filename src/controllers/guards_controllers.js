import changesControllers from './changes_controllers.js';
import { consultSpreadsheet } from '../database/googleSheets.js';

const day = async (req, res) => {
	const { date } = req.body;
	console.log(date);
	try {
		const { values } = (
			await consultSpreadsheet(false, 'Buscador!B3', date, 'Buscador!C2:F11', 'COLUMNS')
		).data;
		console.log(values);
		const { changesCover, changesReturn } = await changesControllers.search(
			req.userData.section,
			'coverResult.date',
			date,
			'returnResult.date',
			date,
		);

		let dayGuard = loadDayGuards(changesCover, changesReturn, values);

		// console.log(dayGuard);

		res.send(dayGuard);
	} catch (error) {
		console.log(error);
		res.send({ mensaje: 'No se pudo realizar la consulta.' });
	}
};

const today = async (req, res) => {
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

const monthOwn = async (section, guardId, fullName) => {
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

const monthTotal = async (req, res) => {
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
	console.log(data);
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

const loadDayGuards = (changesCover, changesReturn, read) => {
	return [
		[{ day: read[3][1] }],
		[
			{
				shift: '6 a 14 hs.',
				guardId: read[0][1],
				staff: loadStaff(changesCover, changesReturn, read[0]),
			},
			{
				shift: '14 a 22 hs.',
				guardId: read[1][1],
				staff: loadStaff(changesCover, changesReturn, read[1]),
			},
			{
				shift: '22 a 6 hs.',
				guardId: read[2][1],
				staff: loadStaff(changesCover, changesReturn, read[2]),
			},
		],
	];
};

export default { day, today, monthOwn, monthTotal };
