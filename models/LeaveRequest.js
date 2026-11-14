module.exports = (sequelize, DataTypes) => {
    const LeaveRequest = sequelize.define('LeaveRequest', {
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
        leave_type: {
            type: DataTypes.STRING,
            allowNull: false,
            field: 'leave_type'
        },
        start_date: {
            type: DataTypes.DATEONLY,
            allowNull: false,
            field: 'start_date'
        },
        end_date: {
            type: DataTypes.DATEONLY,
            allowNull: false,
            field: 'end_date'
        },
        days: {
            type: DataTypes.INTEGER,
            allowNull: true,
            defaultValue: 1,
            field: 'days'
        },
        reason: {
            type: DataTypes.TEXT,
            allowNull: false,
            field: 'reason'
        },
        status: {
            type: DataTypes.STRING,
            defaultValue: 'Pending',
            field: 'status'
        },
        applied_at: {
            type: DataTypes.DATE,
            allowNull: true,
            defaultValue: DataTypes.NOW,
            field: 'applied_at'
        },
        approved_by: {
            type: DataTypes.STRING(100),
            allowNull: true,
            field: 'approved_by'
        },
        approved_at: {
            type: DataTypes.DATE,
            allowNull: true,
            field: 'approved_at'
        },
        comments: {
            type: DataTypes.TEXT,
            allowNull: true,
            field: 'comments'
        }
    }, {
        tableName: 'leaverequests',
        timestamps: false
    });

    LeaveRequest.associate = (models) => {
        LeaveRequest.belongsTo(models.Employee, {
            foreignKey: 'employee_code',
            targetKey: 'employee_code',
            as: 'employeeDetails'
        });
    };

    return LeaveRequest;
};