// Simple localStorage-backed datastore for users (students and teachers)
(function(global){
  const KEYS = {
    users: 'systemUsers',
    persistentIds: 'persistentUserIds'
  };

  function _read() {
    try {
      const raw = localStorage.getItem(KEYS.users);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      console.error('Datastore read error', e);
      return [];
    }
  }

  function _write(list) {
    try {
      localStorage.setItem(KEYS.users, JSON.stringify(list));
      return true;
    } catch (e) {
      console.error('Datastore write error', e);
      return false;
    }
  }

  function _savePersistentIds(users) {
    const persistentData = users.map(user => ({
      id: user.id,
      username: user.username,
      type: user.type,
      email: user.email
    }));
    localStorage.setItem(KEYS.persistentIds, JSON.stringify(persistentData));
  }

  function _getPersistentIds() {
    try {
      const raw = localStorage.getItem(KEYS.persistentIds);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      console.error('Error reading persistent IDs', e);
      return [];
    }
  }

  function _generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substring(2,8);
  }

  const Datastore = {
    createUser(user) {
      // user: { username, type, email, name, password? }
      if (!user || !user.username || !user.type) {
        throw new Error('Invalid user object');
      }

      // Check if user already exists in persistent storage
      const persistentUsers = _getPersistentIds();
      const existingUser = persistentUsers.find(u => 
        u.username === user.username && 
        u.type === user.type
      );

      const list = _read();
      const id = existingUser ? existingUser.id : _generateId();
      const now = new Date().toISOString();
      const record = Object.assign({
        id,
        username: user.username,
        name: user.name || user.username,
        type: user.type,
        email: user.email || '',
        createdAt: now,
        updatedAt: now
      }, user);

      // Avoid storing password in plain text in production. This is a demo.
      // If a user with the same username+type already exists in the active list, return it
      const already = list.find(u => u.username === record.username && u.type === record.type);
      if (already) {
        return already;
      }

      list.push(record);
      _write(list);
      // Save an index of persistent IDs so recreated users keep the same id
      try { _savePersistentIds(list); } catch (e) { /* non-fatal */ }
      return record;
    },

    getUsers(filterFn) {
      const list = _read();
      if (typeof filterFn === 'function') return list.filter(filterFn);
      return list;
    },

    getUserById(id) {
      const list = _read();
      return list.find(u => u.id === id) || null;
    },

    updateUser(id, updates) {
      const list = _read();
      const idx = list.findIndex(u => u.id === id);
      if (idx === -1) return null;
      list[idx] = Object.assign({}, list[idx], updates, { updatedAt: new Date().toISOString() });
      _write(list);
      try { _savePersistentIds(list); } catch (e) { /* non-fatal */ }
      return list[idx];
    },

    deleteUser(id) {
      let list = _read();
      const before = list.length;
      list = list.filter(u => u.id !== id);
      if (list.length === before) return false;
      _write(list);
      try { _savePersistentIds(list); } catch (e) { /* non-fatal */ }
      return true;
    },

    clearAll() {
      _write([]);
    }
  };

  global.Datastore = Datastore;
})(window);
