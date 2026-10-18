import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

const ALLOWED_ROLES = ['manajemen', 'pengawas', 'mandor'];

const LOCAL_ACCOUNTS = [
  { id: 1, nama: 'Management', username: 'manajemen', password: '123456', role: 'manajemen' },
  { id: 2, nama: 'Supervisor', username: 'pengawas', password: '123456', role: 'pengawas' },
  { id: 3, nama: 'Foreman', username: 'mandor', password: '123456', role: 'mandor' },
];

function findLocalAccount(username, password, role) {
  return LOCAL_ACCOUNTS.find(
    (u) => u.username === username && u.password === password && u.role === role
  );
}

export async function POST(request) {
  const body = await request.json();
  const username = body.username;
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

  try {
    const users = await query(
      'SELECT id, nama, username, password, role FROM users WHERE username = ? AND role = ? LIMIT 1',
      [username, role]
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
          nama: user.nama,
          username: user.username,
          role: user.role,
        },
      });
    }
  } catch (error) {
    console.warn('Login DB:', error.message);
  }

  const localUser = findLocalAccount(username, password, role);
  if (localUser) {
    return NextResponse.json({
      success: true,
      user: {
        id: localUser.id,
        nama: localUser.nama,
        username: localUser.username,
        role: localUser.role,
      },
    });
  }

  return NextResponse.json(
    { success: false, message: 'Invalid username, password, or role.' },
    { status: 401 }
  );
}
