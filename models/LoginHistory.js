module.exports = (sequelize, DataTypes) => {
    const LoginHistory = sequelize.define('LoginHistory', {
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
        location: {
            type: DataTypes.STRING(255),
            allowNull: true,
            field: 'location'
        },
        status: {
            type: DataTypes.ENUM('Success', 'Failed', 'Logout', 'Force Logout'),
            allowNull: false,
            defaultValue: 'Success',
            field: 'status'
        },
        failure_reason: {
            type: DataTypes.TEXT,
            allowNull: true,
            field: 'failure_reason'
        },
        login_time: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.NOW,
            field: 'login_time'
        }
    }, {
        tableName: 'login_history',
        timestamps: false
    });

    LoginHistory.associate = (models) => {
        LoginHistory.belongsTo(models.User, {
            foreignKey: 'employee_code',
            targetKey: 'employee_code',
            as: 'user'
        });
    };

    return LoginHistory;
};