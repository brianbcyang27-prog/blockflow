// Firebase initialization — loads config from Firebase project
const FirebaseApp = (function() {
    const config = {
        apiKey: "AIzaSyA5fBcpGbR90FzBja5elSq9wMMG3GZBQ7Q",
        authDomain: "blockflow-28d39.firebaseapp.com",
        projectId: "blockflow-28d39",
        storageBucket: "blockflow-28d39.firebasestorage.app",
        messagingSenderId: "255025772243",
        appId: "1:255025772243:web:a8bdf98440b67b34ef8626",
        measurementId: "G-XKQSEZJB5J"
    };

    let app = null;
    let initialized = false;

    return {
        init() {
            if (initialized) return true;
            if (typeof firebase === 'undefined') {
                /* Firebase SDK not loaded yet — will init on first use */
                return false;
            }
            if (!firebase.apps.length) {
                app = firebase.initializeApp(config);
            } else {
                app = firebase.app();
            }
            initialized = true;
            return true;
        },

        getApp() {
            if (!initialized) this.init();
            return app || firebase.app();
        },

        isInitialized() {
            return initialized || firebase.apps.length > 0;
        }
    };
})();
