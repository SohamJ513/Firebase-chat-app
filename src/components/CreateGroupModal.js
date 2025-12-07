// src/components/CreateGroupModal.js
import React, { useState } from 'react';
import { ref, push, set } from 'firebase/database';
import { database } from '../firebase';
import './CreateGroupModal.css';

const CreateGroupModal = ({ users, currentUser, onClose }) => {
  const [groupName, setGroupName] = useState('');
  const [groupDescription, setGroupDescription] = useState('');
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [creatingGroup, setCreatingGroup] = useState(false);

  // Create group
  const createGroup = async () => {
    if (!groupName.trim() || selectedMembers.length === 0 || creatingGroup) return;

    setCreatingGroup(true);
    try {
      const groupsRef = ref(database, 'groups');
      const newGroupRef = push(groupsRef);
      
      const members = selectedMembers.reduce((acc, memberId) => {
        acc[memberId] = {
          joinedAt: Date.now(),
          role: 'member'
        };
        return acc;
      }, {});
      
      // Add creator as admin
      members[currentUser.uid] = {
        joinedAt: Date.now(),
        role: 'admin'
      };

      const groupData = {
        id: newGroupRef.key,
        name: groupName.trim(),
        description: groupDescription.trim() || '',
        createdBy: currentUser.uid,
        createdAt: Date.now(),
        members: members,
        memberCount: Object.keys(members).length,
        lastActivity: Date.now(),
        lastMessage: '',
        avatar: null
      };

      await set(newGroupRef, groupData);
      
      // Reset form
      setGroupName('');
      setGroupDescription('');
      setSelectedMembers([]);
      onClose();
    } catch (error) {
      console.error('Error creating group:', error);
    } finally {
      setCreatingGroup(false);
    }
  };

  // Toggle member selection
  const toggleMemberSelection = (memberId) => {
    setSelectedMembers(prev => 
      prev.includes(memberId) 
        ? prev.filter(id => id !== memberId)
        : [...prev, memberId]
    );
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h2 className="modal-title">Create New Group</h2>
          <button 
            className="modal-close-btn"
            onClick={() => {
              onClose();
              setGroupName('');
              setGroupDescription('');
              setSelectedMembers([]);
            }}
          >
            ✕
          </button>
        </div>

        <div className="form-group">
          <label className="form-label">Group Name *</label>
          <input
            type="text"
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            placeholder="Enter group name"
            className="form-input"
            maxLength={50}
          />
        </div>

        <div className="form-group">
          <label className="form-label">Description (Optional)</label>
          <textarea
            value={groupDescription}
            onChange={(e) => setGroupDescription(e.target.value)}
            placeholder="What's this group about?"
            className="form-textarea"
            maxLength={200}
          />
        </div>

        <div className="form-group">
          <label className="form-label">Add Members * (Select at least one)</label>
          <div className="members-selection">
            {Object.entries(users).map(([uid, userData]) => (
              <div 
                key={uid}
                className="member-option"
                onClick={() => toggleMemberSelection(uid)}
              >
                <input
                  type="checkbox"
                  checked={selectedMembers.includes(uid)}
                  onChange={() => toggleMemberSelection(uid)}
                  className="member-checkbox"
                />
                <div className="member-info">
                  <div className="member-avatar">
                    {userData.photoURL ? (
                      <img 
                        src={userData.photoURL} 
                        alt={userData.displayName || userData.email}
                      />
                    ) : (
                      (userData.displayName || userData.email).charAt(0).toUpperCase()
                    )}
                  </div>
                  <div className="member-details">
                    <div className="member-name">{userData.displayName || 'User'}</div>
                    <div className="member-email">{userData.email}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="modal-actions">
          <button 
            className="btn-secondary"
            onClick={() => {
              onClose();
              setGroupName('');
              setGroupDescription('');
              setSelectedMembers([]);
            }}
          >
            Cancel
          </button>
          <button 
            className="btn-primary"
            onClick={createGroup}
            disabled={!groupName.trim() || selectedMembers.length === 0 || creatingGroup}
          >
            {creatingGroup ? 'Creating...' : 'Create Group'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreateGroupModal;