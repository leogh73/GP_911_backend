import CryptoJS from 'crypto-js';

// let vars = {};
// let encryptedData = CryptoJS.AES.encrypt(
// 	JSON.stringify(vars),
// 	process.env.SERVICE_ENCRYPTION_KEY,
// ).toString();

const encrypted =
	'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';

let bytes = CryptoJS.AES.decrypt(encrypted, process.env.SERVICE_ENCRYPTION_KEY);
let decryptedData = JSON.parse(bytes.toString(CryptoJS.enc.Utf8));
// console.log(decryptedData);

export default decryptedData;
