module.exports = (sequelize, DataTypes) => {
    const UserSession = sequelize.define('UserSession', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        employee_code: {
            type: DataTypes.STRING(100),
            allowNull: false,
            field: 'employee_code'
        },
        token: {
            type: DataTypes.TEXT,
            allowNull: false,
            field: 'token'
        },
        ip_address: {
            type: DataTypes.STRING(45),
            allowNull: true,
            field: 'ip_address'
        },
        user_agent: {
            type: DataTypes.TEXT,
            allowNull: true,
            field: 'user_agent'
        },
        login_time: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.NOW,
            field: 'login_time'
        },
        last_activity: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.NOW,
            field: 'last_activity'
        },
        is_active: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: true,
            field: 'is_active'
        },
        logout_time: {
            type: DataTypes.DATE,
            allowNull: true,
            field: 'logout_time'
        }
    }, {
        tableName: 'user_sessions',
        timestamps: false
    });

    UserSession.associate = (models) => {
        UserSession.belongsTo(models.User, {
            foreignKey: 'employee_code',
            targetKey: 'employee_code',
            as: 'user'
        });
    };

    return UserSession;
};