import { API_BASE } from '../config';
import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import Avatar from './Avatar';
import styles from './UserMenu.module.css';



const UserMenu = ({ role }) => {
    const navigate = useNavigate();
    const fileRef = useRef(null);
    const menuRef = useRef(null);

    const [open, setOpen] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [profilePicture, setProfilePicture] = useState(localStorage.getItem('profile_picture') || '');

    const firstName = localStorage.getItem('first_name') || '';
    const lastName = localStorage.getItem('last_name') || '';
    const email = localStorage.getItem('email') || '';

    useEffect(() => {
        const onProfileUpdate = () => {
            setProfilePicture(localStorage.getItem('profile_picture') || '');
        };
        window.addEventListener('profile-updated', onProfileUpdate);
        return () => window.removeEventListener('profile-updated', onProfileUpdate);
    }, []);

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (menuRef.current && !menuRef.current.contains(e.target)) {
                setOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleAvatarUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.size > 2 * 1024 * 1024) {
            alert('Image must be under 2MB');
            return;
        }

        const reader = new FileReader();
        reader.onload = async () => {
            setUploading(true);
            try {
                const token = localStorage.getItem('token');
                const res = await axios.put(
                    `${API_BASE}/api/auth/profile/avatar`,
                    { profile_picture: reader.result },
                    { headers: { Authorization: `Bearer ${token}` } }
                );
                const pic = res.data.profile_picture;
                setProfilePicture(pic);
                localStorage.setItem('profile_picture', pic || '');
                window.dispatchEvent(new Event('profile-updated'));
            } catch (err) {
                alert(err.response?.data?.error || 'Failed to upload photo');
            }
            setUploading(false);
        };
        reader.readAsDataURL(file);
        e.target.value = '';
    };

    const handleLogout = () => {
        localStorage.clear();
        navigate('/');
        window.location.reload();
    };

    const roleLabel = role === 'Admin' ? 'Administrator' : role === 'HR' ? 'HR Manager' : 'Employee';

    return (
        <div className={styles.userMenu} ref={menuRef}>
            <button
                type="button"
                className={styles.avatarBtn}
                onClick={() => setOpen(!open)}
                aria-label="User menu"
            >
                <Avatar
                    src={profilePicture}
                    firstName={firstName}
                    lastName={lastName}
                    size="md"
                    showStatus
                    isOnline
                />
            </button>

            {open && (
                <div className={styles.dropdown}>
                    <div className={styles.profileHeader}>
                        <Avatar
                            src={profilePicture}
                            firstName={firstName}
                            lastName={lastName}
                            size="xl"
                        />
                        <div className={styles.profileInfo}>
                            <strong>{firstName} {lastName}</strong>
                            <span>{email}</span>
                            <span className={styles.roleTag}>{roleLabel}</span>
                        </div>
                    </div>

                    <div className={styles.menuActions}>
                        <button
                            type="button"
                            className={styles.menuItem}
                            onClick={() => fileRef.current?.click()}
                            disabled={uploading}
                        >
                            {uploading ? 'Uploading...' : 'Change photo'}
                        </button>
                        <input
                            ref={fileRef}
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            hidden
                            onChange={handleAvatarUpload}
                        />
                        <button type="button" className={styles.menuItemDanger} onClick={handleLogout}>
                            Sign out
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default UserMenu;
