import React from 'react';
import styles from './Avatar.module.css';

const Avatar = ({
    src,
    firstName = '',
    lastName = '',
    size = 'md',
    isOnline,
    showStatus = false,
    className = ''
}) => {
    const initials = `${firstName?.charAt(0) || ''}${lastName?.charAt(0) || ''}`.toUpperCase() || 'U';

    return (
        <div className={`${styles.avatarWrap} ${styles[size]} ${className}`}>
            {src ? (
                <img src={src} alt={`${firstName} ${lastName}`} className={styles.avatarImg} />
            ) : (
                <div className={styles.avatarFallback}>{initials}</div>
            )}
            {showStatus && (
                <span
                    className={`${styles.statusDot} ${isOnline ? styles.statusOnline : styles.statusOffline}`}
                />
            )}
        </div>
    );
};

export default Avatar;
