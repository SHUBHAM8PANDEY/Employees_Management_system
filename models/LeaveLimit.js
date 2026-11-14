module.exports = (sequelize, DataTypes) => {
    const LeaveLimit = sequelize.define('LeaveLimit', {
        employee_code: {
            type: DataTypes.STRING(100),
            primaryKey: true,
            allowNull: false,
            field: 'employee_code'
        },
        sick_limit: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 12,
            field: 'sick_limit'
        },
        sick_taken: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 0,
            field: 'sick_taken'
        },
        casual_limit: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 15,
            field: 'casual_limit'
        },
        casual_taken: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 0,
            field: 'casual_taken'
        },
        paid_limit: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 10,
            field: 'paid_limit'
        },
        paid_taken: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 0,
            field: 'paid_taken'
        }
    }, {
        tableName: 'leave_limits',
        timestamps: false
    });

    LeaveLimit.associate = (models) => {
        LeaveLimit.belongsTo(models.Employee, {
            foreignKey: 'employee_code',
            targetKey: 'employee_code',
            as: 'employee'
        });
    };

    return LeaveLimit;
};