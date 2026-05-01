const Firebase = {
config: {
apiKey: "AIzaSyA5fBcpGbR90FzBja5elSq9wMMG3GZBQ7Q",
authDomain: "blockflow-28d39.firebaseapp.com",
projectId: "blockflow-28d39",
storageBucket: "blockflow-28d39.firebasestorage.app",
messagingSenderId: "255025772243",
appId: "1:255025772243:web:a8bdf98440b67b34ef8626",
measurementId: "G-XKQSEZJB5J"
},
auth: null,
user: null,
listeners: [],

init() {
if (typeof firebase === 'undefined') {
console.error('Firebase SDK not loaded');
return false;
}
firebase.initializeApp(this.config);
this.auth = firebase.auth();
this.setupAuthStateListener();
return true;
},

setupAuthStateListener() {
this.auth.onAuthStateChanged((user) => {
this.user = user;
this.notifyListeners(user);
});
},

onAuthChange(callback) {
this.listeners.push(callback);
if (this.user !== null) {
callback(this.user);
}
},

notifyListeners(user) {
this.listeners.forEach(cb => cb(user));
},

async signIn() {
if (this.config.apiKey === 'YOUR_API_KEY' || !this.config.apiKey || this.config.apiKey.startsWith('YOUR_')) {
alert('Firebase is not configured yet.\n\nTo enable Google Sign-In:\n1. Go to Firebase Console\n2. Create a project\n3. Add a Web app\n4. Copy the config to js/firebase.js');
return { success: false, error: 'Firebase not configured' };
}
try {
const provider = new firebase.auth.GoogleAuthProvider();
provider.addScope('https://www.googleapis.com/auth/calendar.readonly');
provider.addScope('https://www.googleapis.com/auth/calendar.events');
const result = await this.auth.signInWithPopup(provider);
this.user = result.user;
return { success: true, user: result.user };
} catch (error) {
console.error('Sign-in error:', error);
return { success: false, error: error.message };
}
},

async signOut() {
try {
await this.auth.signOut();
this.user = null;
return { success: true };
} catch (error) {
console.error('Sign-out error:', error);
return { success: false, error: error.message };
}
},

async getIdToken() {
if (!this.user) {
return null;
}
try {
return await this.user.getIdToken();
} catch (error) {
console.error('Token error:', error);
return null;
}
},

isSignedIn() {
return this.user !== null;
},

getUserEmail() {
return this.user ? this.user.email : null;
},

getUserName() {
return this.user ? this.user.displayName : null;
},

getUserPhoto() {
return this.user ? this.user.photoURL : null;
}
};

window.Firebase = Firebase;