import nodemailer from 'nodemailer';
import db from '../modules/mongodb.js';
import vars from './crypto-js.js';

const transporter = nodemailer.createTransport({
	service: 'gmail',
	host: 'smtp.gmail.com',
	port: 587,
	secure: false,
	auth: {
		user: vars.EMAIL_USER,
		pass: vars.EMAIL_PASSWORD,
	},
});

const htmlMessage = (main, urlText, urlLink) => {
	let base = `<p style="font-size: 18px">${main}</p>`;
	let url = `<p><a style="font-size: 18px" href="${urlLink}">${urlText}</a></p>`;
	let footer = `<p>---------------------------------</p>
	<b>Éste es un mensaje automático, no lo responda.</b>`;
	let mainMessage = !!urlText && !!urlLink ? base + url : base;
	return mainMessage + footer;
};

const createHtmlMessages = (item, newStatus, type) => {
	let response;
	if (type === 'change') {
		let message1 = `Se ha ${newStatus.toLowerCase()} su cambio de guardia con ${
			item.returnData.name
		}. `;
		let message2 = `Se ha ${newStatus.toLowerCase()} su cambio de guardia con ${
			item.coverData.name
		}. `;
		if (newStatus === 'Autorizado') {
			message1 =
				message1 +
				`Deberá prestar servicio el día ${item.coverData.day.toLowerCase()} ${
					item.coverData.date
				} de ${item.coverData.shift} en la guardia ${item.coverData.guardId}.`;
			message2 =
				message2 +
				`Deberá prestar servicio el día ${item.returnData.day.toLowerCase()} ${
					item.returnData.date
				} de ${item.returnData.shift} en la guardia ${item.returnData.guardId}.`;
		}
		response = [htmlMessage(message1), htmlMessage(message2)];
	}
	if (type === 'affected') {
		let baseMessage = newStatus
			? 'Se han realizado cambios en su prestación de servicio. '
			: 'Se ha cancelado un cambio en la prestación de su servicio. ';
		let message =
			baseMessage +
			`${
				newStatus ? 'Ha sido' : 'Había sido'
			} afectado el día ${item.affectedData.day.toLowerCase()} ${item.affectedData.date} de ${
				item.affectedData.shift
			} en la guardia ${item.affectedData.guardId}. A su vez ${
				newStatus ? 'ha sido' : 'había sido'
			} desafectado el día ${item.disaffectedData.day.toLowerCase()} ${
				item.disaffectedData.date
			} de ${item.disaffectedData.shift} en la guardia ${item.affectedData.guardId}.`;
		response = [htmlMessage(message)];
	}
	if (type === 'profile-edit') {
		response = [
			htmlMessage(
				'Ha solicitado cambios en la información de su perfil.',
				'Haga click aquí para confirmarlos',
				newStatus,
			),
		];
	}
	if (type === 'forgot-password') {
		response = [
			htmlMessage(
				'Ha solicitado la recuperación de su contraseña.',
				'Haga click aquí y siga las instrucciones',
				newStatus,
			),
		];
	}
	return response;
};

const sendMail = async (subject, destination, html) => {
	const mailDetails = {
		from: `Cambios de Guardia 911<${vars.EMAIL_USER}>`,
		to: destination,
		subject,
		html,
	};
	await transporter.sendMail(mailDetails);
};

const notifyUsers = async (item, newStatus, emailSubject, section, type) => {
	const allUsers = (
		!!section ? await db.User.find({ section: section }) : await db.User.find({})
	).map((u) => {
		return {
			userId: u._id,
			email: u.email,
			fullName: `${u.lastName} ${u.firstName}`,
		};
	});

	const html = createHtmlMessages(item, newStatus, type);

	const index1 = allUsers.findIndex(
		(u) => u.fullName === (type === 'change' ? item.coverData.name : item.name),
	);
	const email1 = index1 !== -1 ? allUsers[index1].email : item;
	let sendMessages = [sendMail(emailSubject, email1, html[0])];

	if (type === 'change') {
		const index2 = allUsers.findIndex((u) => u.fullName === item.returnData.name);
		const email2 = allUsers[index2].email;
		sendMessages.push(sendMail(emailSubject, email2, html[1]));
	}

	try {
		await Promise.all(sendMessages);
	} catch (error) {
		console.log(error);
		await db.storeLog('Send emails', item, error);
		return { message: 'Emails not sended', error: error.toString() };
	}
};

export default notifyUsers;
