// src/components/ChatPage.js
import React, { useState, useEffect } from 'react';
import { 
  ref, 
  onValue, 
  onDisconnect,
  serverTimestamp,
  set  // ADDED THIS IMPORT
} from 'firebase/database';
import { database } from '../firebase';
import Sidebar from './Sidebar';
import ChatArea from './ChatArea';
import CreateGroupModal from './CreateGroupModal';
import './ChatPage.css';

const ChatPage = ({ user }) => {
  const [users, setUsers] = useState({});
  const [groups, setGroups] = useState({});
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false);

  // Set user online status
  useEffect(() => {
    if (user) {
      const userRef = ref(database, `users/${user.uid}`);
      const userStatusRef = ref(database, `users/${user.uid}/online`);
      
      set(userRef, {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName || user.email,
        photoURL: user.photoURL || null,
        online: true,
        lastSeen: serverTimestamp()
      }).catch((error) => {
        console.error('Error setting user status:', error);
      });

      onDisconnect(userStatusRef).set(false);
      onDisconnect(ref(database, `users/${user.uid}/lastSeen`)).set(serverTimestamp());

      return () => {
        set(userStatusRef, false).catch(console.error);
      };
    }
  }, [user]);

  // Listen to all users
  useEffect(() => {
    const usersRef = ref(database, 'users');
    const unsubscribe = onValue(usersRef, (snapshot) => {
      const usersData = snapshot.val() || {};
      const otherUsers = Object.keys(usersData)
        .filter(uid => uid !== user.uid)
        .reduce((obj, uid) => {
          obj[uid] = usersData[uid];
          return obj;
        }, {});
      setUsers(otherUsers);
    });

    return () => unsubscribe();
  }, [user.uid]);

  // Listen to groups where user is a member
  useEffect(() => {
    const groupsRef = ref(database, 'groups');
    const unsubscribe = onValue(groupsRef, (snapshot) => {
      const groupsData = snapshot.val() || {};
      const userGroups = Object.keys(groupsData)
        .filter(groupId => {
          const group = groupsData[groupId];
          return group.members && group.members[user.uid];
        })
        .reduce((obj, groupId) => {
          obj[groupId] = groupsData[groupId];
          return obj;
        }, {});
      setGroups(userGroups);
    });

    return () => unsubscribe();
  }, [user.uid]);

  const handleUserSelect = (selectedUserData) => {
    setSelectedUser(selectedUserData);
    setSelectedGroup(null);
  };

  const handleGroupSelect = (selectedGroupData) => {
    setSelectedGroup(selectedGroupData);
    setSelectedUser(null);
  };

  return (
    <div className="chat-page">
      <Sidebar
        users={users}
        groups={groups}
        selectedUser={selectedUser}
        selectedGroup={selectedGroup}
        onSelectUser={handleUserSelect}
        onSelectGroup={handleGroupSelect}
        onShowCreateGroup={() => setShowCreateGroupModal(true)}
        currentUser={user}
      />
      
      <ChatArea
        selectedUser={selectedUser}
        selectedGroup={selectedGroup}
        currentUser={user}
      />
      
      {showCreateGroupModal && (
        <CreateGroupModal
          users={users}
          currentUser={user}
          onClose={() => setShowCreateGroupModal(false)}
        />
      )}
    </div>
  );
};

export default ChatPage;
