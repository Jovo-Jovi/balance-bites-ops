/**
 * Drop-in CloudStore for the wrapped HTML apps (Phase 1).
 * Load after Firebase modular SDK is initialized as window.__bbFirebase = { auth, db }.
 *
 * Store.set writes localStorage immediately, then Firestore. Failures toast — they do not silent-fail.
 * On hydrate, Firestore wins when a doc exists; empty localStorage never overwrites the cloud.
 */
(function (root) {
  var TENANT = "balance-bites";
  var pending = {};
  var firstSnap = {};

  function toast(msg) {
    if (typeof root.bbToast === "function") root.bbToast(msg);
    else if (typeof root.toast === "function") root.toast(msg);
    else console.error("[CloudStore]", msg);
  }

  function db() {
    if (!root.__bbFirebase || !root.__bbFirebase.db) {
      throw new Error("Firebase is not ready");
    }
    return root.__bbFirebase.db;
  }

  function uid() {
    var u = root.__bbFirebase && root.__bbFirebase.auth && root.__bbFirebase.auth.currentUser;
    if (!u) throw new Error("Not signed in");
    return u.uid;
  }

  function keyRef(key) {
    return root.firebaseDoc(db(), "tenants", TENANT, "keys", key);
  }

  function writeId() {
    return (root.crypto && root.crypto.randomUUID)
      ? root.crypto.randomUUID()
      : "w_" + Date.now() + "_" + Math.random().toString(36).slice(2);
  }

  var CloudStore = {
    get: function (k, def) {
      try {
        var v = localStorage.getItem(k);
        return v ? JSON.parse(v) : def;
      } catch (e) {
        return def;
      }
    },
    set: function (k, v) {
      try {
        localStorage.setItem(k, JSON.stringify(v));
      } catch (e) {
        toast("فشل الحفظ المحلي: " + (e && e.message ? e.message : e));
        throw e;
      }
      return CloudStore.persist(k, v);
    },
    persist: function (k, v) {
      var fs = root.__bbFs;
      if (!fs) {
        toast("Firebase غير جاهز — الحفظ محلي فقط");
        return Promise.resolve();
      }
      var id = writeId();
      pending[id] = true;
      return fs
        .setDoc(keyRef(k), {
          data: v,
          updatedAt: fs.serverTimestamp(),
          updatedBy: uid(),
          clientWriteId: id,
        })
        .catch(function (err) {
          delete pending[id];
          toast("فشل الحفظ في السحابة: " + (err && err.message ? err.message : err));
          throw err;
        });
    },
    hydrate: function (keys) {
      var fs = root.__bbFs;
      if (!fs) return Promise.reject(new Error("Firebase not ready"));
      return Promise.all(
        (keys || []).map(function (key) {
          return fs.getDoc(keyRef(key)).then(function (snap) {
            if (snap.exists()) {
              var payload = snap.data();
              localStorage.setItem(key, JSON.stringify(payload.data));
            }
          });
        })
      );
    },
    watch: function (key) {
      var fs = root.__bbFs;
      if (!fs) return function () {};
      return fs.onSnapshot(keyRef(key), function (snap) {
        if (!snap.exists()) {
          firstSnap[key] = true;
          return;
        }
        var payload = snap.data();
        if (payload.clientWriteId && pending[payload.clientWriteId]) {
          delete pending[payload.clientWriteId];
          localStorage.setItem(key, JSON.stringify(payload.data));
          firstSnap[key] = true;
          return;
        }
        localStorage.setItem(key, JSON.stringify(payload.data));
        if (firstSnap[key]) toast("تم تحديث " + key + " من جهاز آخر");
        firstSnap[key] = true;
      });
    },
  };

  root.CloudStore = CloudStore;
  root.Store = {
    get: CloudStore.get,
    set: function (k, v) {
      CloudStore.set(k, v);
    },
    remove: function (k) {
      try {
        localStorage.removeItem(k);
      } catch (e) {}
    },
  };
})(typeof window !== "undefined" ? window : globalThis);
