module.exports = (sequelize, DataTypes) => {
    const Notification = sequelize.define('Notification', {
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
        type: {
            type: DataTypes.STRING(50),
            allowNull: false,
            field: 'type'
        },
        title: {
            type: DataTypes.STRING(255),
            allowNull: false,
            field: 'title'
        },
        message: {
            type: DataTypes.TEXT,
            allowNull: false,
            field: 'message'
        },
        link: {
            type: DataTypes.STRING(255),
            allowNull: true,
            field: 'link'
        },
        is_read: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false,
            field: 'is_read'
        },
        read_at: {
            type: DataTypes.DATE,
            allowNull: true,
            field: 'read_at'
        },
        icon: {
            type: DataTypes.STRING(50),
            allowNull: true,
            defaultValue: '🔔',
            field: 'icon'
        },
        color: {
            type: DataTypes.STRING(20),
            allowNull: true,
            defaultValue: 'blue',
            field: 'color'
        }
    }, {
        tableName: 'notifications',
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: false
    });

    Notification.associate = (models) => {
        Notification.belongsTo(models.Employee, {
            foreignKey: 'employee_code',
            targetKey: 'employee_code',
            as: 'employee'
        });
    };

    return Notification;
};