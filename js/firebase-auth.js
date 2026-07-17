var FirebaseAuth = (function() {
    var auth = null;
    var currentUser = null;
    var authListeners = [];
    var BYPASS_KEY = 'blockflow_bypass_auth';
    var authReady = false;

    function getBypassUser() {
        return { uid: 'local', email: null, displayName: 'Local User', photoURL: null, isAnonymous: true };
    }

    function isBypassActive() {
        return localStorage.getItem(BYPASS_KEY) === 'true';
    }

    function setBypass(active) {
        if (active) {
            localStorage.setItem(BYPASS_KEY, 'true');
        } else {
            localStorage.removeItem(BYPASS_KEY);
        }
    }

    function notifyListeners(user) {
        currentUser = user;
        authReady = true;
        authListeners.forEach(function(cb) { cb(user); });
    }

    return {
        init: function() {
            FirebaseApp.init();
            if (typeof firebase === 'undefined' || !firebase.auth) {
                notifyListeners(getBypassUser());
                setBypass(true);
                return true;
            }
            auth = firebase.auth();
            if (isBypassActive()) {
                notifyListeners(getBypassUser());
                return true;
            }
            auth.onAuthStateChanged(function(user) {
                if (user) {
                    localStorage.setItem('blockflow_auth_user', JSON.stringify({
                        uid: user.uid,
                        email: user.email,
                        displayName: user.displayName,
                        photoURL: user.photoURL
                    }));
                    notifyListeners(user);
                } else {
                    var stored = localStorage.getItem('blockflow_auth_user');
                    if (stored) {
                        try {
                            notifyListeners(JSON.parse(stored));
                        } catch(e) {
                            notifyListeners(null);
                        }
                    } else {
                        notifyListeners(null);
                    }
                }
            });
            return true;
        },

        onAuthChange: function(callback) {
            authListeners.push(callback);
            if (authReady) callback(currentUser);
            return function() {
                var idx = authListeners.indexOf(callback);
                if (idx > -1) authListeners.splice(idx, 1);
            };
        },

        signIn: async function() {
            if (isBypassActive()) {
                return { success: true, user: currentUser };
            }
            if (!auth) {
                return { success: false, error: 'Firebase SDK not loaded' };
            }
            try {
                var provider = new firebase.auth.GoogleAuthProvider();
                var result = await auth.signInWithPopup(provider);
                localStorage.setItem('blockflow_auth_user', JSON.stringify({
                    uid: result.user.uid,
                    email: result.user.email,
                    displayName: result.user.displayName,
                    photoURL: result.user.photoURL
                }));
                return { success: true, user: result.user };
            } catch (error) {
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
                await auth.signOut();
                currentUser = null;
                localStorage.removeItem('blockflow_auth_user');
                localStorage.removeItem(BYPASS_KEY);
                notifyListeners(null);
                return { success: true };
            } catch (error) {
                return { success: false, error: error.message };
            }
        },

        skipSignIn: function() {
            setBypass(true);
            notifyListeners(getBypassUser());
        },

        getUser: function() { return currentUser; },
        isSignedIn: function() {
            if (isBypassActive()) return true;
            return currentUser !== null && !currentUser.isAnonymous;
        },
        isBypassMode: function() { return isBypassActive(); },
        getUserId: function() { return currentUser ? currentUser.uid : null; },
        getUserEmail: function() { return currentUser ? currentUser.email : null; },
        getUserName: function() { return currentUser ? currentUser.displayName : null; },
        getUserPhoto: function() { return currentUser ? currentUser.photoURL : null; }
    };
})();
