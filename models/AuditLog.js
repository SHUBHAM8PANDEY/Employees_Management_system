module.exports = (sequelize, DataTypes) => {
    const AuditLog = sequelize.define('AuditLog', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        employee_code: {
            type: DataTypes.STRING(100),
            allowNull: true,
            field: 'employee_code'
        },
        action: {
            type: DataTypes.STRING(100),
            allowNull: false,
            field: 'action'
        },
        entity_type: {
            type: DataTypes.STRING(50),
            allowNull: false,
            field: 'entity_type'
        },
        entity_id: {
            type: DataTypes.STRING(100),
            allowNull: true,
            field: 'entity_id'
        },
        old_data: {
            type: DataTypes.TEXT,
            allowNull: true,
            field: 'old_data'
        },
        new_data: {
            type: DataTypes.TEXT,
            allowNull: true,
            field: 'new_data'
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
        status: {
            type: DataTypes.STRING(20),
            allowNull: true,
            defaultValue: 'Success',
            field: 'status'
        },
        error_message: {
            type: DataTypes.TEXT,
            allowNull: true,
            field: 'error_message'
        },
        created_at: {
            type: DataTypes.DATE,
            allowNull: true,
            defaultValue: DataTypes.NOW,
            field: 'created_at'
        }
    }, {
        tableName: 'audit_logs',
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: false
    });

    AuditLog.associate = (models) => {
        AuditLog.belongsTo(models.Employee, {
            foreignKey: 'employee_code',
            targetKey: 'employee_code',
            as: 'employee'
        });
    };

    return AuditLog;
};