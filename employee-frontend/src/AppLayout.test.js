import { render, screen } from '@testing-library/react';
import AppLayout from './components/layout/AppLayout';

jest.mock('react-router-dom', () => ({
    NavLink: ({ to, children }) => <a href={to}>{children}</a>,
    useLocation: () => ({ pathname: '/employee-leave', search: '' }),
    useNavigate: () => jest.fn()
}), { virtual: true });
jest.mock('./components/NotificationBell', () => () => null);
jest.mock('./components/UserMenu', () => () => null);

beforeEach(() => {
    window.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {} });
    localStorage.setItem('role', 'Employee');
});

test.each(['Admin', 'HR'])('shows %s management links using the verified role', role => {
    render(<AppLayout role={role}><p>Leave content</p></AppLayout>);
    expect(screen.getByRole('link', { name: 'Employee directory' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Audit logs' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Reports' })).toBeInTheDocument();
});

test('shows employee self-service without management links', () => {
    render(<AppLayout role="Employee"><p>Leave content</p></AppLayout>);
    expect(screen.getByRole('link', { name: 'My leave' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Employee directory' })).not.toBeInTheDocument();
});
