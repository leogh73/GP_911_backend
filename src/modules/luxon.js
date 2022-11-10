import { DateTime } from 'luxon';

const dateToday = () => DateTime.now().setZone('America/Buenos_Aires');

const getDate = () => {
	const { year, month, day } = dateToday().c;
	return `${day.toString().padStart(2, 0)}/${month.toString().padStart(2, 0)}/${year}`;
};

const getTime = () => {
	const { hour, minute, second } = dateToday().c;
	return `${hour.toString().padStart(2, 0)}:${minute.toString().padStart(2, 0)}:${second
		.toString()
		.padStart(2, 0)}`;
};

const errorMessage = () => {
	return {
		error: 'Ha ocurrido un error. Reintente más tarde',
		date: getDate(),
		time: getTime(),
	};
};

const timeStamp = (message) => {
	return { date: getDate(), time: getTime(), message };
};

export default { getDate, getTime, timeStamp, errorMessage };
