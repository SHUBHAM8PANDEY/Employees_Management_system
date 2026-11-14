const cron = require('node-cron');
const { Employee, sequelize } = require('../models');
const { sendEmail, mailConfigured, escapeHtml } = require('../utils/emailService');

const TIME_ZONE = 'Asia/Kolkata';
const dateFormat = new Intl.DateTimeFormat('sv-SE', { timeZone: TIME_ZONE });

function getGreetings(employee, today) {
    const year = Number(today.slice(0, 4));
    const lastDayOfFebruary = new Date(Date.UTC(year, 2, 0)).getUTCDate();
    const isDue = date => {
        if (!date || date > today) return false;
        const monthDay = date.slice(5);
        return today.slice(5) === (monthDay === '02-29' && lastDayOfFebruary === 28 ? '02-28' : monthDay);
    };
    const greetings = [];
    if (isDue(employee.date_of_birth)) {
        greetings.push({ type: 'birthday', title: 'Happy Birthday!' });
    }
    if (isDue(employee.joining_date)) {
        const years = year - Number(employee.joining_date.slice(0, 4));
        if (years >= 1) greetings.push({
            type: 'anniversary',
            title: 'Happy Work Anniversary!',
            detail: `Congratulations on completing ${years} year${years === 1 ? '' : 's'} with the team.`
        });
    }
    return greetings;
}

let running = false;
async function sendEmployeeGreetings() {
    if (running || !mailConfigured()) return;
    running = true;
    try {
        const today = dateFormat.format(new Date());
        const employees = await Employee.findAll({
            attributes: ['employee_code', 'first_name', 'email', 'date_of_birth', 'joining_date']
        });
        for (const employee of employees) {
            for (const greeting of getGreetings(employee, today)) {
                const values = { code: employee.employee_code, type: greeting.type, day: today };
                try {
                    await sequelize.transaction(async transaction => {
                        const [rows] = await sequelize.query(`
                            INSERT INTO public.employee_greetings (employee_code, kind, greeting_date)
                            VALUES (:code, :type, :day)
                            ON CONFLICT DO NOTHING RETURNING employee_code
                        `, { replacements: values, transaction });
                        if (!rows.length) return;
                        await sendEmail(employee.email, greeting.title,
                            `<h1>${greeting.title}</h1><p>Hi ${escapeHtml(employee.first_name)},</p><p>${
                                greeting.detail || 'Wishing you a wonderful birthday from the whole team!'
                            }</p>`, [], `employee-greeting/${values.code}/${values.type}/${today}`);
                    });
                } catch (error) {
                    console.error('Employee greeting delivery failed:', greeting.type, error.code || error.name);
                }
            }
        }
    } finally {
        running = false;
    }
}

function startEmployeeGreetings() {
    const run = () => sendEmployeeGreetings().catch(error => {
        console.error('Employee greetings job failed:', error.code || error.name);
    });
    cron.schedule('*/15 * * * *', run, { timezone: TIME_ZONE });
    run();
}

module.exports = { startEmployeeGreetings, getGreetings };
