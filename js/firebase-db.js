var FirebaseDB = (function() {
    var db = null;
    var ready = false;

    function getUserId() {
        var user = FirebaseAuth.getUser();
        return user ? user.uid : null;
    }

    // Check if user is properly authenticated with Firestore
    function isUserAuthenticated() {
        var uid = getUserId();
        if (!uid) {
            return false;
        }
        return true;
    }

    return {
        init: function() {
            FirebaseApp.init();
            if (typeof firebase === 'undefined' || !firebase.firestore) {
                return false;
            }
            db = firebase.firestore();
            db.settings({ merge: true });
            ready = true;
            return true;
        },

        isReady: function() { return ready && FirebaseAuth.isSignedIn(); },

        getEvents: async function() {
            if (!isUserAuthenticated()) {
                return null;
            }
            var uid = getUserId();
            if (!uid) return null;
            try {
                var snap = await db.collection('users').doc(uid)
                    .collection('events').orderBy('createdAt', 'asc').get();
                var events = [];
                snap.forEach(function(doc) {
                    var d = doc.data();
                    d.id = doc.id;
                    events.push(d);
                });
                return events;
            } catch(e) {
                if (e.code === 'permission-denied') {
                }
                return null;
            }
        },

        saveEvent: async function(event) {
            if (!isUserAuthenticated()) {
                return false;
            }
            var uid = getUserId();
            if (!uid) return false;
            try {
                if (event.id) {
                    await db.collection('users').doc(uid)
                        .collection('events').doc(event.id).set(event, { merge: true });
                } else {
                    var ref = await db.collection('users').doc(uid)
                        .collection('events').add(event);
                    return ref.id;
                }
                return true;
            } catch(e) {
                if (e.code === 'permission-denied') {
                }
                return false;
            }
        },

        deleteEvent: async function(eventId) {
            if (!isUserAuthenticated()) {
                return false;
            }
            var uid = getUserId();
            if (!uid || !eventId) return false;
            try {
                await db.collection('users').doc(uid)
                    .collection('events').doc(eventId).delete();
                return true;
            } catch(e) {
                if (e.code === 'permission-denied') {
                }
                return false;
            }
        },

        getHistory: async function() {
            if (!isUserAuthenticated()) {
                return null;
            }
            var uid = getUserId();
            if (!uid) return null;
            try {
                var doc = await db.collection('users').doc(uid)
                    .collection('data').doc('history').get();
                return doc.exists ? doc.data().records || [] : [];
            } catch(e) {
                if (e.code === 'permission-denied') {
                }
                return null;
            }
        },

        saveHistory: async function(records) {
            if (!isUserAuthenticated()) {
                return false;
            }
            var uid = getUserId();
            if (!uid) return false;
            try {
                await db.collection('users').doc(uid)
                    .collection('data').doc('history').set({ records: records });
                return true;
            } catch(e) {
                if (e.code === 'permission-denied') {
                }
                return false;
            }
        },

        getSettings: async function() {
            if (!isUserAuthenticated()) {
                return null;
            }
            var uid = getUserId();
            if (!uid) return null;
            try {
                var doc = await db.collection('users').doc(uid)
                    .collection('data').doc('settings').get();
                return doc.exists ? doc.data() : null;
            } catch(e) {
                if (e.code === 'permission-denied') {
                }
                return null;
            }
        },

        saveSettings: async function(settings) {
            if (!isUserAuthenticated()) {
                return false;
            }
            var uid = getUserId();
            if (!uid) return false;
            try {
                await db.collection('users').doc(uid)
                    .collection('data').doc('settings').set(settings, { merge: true });
                return true;
            } catch(e) {
                if (e.code === 'permission-denied') {
                }
                return false;
            }
        },

        getAiHistory: async function() {
            if (!isUserAuthenticated()) return null;
            var uid = getUserId();
            if (!uid) return null;
            try {
                var doc = await db.collection('users').doc(uid)
                    .collection('data').doc('aiHistory').get();
                return doc.exists ? doc.data().messages || [] : [];
            } catch(e) {
                return null;
            }
        },

        saveAiHistory: async function(messages) {
            if (!isUserAuthenticated()) return false;
            var uid = getUserId();
            if (!uid) return false;
            try {
                await db.collection('users').doc(uid)
                    .collection('data').doc('aiHistory').set({ messages: messages });
                return true;
            } catch(e) {
                return false;
            }
        },

        getAiMemory: async function() {
            if (!isUserAuthenticated()) return null;
            var uid = getUserId();
            if (!uid) return null;
            try {
                var doc = await db.collection('users').doc(uid)
                    .collection('data').doc('aiMemory').get();
                return doc.exists ? doc.data().memoryPoints || [] : [];
            } catch(e) {
                return null;
            }
        },

        saveAiMemory: async function(memoryPoints) {
            if (!isUserAuthenticated()) return false;
            var uid = getUserId();
            if (!uid) return false;
            try {
                await db.collection('users').doc(uid)
                    .collection('data').doc('aiMemory').set({ memoryPoints: memoryPoints });
                return true;
            } catch(e) {
                return false;
            }
        },

        getMigrationStatus: async function() {
            if (!isUserAuthenticated()) return null;
            var uid = getUserId();
            if (!uid) return null;
            try {
                var doc = await db.collection('users').doc(uid)
                    .collection('metadata').doc('migration').get();
                return doc.exists ? doc.data() : null;
            } catch(e) {
                return null;
            }
        },

        setMigrationComplete: async function(version) {
            if (!isUserAuthenticated()) return false;
            var uid = getUserId();
            if (!uid) return false;
            try {
                await db.collection('users').doc(uid)
                    .collection('metadata').doc('migration').set({
                        completed: true,
                        version: version,
                        completedAt: new Date().toISOString()
                    });
                return true;
            } catch(e) {
                return false;
            }
        }
    };
})();
