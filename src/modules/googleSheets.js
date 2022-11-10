import { google } from 'googleapis';
const auth = new google.auth.GoogleAuth({
	credentials: JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT),
	scopes: 'https://www.googleapis.com/auth/spreadsheets',
});
const authClientObject = await auth.getClient();
const googleSheets = google.sheets({ version: 'v4', auth: authClientObject });
const spreadsheetId = '1_459gRYxs4I1hzn_udxInKMBYpMUWIbW4zFFH4ArHpo';

export const consultSpreadsheet = async (
	readOnly,
	writeRange,
	writeValue,
	readRange,
	readType,
) => {
	if (!readOnly) {
		googleSheets.spreadsheets.values.update({
			spreadsheetId,
			auth,
			range: writeRange,
			valueInputOption: 'USER_ENTERED',
			resource: {
				values: [[writeValue]],
			},
		});
		await new Promise((resolve) => setTimeout(resolve, 500));
	}
	const readData = googleSheets.spreadsheets.values.get({
		spreadsheetId,
		auth,
		range: readRange,
		majorDimension: readType,
	});
	return readData;
};
