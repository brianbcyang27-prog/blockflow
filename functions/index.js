const functions = require('firebase-functions');
const admin = require('firebase-admin');
const { google } = require('googleapis');

admin.initializeApp();

const CALENDAR_SCOPES = [
'https://www.googleapis.com/auth/calendar.readonly',
'https://www.googleapis.com/auth/calendar.events'
];

async function getGoogleOAuthTokenForUser(userId) {
const userRecord = await admin.auth().getUser(userId);
const providerData = userRecord.providerData.find(p => p.providerId === 'google.com');

if (!providerData) {
throw new functions.https.HttpsError('unauthenticated', 'No Google account linked');
}

const oauthAccessToken = providerData.oauthAccessToken;
const oauthRefreshToken = providerData.oauthToken;

if (!oauthAccessToken && !oauthRefreshToken) {
throw new functions.https.HttpsError('unauthenticated', 'Google account not properly linked');
}

if (oauthRefreshToken && (!oauthAccessToken || isTokenExpiringSoon(oauthAccessToken))) {
const oauth2Client = new google.auth.OAuth2(
functions.config().google.client_id,
functions.config().google.client_secret
);
oauth2Client.setCredentials({
refresh_token: oauthRefreshToken
});
const { credentials } = await oauth2Client.refreshAccessToken();
return credentials.access_token;
}

return oauthAccessToken;
}

function isTokenExpiringSoon(token) {
try {
const base64Url = token.split('.')[1];
const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
const decoded = JSON.parse(Buffer.from(base64, 'base64'));
const expiry = decoded.exp;
return Date.now() / 1000 > expiry - 300;
} catch {
return true;
}
}

async function verifyToken(idToken) {
const decodedToken = await admin.auth().verifyIdToken(idToken);
return decodedToken;
}

exports.calendarEvents = functions.https.onCall(async (data, context) => {
if (!context.auth) {
throw new functions.https.HttpsError('unauthenticated', 'User must be signed in');
}

const timeMin = data.timeMin || new Date().toISOString();
const timeMax = data.timeMax || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

try {
const accessToken = await getGoogleOAuthTokenForUser(context.auth.uid);

const oauth2Client = new google.auth.OAuth2();
oauth2Client.setCredentials({ access_token: accessToken });

const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

const response = await calendar.events.list({
calendarId: 'primary',
timeMin: timeMin,
timeMax: timeMax,
singleEvents: true,
orderBy: 'startTime',
maxResults: 250
});

return {
items: response.data.items || [],
kind: response.data.kind
};
} catch (error) {
console.error('Calendar API error:', error);

if (error.code === 401 || error.code === 403) {
throw new functions.https.HttpsError('unauthenticated', 'Google account access expired. Please sign out and sign in again.');
}

throw new functions.https.HttpsError('internal', 'Failed to fetch calendar events: ' + error.message);
}
});

exports.refreshCalendarToken = functions.https.onCall(async (data, context) => {
if (!context.auth) {
throw new functions.https.HttpsError('unauthenticated', 'User must be signed in');
}

try {
const accessToken = await getGoogleOAuthTokenForUser(context.auth.uid);
return { accessToken };
} catch (error) {
console.error('Token refresh error:', error);
throw new functions.https.HttpsError('internal', 'Failed to refresh token: ' + error.message);
}
});