import vars from './crypto-js.js';
import MailComposer from 'nodemailer/lib/mail-composer/index.js';
import db from './mongodb.js';
import { google } from 'googleapis';

const { client_secret, client_id, redirect_uris } = vars.OAUTH2_CREDENTIALS;
const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);

const dbOauth2 = (await db.Oauth2.find({}))[0];
oAuth2Client.setCredentials(dbOauth2.tokens);

const gmail = google.gmail({ version: 'v1', auth: oAuth2Client });

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

	return await Promise.all(sendMessages);
};

const sendMail = async (subject, destination, html) => {
	const options = {
		from: 'Cambios de Guardia 911<guardias911sfe@gmail.com>',
		to: destination,
		cc: 'cc1@example.com, cc2@example.com',
		subject,
		text: 'This email is sent from the command line',
		html,
		textEncoding: 'base64',
		headers: [
			{ key: 'X-Application-Developer', value: 'Leonardo Cuevas' },
			{ key: 'X-Application-Version', value: 'v1.0.0.2' },
		],
	};

	const createMail = async (options) => {
		const mailComposer = new MailComposer(options);
		const message = await mailComposer.compile().build();
		return Buffer.from(message)
			.toString('base64')
			.replace(/\+/g, '-')
			.replace(/\//g, '_')
			.replace(/=+$/, '');
	};

	const rawMessage = await createMail(options);

	const { data: { id } = {} } = await gmail.users.messages.send({
		userId: 'me',
		resource: {
			raw: rawMessage,
		},
	});

	return id;
};

export default notifyUsers;
