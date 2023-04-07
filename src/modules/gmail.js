import vars from './crypto-js.js';
import MailComposer from 'nodemailer/lib/mail-composer/index.js';
import db from './mongodb.js';
import { google } from 'googleapis';

const { client_secret, client_id, redirect_uris } = vars.OAUTH2_CREDENTIALS;
const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);

const dbOauth2 = (await db.Oauth2.find({}))[0];
oAuth2Client.setCredentials(dbOauth2.tokens);

const gmail = google.gmail({ version: 'v1', auth: oAuth2Client });

const sendMail = async (emails, subject, html) => {
	const options = {
		from: 'Cambios de Guardia 911<guardias911sfe@gmail.com>',
		to: 'leocuevas73@gmail.com',
		cc: 'cc1@example.com, cc2@example.com',
		// replyTo: 'cambios911sfe@gmail.com',
		subject: 'Confirme cambios en su perfil 🚀',
		text: 'This email is sent from the command line',
		html: `<p>🙋🏻‍♀️  &mdash; This is a <b>test email</b> from <a href="https://digitalinspiration.com">Digital Inspiration</a>.</p>`,
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

export default sendMail;

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
