import { consultSpreadsheet } from '../modules/googleSheets.js';
import db from '../modules/mongodb.js';
import luxon from '../modules/luxon.js';

const scheduleMonth = async (req, res) => {
	try {
		const { splittedSchedule, fullSchedule } = await generateSchedule(req.userData, null);
		return res.send({ splittedSchedule, fullSchedule });
	} catch (error) {
		await db.storeLog('Schedule creation', { userId: req.userData.userId, body: req.body }, error);
		console.log(error);
		res.send({ error: 'An error ocurred.' });
	}
};

const scheduleSearch = async (req, res) => {
	try {
		const { splittedSchedule, fullSchedule } = await generateSchedule(req.userData, req.body.date);
		return res.send({ splittedSchedule, fullSchedule });
	} catch (error) {
		await db.storeLog('Schedule search', { userId: req.userData.userId, body: req.body }, error);
		console.log(error);
		res.send({ error: 'An error ocurred.' });
	}
};

const allUsers = async (req, res) => {
	try {
		const consult = await consultSpreadsheet(true, null, null, 'Personal!A2:F7', 'COLUMNS');
		const userList = consult.flat().sort();
		res.send(userList);
	} catch (error) {
		await db.storeLog('Get all users', { userId: req.userData.userId, body: req.body }, error);
		console.log(error);
		res.send({ error: 'An error ocurred.' });
	}
};

const guardDay = async (req, res) => {
	const { date } = req.body;
	try {
		const consult = await consultSpreadsheet(
			false,
			'Buscador!B3',
			date,
			'Buscador!C2:F11',
			'COLUMNS',
		);
		let dayGuard = [
			{
				shift: '6 a 14 hs.',
				guardId: consult[0][1],
			},
			{
				shift: '14 a 22 hs.',
				guardId: consult[1][1],
			},
			{
				shift: '22 a 6 hs.',
				guardId: consult[2][1],
			},
		];
		res.send(dayGuard);
	} catch (error) {
		await db.storeLog('Get day guards', { userId: req.userData.userId, body: req.body }, error);
		console.log(error);
		res.send({ mensaje: 'No se pudo realizar la consulta.' });
	}
};

const generateSchedule = async (userData, date) => {
	let searchDate = date
		? consultSpreadsheet(false, 'Buscador!B137', date, 'Buscador!B115:F159', 'ROWS')
		: consultSpreadsheet(true, null, null, 'Buscador!B44:F92', 'ROWS');

	const spreadSheetData = await Promise.all([
		searchDate,
		consultSpreadsheet(true, null, null, `Personal!A2:F7`, 'COLUMNS'),
	]);

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

	const schedule = spreadSheetData[0].map((day, i) => {
		let splittedDay = day[0].toString().split('/');
		let scheduleDay = `${splittedDay[0].padStart(2, 0)}/${splittedDay[1].padStart(2, 0)}/${
			splittedDay[2]
		}`;
		return {
			date: scheduleDay,
			day: day[4],
			morning: {
				guardId: day[1],
				status: [],
				detail: [],
				past: pastTest(splittedDay, 14, null),
				selected: scheduleDay === date ? true : false,
			},
			afternoon: {
				guardId: day[2],
				status: [],
				detail: [],
				past: pastTest(splittedDay, 22, null),
				selected: scheduleDay === date ? true : false,
			},
			night: {
				guardId: day[3],
				status: [],
				detail: [],
				past: pastTest(splittedDay, 6, spreadSheetData[0][i + 1]),
				selected: scheduleDay === date ? true : false,
			},
		};
	});

	schedule.splice(
		0,
		schedule.findIndex((i) => i.day === 'Lunes'),
	);

	const userChanges = await Promise.all([
		db.Change.find({
			section: userData.section,
			$in: [{ status: 'Solicitado' }, { status: 'Aprobado' }],
		}),
		db.Affected.find({
			section: userData.section,
		}),
	]);

	console.log(userChanges[0]);

	const userSchedule = schedule.map((day) => {
		let workDay = day;
		userChanges[0].forEach((change) => {
			if (day.date === change.coverData.date) {
				let coverName = change.coverData.name;
				let itemDetail = {
					toReplace: change.returnData.name,
					replaceWith: change.coverData.name,
				};
				if (change.coverData.guardId === day.morning.guardId) {
					workDay.morning.status.push(coverName);
					workDay.morning.detail.push(itemDetail);
				}
				if (change.coverData.guardId === day.afternoon.guardId) {
					workDay.afternoon.status.push(coverName);
					workDay.afternoon.detail.push(itemDetail);
				}
				if (change.coverData.guardId === day.night.guardId) {
					workDay.night.status.push(coverName);
					workDay.night.detail.push(itemDetail);
				}
			}
			if (day.date === change.returnData.date) {
				let returnName = change.returnData.name;
				let itemDetail = {
					toReplace: change.coverData.name,
					replaceWith: change.returnData.name,
				};
				if (change.returnData.guardId === day.morning.guardId) {
					workDay.morning.status.push(returnName);
					workDay.morning.detail.push(itemDetail);
				}
				if (change.returnData.guardId === day.afternoon.guardId) {
					workDay.afternoon.status.push(returnName);
					workDay.afternoon.detail.push(itemDetail);
				}
				if (change.returnData.guardId === day.night.guardId) {
					workDay.afternoon.status.push(returnName);
					workDay.night.detail.push(itemDetail);
				}
			}
		});
		userChanges[1].forEach((change) => {
			let affectedName = change.name;
			if (day.date === change.affectedData.date) {
				let itemDetail = {
					toReplace: null,
					replaceWith: change.name,
				};
				if (change.affectedData.guardId === day.morning.guardId) {
					workDay.morning.status.push(affectedName);
					workDay.morning.detail.push(itemDetail);
				}
				if (change.affectedData.guardId === day.afternoon.guardId) {
					workDay.afternoon.status.push(affectedName);
					workDay.afternoon.detail.push(itemDetail);
				}
				if (change.affectedData.guardId === day.night.guardId) {
					workDay.night.status.push(affectedName);
					workDay.night.detail.push(itemDetail);
				}
			}
			if (day.date === change.disaffectedData.date) {
				let affectedName = change.name;
				let itemDetail = {
					toReplace: change.name,
					replaceWith: null,
				};
				if (change.disaffectedData.guardId === day.morning.guardId) {
					workDay.morning.status.push(affectedName);
					workDay.morning.detail.push(itemDetail);
				}
				if (change.disaffectedData.guardId === day.afternoon.guardId) {
					workDay.afternoon.status.push(affectedName);
					workDay.afternoon.detail.push(itemDetail);
				}
				if (change.disaffectedData.guardId === day.night.guardId) {
					workDay.night.status.push(affectedName);
					workDay.night.detail.push(itemDetail);
				}
			}
		});
		return workDay;
	});

	const shiftDetail = (guardId, replaceData) => {
		let guard;
		if (guardId === 'A') guard = [...spreadSheetData[1][0]];
		if (guardId === 'B') guard = [...spreadSheetData[1][1]];
		if (guardId === 'C') guard = [...spreadSheetData[1][2]];
		if (guardId === 'D') guard = [...spreadSheetData[1][3]];
		if (guardId === 'E') guard = [...spreadSheetData[1][4]];
		if (guardId === 'F') guard = [...spreadSheetData[1][5]];

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
		if (userData.superior) return null;
		let work = userData.guardId === guardId ? true : false;
		for (let name of nameList) {
			if (userData.fullName === name.replaceWith) work = true;
			if (userData.fullName === name.toReplace) work = false;
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
				selected: day.morning.selected,
			};
		});
		let afternoonSchedule = weekSchedule.map((day) => {
			return {
				guardId: day.afternoon.guardId,
				status: shiftStatus(day.afternoon.guardId, day.afternoon.detail),
				type: day.afternoon.type,
				detail: shiftDetail(day.afternoon.guardId, day.afternoon.detail),
				past: day.afternoon.past,
				selected: day.afternoon.selected,
			};
		});
		let nightSchedule = weekSchedule.map((day) => {
			return {
				guardId: day.night.guardId,
				status: shiftStatus(day.night.guardId, day.night.detail),
				type: day.night.type,
				detail: shiftDetail(day.night.guardId, day.night.detail),
				past: day.night.past,
				selected: day.night.selected,
			};
		});
		headersList.unshift('Día / Turno');
		morningSchedule.unshift({ guardId: '06 a 14 hs.', status: 'shift' });
		afternoonSchedule.unshift({ guardId: '14 a 22 hs.', status: 'shift' });
		nightSchedule.unshift({ guardId: '22 a 06 hs.', status: 'shift' });
		if (headersList.length === 8)
			splittedSchedule.push({
				headersList,
				shifts: [morningSchedule, afternoonSchedule, nightSchedule],
			});
	}

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
						selected: day.morning.selected,
					},
					{
						guardId: day.afternoon.guardId,
						status: shiftStatus(day.afternoon.guardId, day.afternoon.detail),
						type: day.afternoon.type,
						detail: shiftDetail(day.afternoon.guardId, day.afternoon.detail),
						past: day.afternoon.past,
						selected: day.afternoon.selected,
					},
					{
						guardId: day.night.guardId,
						status: shiftStatus(day.night.guardId, day.night.detail),
						type: day.night.type,
						detail: shiftDetail(day.night.guardId, day.night.detail),
						past: day.night.past,
						selected: day.night.selected,
					},
				],
			};
		}),
	};

	return { splittedSchedule, fullSchedule };
};

export default {
	scheduleMonth,
	scheduleSearch,
	allUsers,
	guardDay,
};
