import { render, screen } from '@testing-library/react';
import Login from './pages/Login';

jest.mock('react-router-dom', () => ({ useNavigate: () => jest.fn() }), { virtual: true });
jest.mock('axios', () => ({ post: jest.fn() }));

test('shows the WorkHub sign-in form to unauthenticated users', () => {
    render(<Login />);
    expect(screen.getByRole('heading', { name: 'Sign in' })).toBeInTheDocument();
    expect(screen.getByLabelText('Work email')).toBeRequired();
    expect(screen.getByRole('button', { name: 'Sign in' })).toBeEnabled();
});
