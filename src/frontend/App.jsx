import React, { useState, useEffect } from 'react';

function getAuthHeaders() {
  const headers = { 'Content-Type': 'application/json' };
  const savedUser = localStorage.getItem('studycircle_user');
  if (savedUser) {
    try {
      const userObj = JSON.parse(savedUser);
      if (userObj && userObj.id) {
        headers['x-user-id'] = String(userObj.id);
        headers['x-session-id'] = `user-session-${userObj.id}`;
      }
    } catch (e) {}
  }
  return headers;
}

export default function App() {
  const [user, setUser] = useState(null);
  const [currentScreen, setCurrentScreen] = useState('groups'); // 'groups', 'login', 'create-group', 'group-details', 'my-groups', 'profile'
  const [selectedGroupId, setSelectedGroupId] = useState(null);

  // Check initial user from localStorage if any
  useEffect(() => {
    const savedUser = localStorage.getItem('studycircle_user');
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch (e) {
        localStorage.removeItem('studycircle_user');
      }
    }
  }, []);

  const handleLogin = (userData) => {
    setUser(userData);
    localStorage.setItem('studycircle_user', JSON.stringify(userData));
    setCurrentScreen('groups');
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST', headers: getAuthHeaders() });
    } catch (err) {
      console.error(err);
    }
    setUser(null);
    localStorage.removeItem('studycircle_user');
    setCurrentScreen('login');
  };

  return (
    <div>
      <header>
        <h1><a href="#groups" onClick={(e) => { e.preventDefault(); setCurrentScreen('groups'); }} style={{ color: 'inherit', textDecoration: 'none' }}>StudyCircle</a></h1>
        <nav>
          <button onClick={() => setCurrentScreen('groups')}>Browse Groups</button>
          {user ? (
            <>
              <button onClick={() => setCurrentScreen('create-group')}>Create Group</button>
              <button onClick={() => setCurrentScreen('my-groups')}>My Groups</button>
              <button onClick={() => setCurrentScreen('profile')}>Profile ({user.email})</button>
              <button onClick={handleLogout}>Sign Out</button>
            </>
          ) : (
            <button onClick={() => setCurrentScreen('login')}>Sign In / Register</button>
          )}
        </nav>
      </header>
      <main className="container">
        {currentScreen === 'login' && <LoginScreen onLogin={handleLogin} />}
        {currentScreen === 'groups' && <GroupsListScreen user={user} onSelectGroup={(id) => { setSelectedGroupId(id); setCurrentScreen('group-details'); }} />}
        {currentScreen === 'group-details' && <GroupDetailsScreen groupId={selectedGroupId} user={user} onBack={() => setCurrentScreen('groups')} />}
        {currentScreen === 'create-group' && <CreateGroupScreen user={user} onCreated={() => setCurrentScreen('groups')} />}
        {currentScreen === 'my-groups' && <MyGroupsScreen user={user} onSelectGroup={(id) => { setSelectedGroupId(id); setCurrentScreen('group-details'); }} />}
        {currentScreen === 'profile' && <ProfileScreen user={user} onUserUpdate={(updated) => setUser(updated)} />}
      </main>
    </div>
  );
}

function LoginScreen({ onLogin }) {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    const endpoint = isRegister ? '/api/auth/register' : '/api/auth/login';
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Authentication failed');
      }

      if (isRegister) {
        setSuccess('Registration successful! You can now sign in.');
        setIsRegister(false);
      } else {
        onLogin(data.user);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError('');
    setLoading(true);
    try {
      // Use mock token for test/dev
      const mockToken = 'mock_token_google_123_' + (email || 'googleuser@example.com');
      const res = await fetch('/api/auth/google', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ idToken: mockToken })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Google sign-in failed');
      }
      onLogin(data.user);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '400px', margin: '2rem auto' }}>
      <div className="card">
        <h2>{isRegister ? 'Create an Account' : 'Sign In'}</h2>
        {error && <div className="alert-error">{error}</div>}
        {success && <div className="alert-success">{success}</div>}
        <form onSubmit={handleSubmit}>
          <label htmlFor="email">Email Address</label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="student@university.edu"
          />

          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            placeholder="••••••••"
          />

          <button type="submit" disabled={loading} style={{ width: '100%', marginBottom: '1rem' }}>
            {loading ? 'Processing...' : (isRegister ? 'Register' : 'Sign In')}
          </button>
        </form>

        <button
          onClick={handleGoogleSignIn}
          disabled={loading}
          style={{ width: '100%', background: '#ea4335', marginBottom: '1rem' }}
        >
          Sign in with Google
        </button>

        <p style={{ textAlign: 'center', marginTop: '1rem' }}>
          {isRegister ? 'Already have an account?' : "Don't have an account?"}{' '}
          <button
            type="button"
            onClick={() => { setIsRegister(!isRegister); setError(''); setSuccess(''); }}
            style={{ background: 'none', color: 'var(--primary-color)', padding: 0, minHeight: 'auto', minWidth: 'auto', display: 'inline' }}
          >
            {isRegister ? 'Sign In' : 'Register'}
          </button>
        </p>
      </div>
    </div>
  );
}

function GroupsListScreen({ user, onSelectGroup }) {
  const [groups, setGroups] = useState([]);
  const [subject, setSubject] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchGroups = async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (subject) params.append('subject', subject);
      if (search) params.append('search', search);

      const res = await fetch(`/api/groups?${params.toString()}`, { headers: getAuthHeaders() });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load groups');
      setGroups(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGroups();
  }, [subject]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchGroups();
  };

  return (
    <div>
      <h2>Study Groups</h2>
      <div className="card" style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: '1rem', flex: 1, flexWrap: 'wrap', margin: 0 }}>
          <div style={{ flex: 1, minWidth: '200px', margin: 0 }}>
            <label htmlFor="search">Search groups</label>
            <input
              id="search"
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Title or subject keyword..."
              style={{ margin: 0 }}
            />
          </div>
          <div style={{ width: '200px', margin: 0 }}>
            <label htmlFor="subject-filter">Filter by Subject</label>
            <select
              id="subject-filter"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              style={{ margin: 0, height: '44px' }}
            >
              <option value="">All Subjects</option>
              <option value="Computer Science">Computer Science</option>
              <option value="Mathematics">Mathematics</option>
              <option value="Physics">Physics</option>
              <option value="Chemistry">Chemistry</option>
              <option value="Biology">Biology</option>
            </select>
          </div>
          <button type="submit">Search</button>
        </form>
      </div>

      {error && <div className="alert-error">{error}</div>}

      {loading ? (
        <div className="loading">Loading study groups...</div>
      ) : groups.length === 0 ? (
        <div className="empty-state">
          <h3>No study groups found</h3>
          <p>Try adjusting your search filters or create a new study group.</p>
        </div>
      ) : (
        <div className="grid">
          {groups.map((group) => (
            <div key={group.id} className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', background: '#eff6ff', color: 'var(--primary-color)', padding: '0.25rem 0.5rem', borderRadius: '0.25rem', fontWeight: 600 }}>
                  {group.subject}
                </span>
                <h3 style={{ margin: '0.5rem 0' }}>{group.title}</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>{group.description || 'No description provided.'}</p>
              </div>
              <div style={{ marginTop: '1rem', borderTop: '1px solid var(--border-color)', paddingTop: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.875rem' }}>
                  Members: <strong>{group.member_count}</strong> / {group.capacity}
                </span>
                <button onClick={() => onSelectGroup(group.id)}>View Details</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function GroupDetailsScreen({ groupId, user, onBack }) {
  const [group, setGroup] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetchGroup = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/groups/${groupId}`, { headers: getAuthHeaders() });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load group details');
      setGroup(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGroup();
  }, [groupId]);

  const handleJoin = async () => {
    setError('');
    setSuccess('');
    try {
      const res = await fetch(`/api/groups/${groupId}/join`, {
        method: 'POST',
        headers: getAuthHeaders()
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to join group');
      setSuccess('Successfully joined the study group!');
      fetchGroup();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleLeave = async () => {
    setError('');
    setSuccess('');
    try {
      const res = await fetch(`/api/groups/${groupId}/leave`, {
        method: 'POST',
        headers: getAuthHeaders()
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to leave group');
      setSuccess('Successfully left the study group.');
      fetchGroup();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to permanently delete this study group?')) {
      return;
    }
    setError('');
    setSuccess('');
    try {
      const res = await fetch(`/api/groups/${groupId}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });
      const text = await res.text();
      let data = {};
      if (text) {
        try {
          data = JSON.parse(text);
        } catch (e) {
          data = { error: text };
        }
      }
      if (!res.ok) throw new Error(data.error || res.statusText || 'Failed to delete group');
      onBack();
    } catch (err) {
      setError(err.message);
    }
  };

  if (loading) return <div className="loading">Loading group details...</div>;
  if (error && !group) return <div><button onClick={onBack}>&larr; Back</button><div className="alert-error" style={{ marginTop: '1rem' }}>{error}</div></div>;
  if (!group) return <div className="empty-state">Group not found.</div>;

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      <button onClick={onBack} style={{ marginBottom: '1rem', background: 'none', color: 'var(--primary-color)' }}>&larr; Back to Groups</button>
      <div className="card">
        {error && <div className="alert-error">{error}</div>}
        {success && <div className="alert-success">{success}</div>}

        <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', background: '#eff6ff', color: 'var(--primary-color)', padding: '0.25rem 0.5rem', borderRadius: '0.25rem', fontWeight: 600 }}>
          {group.subject}
        </span>
        <h2 style={{ marginTop: '0.5rem' }}>{group.title}</h2>
        <p><strong>Owner:</strong> {group.owner_email}</p>
        <p><strong>Capacity:</strong> {group.member_count} / {group.capacity} members</p>
        <div style={{ margin: '1.5rem 0' }}>
          <h4>Description</h4>
          <p>{group.description || 'No description provided.'}</p>
        </div>

        {user ? (
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            {group.owner_id === user.id && (
              <button onClick={handleDelete} style={{ background: '#dc2626' }}>Delete Group</button>
            )}
            {group.isMember ? (
              <button onClick={handleLeave} style={{ background: '#dc2626' }}>Leave Group</button>
            ) : (
              <button onClick={handleJoin}>Join Group</button>
            )}
          </div>
        ) : (
          <p style={{ color: 'var(--text-muted)' }}>Please sign in to join or leave study groups.</p>
        )}
      </div>
    </div>
  );
}

function CreateGroupScreen({ user, onCreated }) {
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState('Computer Science');
  const [description, setDescription] = useState('');
  const [capacity, setCapacity] = useState(10);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/groups', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ title, subject, description, capacity: Number(capacity) })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create group');
      onCreated();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto' }}>
      <div className="card">
        <h2>Create a Study Group</h2>
        {error && <div className="alert-error">{error}</div>}
        <form onSubmit={handleSubmit}>
          <label htmlFor="title">Group Title</label>
          <input
            id="title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            placeholder="e.g., Advanced Algorithms Study Circle"
          />

          <label htmlFor="subject">Subject / Course</label>
          <select
            id="subject"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
          >
            <option value="Computer Science">Computer Science</option>
            <option value="Mathematics">Mathematics</option>
            <option value="Physics">Physics</option>
            <option value="Chemistry">Chemistry</option>
            <option value="Biology">Biology</option>
          </select>

          <label htmlFor="capacity">Maximum Capacity</label>
          <input
            id="capacity"
            type="number"
            min="1"
            max="100"
            value={capacity}
            onChange={(e) => setCapacity(e.target.value)}
            required
          />

          <label htmlFor="description">Description</label>
          <textarea
            id="description"
            rows="4"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What will you study? When and where will you meet?"
          />

          <button type="submit" disabled={loading} style={{ width: '100%' }}>
            {loading ? 'Creating...' : 'Create Study Group'}
          </button>
        </form>
      </div>
    </div>
  );
}

function MyGroupsScreen({ user, onSelectGroup }) {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchMyGroups = async () => {
      setLoading(true);
      setError('');
      try {
        const res = await fetch('/api/groups?mine=true', { headers: getAuthHeaders() });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to load groups');
        setGroups(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchMyGroups();
  }, [user]);

  return (
    <div>
      <h2>My Study Groups</h2>
      {error && <div className="alert-error">{error}</div>}
      {loading ? (
        <div className="loading">Loading your groups...</div>
      ) : groups.length === 0 ? (
        <div className="empty-state">
          <h3>You have no groups yet</h3>
          <p>Create a study group or join an existing one from the browse list.</p>
        </div>
      ) : (
        <div className="grid">
          {groups.map((group) => (
            <div key={group.id} className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', background: '#eff6ff', color: 'var(--primary-color)', padding: '0.25rem 0.5rem', borderRadius: '0.25rem', fontWeight: 600 }}>
                  {group.subject}
                </span>
                <h3 style={{ margin: '0.5rem 0' }}>{group.title}</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>{group.description || 'No description provided.'}</p>
              </div>
              <div style={{ marginTop: '1rem', borderTop: '1px solid var(--border-color)', paddingTop: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.875rem' }}>
                  Members: <strong>{group.member_count}</strong> / {group.capacity}
                </span>
                <button onClick={() => onSelectGroup(group.id)}>View Details</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ProfileScreen({ user, onUserUpdate }) {
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLinkGoogle = async () => {
    setError('');
    setMessage('');
    setLoading(true);
    try {
      const mockToken = 'mock_token_google_123_' + user.email;
      const res = await fetch('/api/auth/link-google', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ idToken: mockToken })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to link Google account');
      setMessage(data.message || 'Google account linked successfully');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto' }}>
      <div className="card">
        <h2>User Profile</h2>
        {error && <div className="alert-error">{error}</div>}
        {message && <div className="alert-success">{message}</div>}
        <p><strong>Email:</strong> {user?.email}</p>
        <p><strong>User ID:</strong> {user?.id}</p>

        <div style={{ marginTop: '2rem' }}>
          <h3>Linked Accounts</h3>
          <p style={{ color: 'var(--text-muted)' }}>Enhance your sign-in options by linking your Google account.</p>
          <button onClick={handleLinkGoogle} disabled={loading} style={{ background: '#ea4335' }}>
            {loading ? 'Linking...' : 'Link Google Account'}
          </button>
        </div>
      </div>
    </div>
  );
}
