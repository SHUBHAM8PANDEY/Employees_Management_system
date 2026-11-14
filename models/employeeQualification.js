module.exports = (sequelize, DataTypes) => {
    const EmployeeQualification = sequelize.define('EmployeeQualification', {
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
        degree: {
            type: DataTypes.STRING(100),
            allowNull: true,
            field: 'degree'
        },
        institution: {
            type: DataTypes.STRING(255),
            allowNull: true,
            field: 'institution'
        }
    }, {
        tableName: 'employee_qualification',
        timestamps: false
    });

    EmployeeQualification.associate = (models) => {
        EmployeeQualification.belongsTo(models.Employee, {
            foreignKey: 'employee_code',
            targetKey: 'employee_code',
            as: 'employee'
        });
    };

    return EmployeeQualification;
};