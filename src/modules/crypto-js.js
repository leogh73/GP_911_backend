import CryptoJS from 'crypto-js';
import { encrypted } from '../../env-var-enc.js';

// let encryptedData = CryptoJS.AES.encrypt(
// 	JSON.stringify(vars),
// 	process.env.SERVICE_ENCRYPTION_KEY,
// ).toString();

let bytes = CryptoJS.AES.decrypt(encrypted, process.env.SERVICE_ENCRYPTION_KEY);
let decryptedData = JSON.parse(bytes.toString(CryptoJS.enc.Utf8));

export default decryptedData;
