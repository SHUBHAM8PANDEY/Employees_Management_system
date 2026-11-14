module.exports = (sequelize, DataTypes) => {
    const EmployeeSkill = sequelize.define('EmployeeSkill', {
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
        skill_name: {
            type: DataTypes.STRING(100),
            allowNull: true,
            field: 'skill_name'
        }
    }, {
        tableName: 'employee_skills',
        timestamps: false
    });

    EmployeeSkill.associate = (models) => {
        EmployeeSkill.belongsTo(models.Employee, {
            foreignKey: 'employee_code',
            targetKey: 'employee_code',
            as: 'employee'
        });
    };

    return EmployeeSkill;
};