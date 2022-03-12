/**
 * Example of how to use the batch-trigger-script.js
 * This script could be triggered by a cron job or a mydevices webhook
 * 
 * Steps of execution:
 * 
 * 1. Authenticate User with the auth server and store JWT Token for subsequent requests
 * 2. Get a list of all the companies/locations the user has access to
 * 3. Get a list of all the devices per locations the user has access to
 * 4. Perform Trigger Actions on the devices
 * 
 */

 const { Client, fetch } = require('undici');

 const Username = process.env.USERNAME || 'username';
 const Password = process.env.PASSWORD || 'password';
 const ClientID = process.env.CLIENT_ID || 'client_id';
 const ClientSecret = process.env.CLIENT_ID || 'client_secret';
 const TenantID = process.env.TENANT_ID || 'RealmID-Or-TenantID';
 
 const AuthPath = process.env.AUTH_URL || `/auth/${tenant}/iotinabox/protocol/openid-connect/token`;
 const ApiURL = process.env.API_URL || 'https://iotinabox-api.mydevices.com';
 
 let accessToken = null;
 
 /**
  * This function will authenticate the user and return the access token
  * @returns {string} accessToken
  */
 const getAccessToken = async () => {
   const client = new Client('https://auth.mydevices.com');
   const {statusCode, body} = await client.request({
     path: AuthPath,
     method: 'POST',
     headers: {
       'content-type': 'application/json',
     },
     body: JSON.stringify({
       'grant_type': 'password',
       'client_id': ClientID,
       'client_secret': ClientSecret,
       'username': Username,
       'password': Password,
     }),
   });
 
   if (statusCode !== 200) {
     throw new Error(`Authentication failed with status code ${statusCode}`);
   }
 
   return body;
 }
 
 /**
  * This function will return all companies users has access to
  * @returns {array} companies
  */
 const getCompanies = async () => {
   const response = await fetch(`${ApiURL}/companies`, {
      headers: { Authorization: `Bearer ${accessToken}` } 
     });
 
   return response;
 }
 
 /**
  * 
  * @param {string} companyId Company ID
  * @returns 
  */
 const getLocations = async (companyId) => {
   const response = await fetch(`${ApiURL}/companies/${companyId}/locations`, {
      headers: { Authorization: `Bearer ${accessToken}` } 
     });
 
   return response;
 }
 
 /**
  * 
  * @param {string} companyId Company ID
  * @param {string} locationId Location ID
  * @returns 
  */
 const getDevices = async (companyId, locationId) => {
   const response = await fetch(`${ApiURL}/companies/${companyId}/locations/${locationId}/things`, {
     headers: { Authorization: `Bearer ${accessToken}` } 
    });
 
  return response;
 }
 
 /**
  * 
  * @param {string} companyId Company ID
  * @param {string} locationId Location ID
  * @param {string} deviceId  Device ID
  * @param {number} channel digital or analog output channel
  * @param {integer} value 0 or 1 
  */
 const triggerAction = async (companyId, locationId, deviceId, channel, value) => {
   const response = await fetch(`${ApiURL}/companies/${companyId}/locations/${locationId}/things/${deviceId}/cmd`, {
     headers: { Authorization: `Bearer ${accessToken}` },
     body: {
       "channel": channel,
       "value": value
     }
   });
 }
 
 
 const main = async () => {
   // 1. Authenticate User with the auth server and store JWT Token for subsequent requests
   accessToken = await getAccessToken();
 
   // 2. Get a list of all the companies/locations the user has access to
   const companies = await getCompanies();
 
   // 3. Get a list of all the devices per locations the user has access to
   for (const company of companies) {
     const locations = await getLocations(company.id);
     for (const location of locations) {
       const devices = await getDevices(company.id, location.id);
       for (const device of devices) {
         // 4. Perform Trigger Actions on on channel 3 and set swtich to 1
         await triggerAction(company.id, location.id, device.id, 3, 1);
 
          // 4. Perform Trigger Actions on on channel 3 and set swtich to 1
         // await triggerAction(company.id, location.id, device.id, 3, 0);
       }
     }
   }
 }
 
 // Start the execution
 main();