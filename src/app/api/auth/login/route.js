import { NextResponse } from 'next/server';
import { query, ROLE_TO_DB, DB_TO_APP_ROLE } from '@/lib/db';

const ALLOWED_ROLES = ['manajemen', 'pengawas', 'mandor', 'management', 'supervisor', 'foreman'];

const USERNAME_ALIASES = {
  manajemen: ['manajemen', 'management'],
  management: ['management', 'manajemen'],
  pengawas: ['pengawas', 'supervisor'],
  supervisor: ['supervisor', 'pengawas'],
  mandor: ['mandor', 'foreman'],
  foreman: ['foreman', 'mandor'],
};

const LOCAL_ACCOUNTS = [
  { id: 1, nama: 'CurveUp Management', usernames: ['management', 'manajemen'], password: '123456', role: 'manajemen' },
  { id: 2, nama: 'Site Supervisor', usernames: ['supervisor', 'pengawas'], password: '123456', role: 'pengawas' },
  { id: 3, nama: 'Lead Foreman', usernames: ['foreman', 'mandor'], password: '123456', role: 'mandor' },
];

function findLocalAccount(username, password, appRole) {
  return LOCAL_ACCOUNTS.find(
    (u) => u.usernames.includes(String(username).toLowerCase()) && u.password === password && u.role === appRole
  );
}

export async function POST(request) {
  const body = await request.json();
  const username = String(body.username || '').trim();
  const password = body.password;
  const role = body.role;

  if (!username || !password || !role) {
    return NextResponse.json(
      { success: false, message: 'Username, password, and role are required.' },
      { status: 400 }
    );
  }

  if (!ALLOWED_ROLES.includes(role)) {
    return NextResponse.json(
      { success: false, message: 'Invalid role.' },
      { status: 400 }
    );
  }

  const dbRole = ROLE_TO_DB[role] || role;
  const appRole = DB_TO_APP_ROLE[role] || role;
  const candidateUsernames = USERNAME_ALIASES[username.toLowerCase()] || [username, username];

  try {
    const users = await query(
      'SELECT id, name, username, password, role FROM users WHERE username IN (?, ?) AND role IN (?, ?) LIMIT 1',
      [candidateUsernames[0], candidateUsernames[1], dbRole, appRole]
    );

    if (users && users.length > 0) {
      const user = users[0];
      if (user.password && String(user.password) !== String(password)) {
        return NextResponse.json(
          { success: false, message: 'Incorrect password.' },
          { status: 401 }
        );
      }

      return NextResponse.json({
        success: true,
        user: {
          id: user.id,
          nama: user.name,
          name: user.name,
          username: user.username,
          role: DB_TO_APP_ROLE[user.role] || appRole,
        },
      });
    }
  } catch (error) {
    console.warn('Login DB:', error.message);
  }

  const localUser = findLocalAccount(username, password, appRole);
  if (localUser) {
    return NextResponse.json({
      success: true,
      user: {
        id: localUser.id,
        nama: localUser.nama,
        name: localUser.nama,
        username,
        role: localUser.role,
      },
    });
  }

  return NextResponse.json(
    { success: false, message: 'Invalid username, password, or role.' },
    { status: 401 }
  );
}
