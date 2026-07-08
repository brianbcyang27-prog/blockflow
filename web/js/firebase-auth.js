var FirebaseAuth = (function() {
    var auth = null;
    var currentUser = null;
    var authListeners = [];
    var BYPASS_KEY = 'blockflow_bypass_auth';

    function getBypassUser() {
        return { uid: 'local', email: null, displayName: 'Local User', photoURL: null, isAnonymous: true };
    }

    function isBypassActive() {
        return localStorage.getItem(BYPASS_KEY) === 'true';
    }

    function setBypass(active) {
        if (active) {
            localStorage.setItem(BYPASS_KEY, 'true');
            console.log('[FirebaseAuth] Local/bypass authentication mode enabled (uid: local)');
        } else {
            localStorage.removeItem(BYPASS_KEY);
        }
    }

    function notifyListeners(user) {
        currentUser = user;
        if (user) {
            console.log('[FirebaseAuth] User updated:', user.uid, '(authenticated:', !user.isAnonymous, ')');
        } else {
            console.log('[FirebaseAuth] User signed out');
        }
        authListeners.forEach(function(cb) { cb(user); });
    }

    return {
        init: function() {
            if (isBypassActive()) {
                console.log('[FirebaseAuth] Initializing with bypass mode already active');
                notifyListeners(getBypassUser());
                return true;
            }
            FirebaseApp.init();
            if (typeof firebase === 'undefined' || !firebase.auth) {
                console.warn('[FirebaseAuth] Firebase Auth SDK not loaded — falling back to local mode');
                notifyListeners(getBypassUser());
                setBypass(true);
                return true;
            }
            console.log('[FirebaseAuth] Initializing with Firebase SDK');
            auth = firebase.auth();
            auth.onAuthStateChanged(function(user) {
                if (user) {
                    console.log('[FirebaseAuth] Firebase user authenticated:', user.uid);
                    localStorage.setItem('blockflow_auth_user', JSON.stringify({
                        uid: user.uid,
                        email: user.email,
                        displayName: user.displayName,
                        photoURL: user.photoURL
                    }));
                    notifyListeners(user);
                } else {
                    console.log('[FirebaseAuth] No Firebase user - checking for stored user');
                    var stored = localStorage.getItem('blockflow_auth_user');
                    if (stored) {
                        try { 
                            notifyListeners(JSON.parse(stored));
                        } catch(e) {
                            console.error('[FirebaseAuth] Failed to parse stored user:', e);
                            notifyListeners(null);
                        }
                    } else {
                        notifyListeners(null);
                    }
                }
            });
            var stored = localStorage.getItem('blockflow_auth_user');
            if (stored && !currentUser) {
                try { currentUser = JSON.parse(stored); } catch(e) {}
            }
            return true;
        },

        onAuthChange: function(callback) {
            authListeners.push(callback);
            if (currentUser) callback(currentUser);
            return function() {
                var idx = authListeners.indexOf(callback);
                if (idx > -1) authListeners.splice(idx, 1);
            };
        },

        signIn: async function() {
            if (isBypassActive()) {
                console.log('[FirebaseAuth] SignIn: using bypass mode');
                return { success: true, user: currentUser };
            }
            if (!auth) {
                console.log('[FirebaseAuth] SignIn: no auth available, enabling bypass mode');
                notifyListeners(getBypassUser());
                setBypass(true);
                return { success: true, user: currentUser };
            }
            try {
                console.log('[FirebaseAuth] SignIn: initiating Google popup');
                var provider = new firebase.auth.GoogleAuthProvider();
                var result = await auth.signInWithPopup(provider);
                console.log('[FirebaseAuth] SignIn: successful -', result.user.uid);
                localStorage.setItem('blockflow_auth_user', JSON.stringify({
                    uid: result.user.uid,
                    email: result.user.email,
                    displayName: result.user.displayName,
                    photoURL: result.user.photoURL
                }));
                return { success: true, user: result.user };
            } catch (error) {
                console.error('[FirebaseAuth] Sign-in error:', error.message);
                return { success: false, error: error.message };
            }
        },

        signOut: async function() {
            if (isBypassActive()) {
                setBypass(false);
                notifyListeners(null);
                return { success: true };
            }
            try {
                console.log('[FirebaseAuth] Signing out from Firebase');
                await auth.signOut();
                currentUser = null;
                localStorage.removeItem('blockflow_auth_user');
                localStorage.removeItem(BYPASS_KEY);
                notifyListeners(null);
                return { success: true };
            } catch (error) {
                console.error('[FirebaseAuth] Sign-out error:', error);
                return { success: false, error: error.message };
            }
        },

        skipSignIn: function() {
            console.log('[FirebaseAuth] User skipped sign-in, enabling bypass mode');
            setBypass(true);
            notifyListeners(getBypassUser());
        },

        getUser: function() { return currentUser; },
        isSignedIn: function() {
            if (isBypassActive()) return true;
            return currentUser !== null && !currentUser.isAnonymous;
        },
        getUserId: function() { return currentUser ? currentUser.uid : null; },
        getUserEmail: function() { return currentUser ? currentUser.email : null; },
        getUserName: function() { return currentUser ? currentUser.displayName : null; },
        getUserPhoto: function() { return currentUser ? currentUser.photoURL : null; }
    };
})();
