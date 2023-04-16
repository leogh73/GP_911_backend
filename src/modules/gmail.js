import vars from './crypto-js.js';
import MailComposer from 'nodemailer/lib/mail-composer/index.js';
import db from './mongodb.js';
import { google } from 'googleapis';

const { client_secret, client_id, redirect_uris } = vars.OAUTH2_CREDENTIALS;
const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);

const dbOauth2 = (await db.Oauth2.find({}))[0];
oAuth2Client.setCredentials(dbOauth2.tokens);

const gmail = google.gmail({ version: 'v1', auth: oAuth2Client });

const createHtmlMessages = (item, newStatus, type) => {
	let response;
	const doNotReply = `</p><p>---------------------</p><p><b>Éste es un mensaje automático, no lo responda.<b></p>`;
	if (type === 'change') {
		let message1 = `<p>Se ha ${newStatus} su cambio de guardia con ${item.returnData.name}. `;
		let message2 = `<p>Se ha ${newStatus} su cambio de guardia con ${item.coverData.name}. `;
		if (newStatus === 'autorizado') {
			message1 =
				message1 +
				` Deberá prestar servicio el día ${item.coverData.day.toLowerCase()} ${
					item.coverData.date
				} de ${item.coverData.shift} en la guardia ${item.coverData.guardId}.`;
			message2 =
				message2 +
				` Deberá prestar servicio el día ${item.returnData.day.toLowerCase()} ${
					item.returnData.date
				} de ${item.returnData.shift} en la guardia ${item.returnData.guardId}.`;
		}
		response = [message1 + doNotReply, message2 + doNotReply];
	}
	if (type === 'affected') {
		response = [
			`<p>Se han realizado cambios en su prestación de servicio. Ha sido afectado el día ${item.affectedData.day.toLowerCase()} ${
				item.affectedData.date
			} de ${item.affectedData.shift} en la guardia ${
				item.affectedData.guardId
			}. A su vez se le ha desafectado el día ${item.disaffectedData.day.toLowerCase()} ${
				item.disaffectedData.date
			} de ${item.disaffectedData.shift} en la guardia ${item.affectedData.guardId}.` + doNotReply,
		];
	}
	return response;
};

const notifyUsers = async (item, newStatus, emailSubject, section, type) => {
	const allUsers = (await db.User.find({ section: section })).map((u) => {
		return {
			userId: u._id,
			email: u.email,
			fullName: `${u.lastName} ${u.firstName}`,
		};
	});

	const html = createHtmlMessages(item, newStatus, type);

	console.log(html);
	const index1 = allUsers.findIndex(
		(u) => u.fullName === (type === 'change' ? item.coverData.name : item.name),
	);
	const email1 = allUsers[index1].email;
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
		// to: `${email1},${email2}`,
		to: destination,
		cc: 'cc1@example.com, cc2@example.com',
		// replyTo: 'cambios911sfe@gmail.com',
		// subject: 'Confirme cambios en su perfil 🚀',
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

// let oAuth2 = dbOauth2.toObject();
// oAuth2Client.on('tokens', async (tokens) => {
// 	if (tokens.refresh_token) {
// 		dbOauth2.tokens.refresh_token = tokens.refresh_token;
// 		console.log('token refresh');
// 		await dbOauth2.save();
// 		oAuth2.tokens.refresh_token = tokens.refresh_token;
// 	}
// });

// const authUrl = oAuth2Client.generateAuthUrl({
// 	access_type: 'offline',
// 	prompt: 'consent',
// 	scope: ['https://www.googleapis.com/auth/gmail.send'],
// });
// console.log(authUrl);
// const tokens = (
// 	await oAuth2Client.getToken(
// 		'4/0AVHEtk5zYhqLsefq_n9N7-5z3iQbY3GFletEhsZi3AKZMKO0XR2Tdk2bx7AcQEBGEitmcQ',
// 	)
// ).data;
// console.log(tokens);
