// src/components/Sidebar.js
import React, { useState } from 'react';
import './Sidebar.css'; // Using same CSS file

const Sidebar = ({
  users,
  groups,
  selectedUser,
  selectedGroup,
  onSelectUser,
  onSelectGroup,
  onShowCreateGroup,
  currentUser
}) => {
  const [activeTab, setActiveTab] = useState('users');

  const formatLastSeen = (lastSeen) => {
    if (!lastSeen) return 'Never';
    const date = new Date(lastSeen);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <h3>Chats</h3>
        <button 
          className="create-group-btn"
          onClick={onShowCreateGroup}
        >
          + New Group
        </button>
      </div>
      
      <div className="chat-tabs">
        <button 
          className={`chat-tab ${activeTab === 'users' ? 'active' : ''}`}
          onClick={() => setActiveTab('users')}
        >
          Direct
        </button>
        <button 
          className={`chat-tab ${activeTab === 'groups' ? 'active' : ''}`}
          onClick={() => setActiveTab('groups')}
        >
          Groups
        </button>
      </div>

      <div className="users-list">
        {activeTab === 'users' ? (
          Object.keys(users).length === 0 ? (
            <p>No other users online</p>
          ) : (
            Object.entries(users).map(([uid, userData]) => (
              <div
                key={uid}
                className={`user-item ${selectedUser?.uid === uid ? 'selected' : ''}`}
                onClick={() => onSelectUser(userData)}
              >
                <div className="user-avatar">
                  <div className="user-avatar-circle">
                    {userData.photoURL ? (
                      <img 
                        src={userData.photoURL} 
                        alt={userData.displayName || userData.email}
                      />
                    ) : (
                      (userData.displayName || userData.email).charAt(0).toUpperCase()
                    )}
                  </div>
                  <div className={`user-status-indicator ${userData.online ? 'online' : 'offline'}`}></div>
                </div>
                <div className="user-info">
                  <div className="user-name">{userData.displayName || userData.email}</div>
                  <div className="user-status">
                    {userData.online ? 'Online' : `Last seen ${formatLastSeen(userData.lastSeen)}`}
                  </div>
                </div>
              </div>
            ))
          )
        ) : (
          Object.keys(groups).length === 0 ? (
            <p>No groups yet. Create one to get started!</p>
          ) : (
            Object.entries(groups).map(([groupId, groupData]) => (
              <div
                key={groupId}
                className={`group-item ${selectedGroup?.id === groupId ? 'selected' : ''}`}
                onClick={() => onSelectGroup(groupData)}
              >
                <div className="group-avatar">
                  <div className="group-avatar-circle">
                    {groupData.avatar ? (
                      <img 
                        src={groupData.avatar} 
                        alt={groupData.name}
                      />
                    ) : (
                      groupData.name.charAt(0).toUpperCase()
                    )}
                  </div>
                </div>
                <div className="group-info">
                  <div className="group-name">{groupData.name}</div>
                  <div className="group-members-count">
                    {groupData.memberCount} member{groupData.memberCount !== 1 ? 's' : ''}
                  </div>
                </div>
              </div>
            ))
          )
        )}
      </div>
    </div>
  );
};

export default Sidebar;

