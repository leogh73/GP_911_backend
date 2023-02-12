import { consultSpreadsheet } from '../modules/googleSheets.js';
import filterList from '../controllers/spreadsheet_controllers.js';
import db from '../modules/mongodb.js';
import luxon from '../modules/luxon.js';
import itemControllers from './item_controllers.js';

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

const scheduleMonth = async (req, res) => {
	try {
		const days = (await consultSpreadsheet(true, null, null, 'Buscador!B44:F92', 'ROWS')).data
			.values;
		const allGuards = (await consultSpreadsheet(true, null, null, `Personal!A2:F7`, 'COLUMNS'))
			.data.values;

		const pastTest = (testDate, testTime, night) => {
			let date = new Date(Date.now());
			let splittedTime = luxon.getTime().split(':');
			let dateToday = new Date(date.getFullYear(), date.getMonth(), date.getDate()).setHours(
				splittedTime[0],
				splittedTime[1],
				splittedTime[2],
				0,
			);
			let testDay = !!night ? night[0].split('/')[0] : testDate[0];
			let testMonth = !!night ? night[0].split('/')[1] : testDate[1];
			let dateToTest = new Date(testDate[2], testMonth - 1, testDay).setHours(testTime, 0, 0, 0);
			return dateToTest < dateToday ? true : false;
		};

		const schedule = days.map((day, i) => {
			let splittedDay = day[0].toString().split('/');
			return {
				date: `${splittedDay[0].padStart(2, 0)}/${splittedDay[1].padStart(2, 0)}/${
					splittedDay[2]
				}`,
				day: day[4],
				morning: {
					guardId: day[1],
					status: [],
					type: null,
					detail: [],
					past: pastTest(splittedDay, 14, null),
				},
				afternoon: {
					guardId: day[2],
					status: [],
					type: null,
					detail: [],
					past: pastTest(splittedDay, 22, null),
				},
				night: {
					guardId: day[3],
					status: [],
					type: null,
					detail: [],
					past: pastTest(splittedDay, 6, days[i + 1]),
				},
			};
		});

		schedule.splice(
			0,
			schedule.findIndex((i) => i.day === 'Lunes'),
		);

		const userChanges = await Promise.all([
			db.Change.find({
				section: req.userData.section,
			}),
			db.Affected.find({
				section: req.userData.section,
			}),
		]);

		const userSchedule = schedule.map((day) => {
			let workDay = day;
			userChanges[0].forEach((change) => {
				if (day.date === change.coverData.date) {
					if (change.coverData.guardId === day.morning.guardId) {
						workDay.morning.status.push(change.coverData.name);
						workDay.morning.type = 'change';
						workDay.morning.detail.push({
							toReplace: change.returnData.name,
							replaceWith: change.coverData.name,
						});
					}
					if (change.coverData.guardId === day.afternoon.guardId) {
						workDay.afternoon.status.push(change.coverData.name);
						workDay.afternoon.type = 'change';
						workDay.afternoon.detail.push({
							toReplace: change.returnData.name,
							replaceWith: change.coverData.name,
						});
					}
					if (change.coverData.guardId === day.night.guardId) {
						workDay.night.status.push(change.coverData.name);
						workDay.night.type = 'change';
						workDay.night.detail.push({
							toReplace: change.returnData.name,
							replaceWith: change.coverData.name,
						});
					}
				}
				if (day.date === change.returnData.date) {
					if (change.returnData.guardId === day.morning.guardId) {
						workDay.morning.status.push(change.returnData.name);
						workDay.morning.detail.push({
							toReplace: change.coverData.name,
							replaceWith: change.returnData.name,
						});
					}
					if (change.returnData.guardId === day.afternoon.guardId) {
						workDay.afternoon.status.push(change.returnData.name);
						workDay.afternoon.detail.push({
							toReplace: change.coverData.name,
							replaceWith: change.returnData.name,
						});
					}
					if (change.returnData.guardId === day.night.guardId) {
						workDay.night.status.push(change.returnData.name);
						workDay.night.detail.push({
							toReplace: change.coverData.name,
							replaceWith: change.returnData.name,
						});
					}
				}
			});
			userChanges[1].forEach((change) => {
				if (day.date === change.affectedData.date) {
					if (change.affectedData.guardId === day.morning.guardId) {
						workDay.morning.status.push(change.name);
						workDay.morning.type = 'affected';
						workDay.morning.detail.push({
							toReplace: null,
							replaceWith: change.name,
						});
					}
					if (change.affectedData.guardId === day.afternoon.guardId) {
						workDay.afternoon.status.push(change.name);
						workDay.afternoon.type = 'affected';
						workDay.afternoon.detail.push({
							toReplace: null,
							replaceWith: change.name,
						});
					}
					if (change.affectedData.guardId === day.night.guardId) {
						workDay.night.status.push(change.name);
						workDay.night.type = 'affected';
						workDay.night.detail.push({
							toReplace: null,
							replaceWith: change.name,
						});
					}
				}
				if (day.date === change.disaffectedData.date) {
					if (change.disaffectedData.guardId === day.morning.guardId) {
						workDay.morning.status.push(change.name);
						workDay.morning.detail.push({
							toReplace: change.name,
							replaceWith: null,
						});
					}
					if (change.disaffectedData.guardId === day.afternoon.guardId) {
						workDay.afternoon.status.push(change.name);
						workDay.afternoon.detail.push({
							toReplace: change.name,
							replaceWith: null,
						});
					}
					if (change.disaffectedData.guardId === day.night.guardId) {
						workDay.night.status.push(change.name);
						workDay.night.detail.push({
							toReplace: change.name,
							replaceWith: null,
						});
					}
				}
			});
			return workDay;
		});

		const shiftDetail = (guardId, replaceData) => {
			let guard;
			if (guardId === 'A') guard = [...allGuards[0]];
			if (guardId === 'B') guard = [...allGuards[1]];
			if (guardId === 'C') guard = [...allGuards[2]];
			if (guardId === 'D') guard = [...allGuards[3]];
			if (guardId === 'E') guard = [...allGuards[4]];
			if (guardId === 'F') guard = [...allGuards[5]];

			if (replaceData.length) {
				replaceData.forEach((replaceDay) => {
					if (replaceDay.toReplace && replaceDay.replaceWith) {
						guard[
							guard.indexOf(replaceDay.toReplace)
						] = `${replaceDay.replaceWith} (por ${replaceDay.toReplace})`;
					}
					if (!replaceDay.toReplace && replaceDay.replaceWith)
						guard.push(`${replaceDay.replaceWith} (afectado)`);
					if (!replaceDay.replaceWith && replaceDay.toReplace)
						guard[guard.indexOf(replaceDay.toReplace)] = `${replaceDay.toReplace} (desafectado)`;
				});
			}
			return guard;
		};

		const shiftStatus = (guardId, nameList) => {
			if (req.userData.superior) return null;
			let work = req.userData.guardId === guardId ? true : false;
			for (let name of nameList) {
				if (req.userData.fullName === name.replaceWith) work = true;
				if (req.userData.fullName === name.toReplace) work = false;
			}
			return work ? 'work' : 'off';
		};

		let splittedSchedule = [];
		const chunkSize = 7;
		for (let i = 0; userSchedule.length > i; i += chunkSize) {
			let weekSchedule = userSchedule.slice(i, i + chunkSize);
			let headersList = weekSchedule.map((day) => `${day.day} - ${day.date}`);
			let morningSchedule = weekSchedule.map((day) => {
				return {
					guardId: day.morning.guardId,
					status: shiftStatus(day.morning.guardId, day.morning.detail),
					type: day.morning.type,
					detail: shiftDetail(day.morning.guardId, day.morning.detail),
					past: day.morning.past,
				};
			});
			let afternoonSchedule = weekSchedule.map((day) => {
				return {
					guardId: day.afternoon.guardId,
					status: shiftStatus(day.afternoon.guardId, day.afternoon.detail),
					type: day.afternoon.type,
					detail: shiftDetail(day.afternoon.guardId, day.afternoon.detail),
					past: day.afternoon.past,
				};
			});
			let nightSchedule = weekSchedule.map((day) => {
				return {
					guardId: day.night.guardId,
					status: shiftStatus(day.night.guardId, day.night.detail),
					type: day.night.type,
					detail: shiftDetail(day.night.guardId, day.night.detail),
					past: day.night.past,
				};
			});
			headersList.unshift('Día / Turno');
			morningSchedule.unshift({ guardId: '06 a 14 hs.', status: 'shift' });
			afternoonSchedule.unshift({ guardId: '14 a 22 hs.', status: 'shift' });
			nightSchedule.unshift({ guardId: '22 a 06 hs.', status: 'shift' });
			splittedSchedule.push({
				headersList,
				shifts: [morningSchedule, afternoonSchedule, nightSchedule],
			});
		}

		if (splittedSchedule[splittedSchedule.length - 1].headersList.length < 7)
			splittedSchedule.pop();

		let fullSchedule = {
			headersList: ['Día / Turno', '6 a 14 hs.', '14 a 22 hs.', '22 a 6 hs.'],
			shifts: userSchedule.map((day) => {
				return {
					day: `${day.day} - ${day.date}`,
					shifts: [
						{
							guardId: day.morning.guardId,
							status: shiftStatus(day.morning.guardId, day.morning.detail),
							type: day.morning.type,
							detail: shiftDetail(day.morning.guardId, day.morning.detail),
							past: day.morning.past,
						},
						{
							guardId: day.afternoon.guardId,
							status: shiftStatus(day.afternoon.guardId, day.afternoon.detail),
							type: day.afternoon.type,
							detail: shiftDetail(day.afternoon.guardId, day.afternoon.detail),
							past: day.afternoon.past,
						},
						{
							guardId: day.night.guardId,
							status: shiftStatus(day.night.guardId, day.night.detail),
							type: day.night.type,
							detail: shiftDetail(day.night.guardId, day.night.detail),
							past: day.night.past,
						},
					],
				};
			}),
		};

		return res.send({ splittedSchedule, fullSchedule });
	} catch (error) {
		console.log(error);
		res.send({ error: 'No se pudo realizar la consulta.' });
	}
};

const search = () => {};

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

		console.log(userList);
		res.send(userList);
	} catch (error) {
		console.log(error);
		res.send({ mensaje: 'No se pudo realizar la consulta.' });
	}
};

export default {
	guardDay,
	scheduleMonth,
	guardMonthTotal,
	allUsers,
};
