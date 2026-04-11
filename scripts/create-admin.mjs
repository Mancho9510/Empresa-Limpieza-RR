/**
 * Script para crear un usuario admin con correo y contraseña hasheada.
 * Uso: node scripts/create-admin.mjs <correo> <contraseña> [role]
 * Ejemplo: node scripts/create-admin.mjs limpiezarradmin@gmail.com MiContraseña123 superadmin
 */

import { hash } from 'bcryptjs'

const [,, email, password, role = 'admin'] = process.argv

if (!email || !password) {
  console.error('❌ Faltan argumentos.')
  console.error('Uso: node scripts/create-admin.mjs <correo> <contraseña> [role]')
  process.exit(1)
}

const passwordHash = await hash(password, 12)

console.log('\n✅ Admin listo para insertar en Supabase:\n')
console.log('────────────────────────────────────────────────────────────')
console.log(`Correo : ${email}`)
console.log(`Role   : ${role}`)
console.log(`Hash   : ${passwordHash}`)
console.log('────────────────────────────────────────────────────────────')
console.log('\n📋 SQL para ejecutar en Supabase → SQL Editor:\n')
console.log(`INSERT INTO admin_users (email, password_hash, role)`)
console.log(`VALUES (`)
console.log(`  '${email.toLowerCase().trim()}',`)
console.log(`  '${passwordHash}',`)
console.log(`  '${role}'`)
console.log(`);`)
console.log('')
